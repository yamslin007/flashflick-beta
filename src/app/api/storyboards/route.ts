// 分镜图库 API
// GET /api/storyboards - 获取分镜图列表（支持按项目筛选）
// POST /api/storyboards - 创建/保存分镜图

import { NextResponse } from "next/server";
import type { ApiResponse } from "@/types";
import type { Json } from "@/lib/db/supabase/types";
import { createStoryboard, getAllStoryboards, saveSceneToStoryboard } from "@/lib/db/storyboards";
import { getProject } from "@/lib/db/projects";
import { getScene } from "@/lib/db/scenes";

// 获取分镜图列表
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId") || undefined;

    const storyboards = await getAllStoryboards(projectId);

    const response: ApiResponse = {
      success: true,
      data: storyboards,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("获取分镜图列表失败:", error);

    const response: ApiResponse = {
      success: false,
      error: error instanceof Error ? error.message : "获取分镜图列表失败",
    };
    return NextResponse.json(response, { status: 500 });
  }
}

interface CreateStoryboardBody {
  // 从场景保存
  sceneId?: string;
  // 直接创建
  projectId?: string;
  name?: string;
  description?: string;
  imageUrl: string;
  prompt?: string;
  shotType?: string;
  cameraMovement?: string;
  artStyle?: string;
  aspectRatio?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
  confirmed?: boolean;
}

export async function POST(request: Request) {
  try {
    const body: CreateStoryboardBody = await request.json();
    const {
      sceneId,
      projectId,
      name,
      description,
      imageUrl,
      prompt,
      shotType,
      cameraMovement,
      artStyle,
      aspectRatio,
      tags,
      metadata,
      confirmed = true,
    } = body;

    // 验证必填字段
    if (!imageUrl) {
      return NextResponse.json(
        { success: false, error: "缺少分镜图 URL" },
        { status: 400 }
      );
    }

    let storyboard;

    // 如果有 sceneId，从场景保存
    if (sceneId) {
      const scene = await getScene(sceneId);
      if (!scene) {
        return NextResponse.json(
          { success: false, error: "场景不存在" },
          { status: 404 }
        );
      }

      storyboard = await saveSceneToStoryboard({
        sceneId,
        projectId: scene.project_id,
        name: name || scene.description?.slice(0, 50) || `场景 ${scene.scene_index + 1}`,
        description: description || scene.description || undefined,
        imageUrl: imageUrl || scene.preview_image_url!,
        prompt: prompt || scene.full_prompt || undefined,
        shotType: shotType || scene.shot_type || undefined,
        cameraMovement: cameraMovement || scene.camera_movement || undefined,
        artStyle,
        aspectRatio,
        tags,
        metadata: metadata as Json | undefined,
        confirmed,
      });
    } else {
      // 直接创建分镜图
      if (projectId) {
        const project = await getProject(projectId);
        if (!project) {
          return NextResponse.json(
            { success: false, error: "项目不存在" },
            { status: 404 }
          );
        }
      }

      storyboard = await createStoryboard({
        project_id: projectId || null,
        scene_id: null,
        name: name || null,
        description: description || null,
        image_url: imageUrl,
        prompt: prompt || null,
        shot_type: shotType || null,
        camera_movement: cameraMovement || null,
        art_style: artStyle || null,
        aspect_ratio: aspectRatio || null,
        tags: tags || null,
        metadata: (metadata || null) as Json | null,
        confirmed,
      });
    }

    const response: ApiResponse = {
      success: true,
      data: storyboard,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("创建分镜图失败:", error);

    const response: ApiResponse = {
      success: false,
      error: error instanceof Error ? error.message : "创建分镜图失败",
    };
    return NextResponse.json(response, { status: 500 });
  }
}
