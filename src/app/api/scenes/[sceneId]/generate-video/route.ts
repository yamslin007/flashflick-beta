import { NextResponse } from "next/server";
import type { ApiResponse } from "@/types";
import { getScene, updateScene, updateSceneStatus, updateSceneVideo } from "@/lib/db/scenes";
import { generateSceneVideo } from "@/lib/ai/video-generator";

interface RouteParams {
  params: Promise<{ sceneId: string }>;
}

// 为场景生成视频
export async function POST(request: Request, { params }: RouteParams) {
  try {
    const { sceneId } = await params;
    const body = await request.json().catch(() => ({}));
    const { duration, customMotion, model } = body;

    // 获取场景信息
    const scene = await getScene(sceneId);
    if (!scene) {
      return NextResponse.json(
        { success: false, error: "场景不存在" },
        { status: 404 }
      );
    }

    // 检查是否有预览图
    if (!scene.preview_image_url) {
      return NextResponse.json(
        { success: false, error: "请先生成场景预览图" },
        { status: 400 }
      );
    }

    // 检查是否正在生成中（防止重复生成）
    if (scene.status === "generating_video") {
      return NextResponse.json(
        { success: false, error: "该场景正在生成视频中，请稍候" },
        { status: 409 }  // Conflict
      );
    }

    // 更新状态为生成中
    await updateSceneStatus(sceneId, "generating_video");

    // 生成视频
    let videoUrl: string;
    try {
      videoUrl = await generateSceneVideo(
        {
          preview_image_url: scene.preview_image_url,
          description: scene.description,
          camera_movement: scene.camera_movement,
          camera_movement_prompt: scene.camera_movement_prompt,
          duration: duration || scene.duration || 5,
          cuts: scene.cuts,
          bgm: scene.bgm,
          sfx: scene.sfx,
          pacing: scene.pacing,
        },
        { duration: duration || scene.duration || 5, model }
      );
    } catch (error) {
      // 生成失败，更新状态
      await updateSceneStatus(sceneId, "video_failed");
      throw error;
    }

    // 更新场景视频 URL
    const updatedScene = await updateSceneVideo(sceneId, videoUrl);

    const response: ApiResponse<{
      sceneId: string;
      videoUrl: string;
      status: string;
    }> = {
      success: true,
      data: {
        sceneId,
        videoUrl,
        status: updatedScene.status,
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("生成场景视频失败:", error);

    const response: ApiResponse = {
      success: false,
      error: error instanceof Error ? error.message : "生成场景视频失败",
    };
    return NextResponse.json(response, { status: 500 });
  }
}
