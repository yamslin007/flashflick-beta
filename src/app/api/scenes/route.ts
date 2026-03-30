// 场景 API
// POST /api/scenes - 创建新场景（支持插入指定位置）

import { NextResponse } from "next/server";
import type { ApiResponse } from "@/types";
import { createServiceClient } from "@/lib/db/supabase/server";
import { getProjectScenes } from "@/lib/db/scenes";

interface CreateSceneBody {
  projectId: string;
  insertAtIndex: number; // 插入位置（新场景的 scene_index）
  description?: string;
  shot_type?: string;
  camera_movement?: string;
  duration?: number;
}

export async function POST(request: Request) {
  try {
    const body: CreateSceneBody = await request.json();
    const { projectId, insertAtIndex, description, shot_type, camera_movement, duration } = body;

    if (!projectId) {
      return NextResponse.json(
        { success: false, error: "缺少项目 ID" },
        { status: 400 }
      );
    }

    if (insertAtIndex === undefined || insertAtIndex < 0) {
      return NextResponse.json(
        { success: false, error: "插入位置无效" },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();

    // 1. 获取当前所有场景
    const existingScenes = await getProjectScenes(projectId);

    // 2. 将插入位置及之后的场景 index +1
    const scenesToUpdate = existingScenes.filter(s => s.scene_index >= insertAtIndex);

    for (const scene of scenesToUpdate) {
      await supabase
        .from("scenes")
        .update({ scene_index: scene.scene_index + 1 })
        .eq("id", scene.id);
    }

    // 3. 创建新场景
    const { data: newScene, error } = await supabase
      .from("scenes")
      .insert({
        project_id: projectId,
        scene_index: insertAtIndex,
        description: description || "新场景 - 请编辑描述",
        shot_type: shot_type || "medium_shot",
        camera_movement: camera_movement || "static",
        duration: duration || 5,
        status: "pending",
        user_approved: false,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`创建场景失败: ${error.message}`);
    }

    // 4. 更新项目总时长
    const allScenes = await getProjectScenes(projectId);
    const totalDuration = allScenes.reduce((sum, s) => sum + s.duration, 0);

    await supabase
      .from("projects")
      .update({ total_duration: totalDuration })
      .eq("id", projectId);

    const response: ApiResponse = {
      success: true,
      data: {
        scene: newScene,
        totalScenes: allScenes.length,
        totalDuration,
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("创建场景失败:", error);

    const response: ApiResponse = {
      success: false,
      error: error instanceof Error ? error.message : "创建场景失败",
    };
    return NextResponse.json(response, { status: 500 });
  }
}
