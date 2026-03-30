import { NextResponse } from "next/server";
import type { ApiResponse } from "@/types";
import { getProject } from "@/lib/db/projects";
import { getProjectScenes } from "@/lib/db/scenes";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// 查询批量视频生成进度
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;

    // 验证项目存在
    const project = await getProject(id);
    if (!project) {
      return NextResponse.json(
        { success: false, error: "项目不存在" },
        { status: 404 }
      );
    }

    // 获取所有场景
    const scenes = await getProjectScenes(id);

    // 统计各状态数量
    let completedScenes = 0;
    let failedScenes = 0;
    let generatingScenes = 0;
    let queuedScenes = 0;
    let currentSceneIndex: number | null = null;

    const scenesStatus = scenes.map((scene) => {
      let sceneStatus: "queued" | "generating_video" | "completed" | "video_failed" | "pending";

      if (scene.status === "completed" || scene.video_url) {
        completedScenes++;
        sceneStatus = "completed";
      } else if (scene.status === "video_failed") {
        failedScenes++;
        sceneStatus = "video_failed";
      } else if (scene.status === "generating_video") {
        generatingScenes++;
        sceneStatus = "generating_video";
        // 记录当前正在生成的场景索引
        if (currentSceneIndex === null) {
          currentSceneIndex = scene.scene_index;
        }
      } else if (
        scene.user_approved &&
        scene.preview_image_url &&
        !scene.video_url
      ) {
        // 符合条件但还未开始 = 排队中
        queuedScenes++;
        sceneStatus = "queued";
      } else {
        sceneStatus = "pending";
      }

      return {
        sceneId: scene.id,
        sceneIndex: scene.scene_index,
        status: sceneStatus,
        videoUrl: scene.video_url,
        error: scene.status === "video_failed" ? "视频生成失败" : null,
      };
    });

    // 计算总进度
    const eligibleScenes = scenes.filter(
      (s) => s.user_approved && s.preview_image_url
    );
    const totalEligible = eligibleScenes.length;
    const progress =
      totalEligible > 0 ? (completedScenes / totalEligible) * 100 : 0;

    // 确定整体状态
    let overallStatus: "idle" | "processing" | "completed" | "partial" | "failed";

    if (generatingScenes > 0 || queuedScenes > 0) {
      overallStatus = "processing";
    } else if (failedScenes > 0 && completedScenes > 0) {
      overallStatus = "partial";
    } else if (failedScenes > 0 && completedScenes === 0) {
      overallStatus = "failed";
    } else if (completedScenes === totalEligible && totalEligible > 0) {
      overallStatus = "completed";
    } else {
      overallStatus = "idle";
    }

    const response: ApiResponse<{
      projectId: string;
      status: typeof overallStatus;
      progress: number;
      totalScenes: number;
      completedScenes: number;
      failedScenes: number;
      currentScene: number | null;
      scenes: typeof scenesStatus;
    }> = {
      success: true,
      data: {
        projectId: id,
        status: overallStatus,
        progress: Math.round(progress),
        totalScenes: totalEligible,
        completedScenes,
        failedScenes,
        currentScene: currentSceneIndex,
        scenes: scenesStatus,
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("查询视频生成进度失败:", error);

    const response: ApiResponse = {
      success: false,
      error: error instanceof Error ? error.message : "查询视频生成进度失败",
    };
    return NextResponse.json(response, { status: 500 });
  }
}
