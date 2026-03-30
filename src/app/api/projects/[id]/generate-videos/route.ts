import { NextResponse } from "next/server";
import type { ApiResponse } from "@/types";
import type { Json } from "@/lib/db/supabase/types";
import { getProject, updateProject } from "@/lib/db/projects";
import { getProjectScenes, updateSceneStatus, updateSceneVideo } from "@/lib/db/scenes";
import { generateSceneVideo } from "@/lib/ai/video-generator";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// 批量生成项目视频
export async function POST(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const { sceneIds, model } = body as { sceneIds?: string[]; model?: string };

    // 验证项目存在
    const project = await getProject(id);
    if (!project) {
      return NextResponse.json(
        { success: false, error: "项目不存在" },
        { status: 404 }
      );
    }

    // 检查项目是否正在生成中（防止重复触发批量生成）
    if (project.status === "generating") {
      return NextResponse.json(
        { success: false, error: "项目正在生成视频中，请等待完成后再试" },
        { status: 409 }  // Conflict
      );
    }

    // 获取所有场景
    const allScenes = await getProjectScenes(id);
    if (allScenes.length === 0) {
      return NextResponse.json(
        { success: false, error: "项目没有场景" },
        { status: 400 }
      );
    }

    // 筛选符合条件的场景 (已审核、有预览图、无视频或需要重新生成)
    // 注意：只排除正在生成的场景，即使状态是 completed 但没有 video_url 也应该可以重新生成
    let eligibleScenes = allScenes.filter(
      (scene) =>
        scene.user_approved &&
        scene.preview_image_url &&
        !scene.video_url &&
        scene.status !== "generating_video"
    );

    // 如果指定了场景 ID，进一步筛选
    if (sceneIds && sceneIds.length > 0) {
      eligibleScenes = eligibleScenes.filter((scene) =>
        sceneIds.includes(scene.id)
      );
    }

    if (eligibleScenes.length === 0) {
      return NextResponse.json(
        { success: false, error: "没有符合条件的场景需要生成视频" },
        { status: 400 }
      );
    }

    // 更新项目状态为生成中
    await updateProject(id, { status: "generating" });

    // 准备场景信息
    const scenesInfo = eligibleScenes.map((scene) => ({
      sceneId: scene.id,
      sceneIndex: scene.scene_index,
      status: "queued" as const,
    }));

    // 启动后台处理 (fire-and-forget)
    processBatchVideoGeneration(id, eligibleScenes, model).catch((error) => {
      console.error("批量视频生成后台处理错误:", error);
    });

    const response: ApiResponse<{
      projectId: string;
      totalScenes: number;
      scenes: typeof scenesInfo;
    }> = {
      success: true,
      data: {
        projectId: id,
        totalScenes: eligibleScenes.length,
        scenes: scenesInfo,
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("启动批量视频生成失败:", error);

    const response: ApiResponse = {
      success: false,
      error: error instanceof Error ? error.message : "启动批量视频生成失败",
    };
    return NextResponse.json(response, { status: 500 });
  }
}

// 后台批量处理视频生成
async function processBatchVideoGeneration(
  projectId: string,
  scenes: Array<{
    id: string;
    scene_index: number;
    preview_image_url: string | null;
    description: string | null;
    camera_movement: string | null;
    camera_movement_prompt: string | null;
    duration: number;
    cuts: Json | null;
    bgm: string | null;
    sfx: string | null;
    pacing: string | null;
  }>,
  model?: string
) {
  let successCount = 0;
  let failedCount = 0;

  // 串行处理每个场景
  for (const scene of scenes) {
    try {
      // 更新场景状态为生成中
      await updateSceneStatus(scene.id, "generating_video");

      // 生成视频
      const videoUrl = await generateSceneVideo(
        {
          preview_image_url: scene.preview_image_url,
          description: scene.description,
          camera_movement: scene.camera_movement,
          camera_movement_prompt: scene.camera_movement_prompt,
          duration: scene.duration,
          cuts: scene.cuts,
          bgm: scene.bgm,
          sfx: scene.sfx,
          pacing: scene.pacing,
        },
        { model }
      );

      // 更新场景视频 URL
      await updateSceneVideo(scene.id, videoUrl);
      successCount++;
    } catch (error) {
      console.error(`场景 ${scene.id} 视频生成失败:`, error);
      await updateSceneStatus(scene.id, "video_failed");
      failedCount++;
      // 继续处理其他场景
    }
  }

  // 更新项目状态
  try {
    if (failedCount === 0) {
      // 检查是否所有场景都已完成
      const allScenes = await getProjectScenes(projectId);
      const allCompleted = allScenes.every(
        (s) => s.status === "completed" || s.video_url
      );

      await updateProject(projectId, {
        status: allCompleted ? "completed" : "videos_ready",
      });
    } else if (successCount > 0) {
      await updateProject(projectId, { status: "videos_partial" });
    } else {
      await updateProject(projectId, { status: "failed" });
    }
  } catch (error) {
    console.error("更新项目状态失败:", error);
  }
}
