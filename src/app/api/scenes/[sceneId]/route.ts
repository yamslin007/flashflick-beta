import { NextResponse } from "next/server";
import type { ApiResponse } from "@/types";
import { getScene, updateScene, getProjectScenes } from "@/lib/db/scenes";
import { createServiceClient } from "@/lib/db/supabase/server";

interface RouteParams {
  params: Promise<{ sceneId: string }>;
}

// 场景编辑数据接口
interface SceneEditData {
  description?: string;
  shot_type?: string;
  camera_movement?: string;
  duration?: number;
  location_id?: string | null;
}

// 更新场景 (用户反馈/修改)
export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const { sceneId } = await params;
    const body = await request.json();
    const { action, feedback, newDescription, data } = body as {
      action: string;
      feedback?: string;
      newDescription?: string;
      data?: SceneEditData;
    };

    // 验证场景存在
    const scene = await getScene(sceneId);
    if (!scene) {
      return NextResponse.json(
        { success: false, error: "场景不存在" },
        { status: 404 }
      );
    }

    let updatedScene;

    switch (action) {
      case "approve":
        // 用户确认场景，保持当前状态但标记为已批准
        updatedScene = await updateScene(sceneId, {
          user_approved: true,
        });
        break;

      case "reject":
        // 用户拒绝场景，添加反馈
        updatedScene = await updateScene(sceneId, {
          user_approved: false,
          user_feedback: feedback || "",
          status: "rejected",
        });
        break;

      case "edit":
        // 用户编辑场景 - 支持完整编辑
        if (data) {
          // 新的完整编辑模式
          const updateData: Record<string, unknown> = {};

          if (data.description !== undefined) {
            updateData.description = data.description;
            updateData.full_prompt = data.description;
          }
          if (data.shot_type !== undefined) {
            updateData.shot_type = data.shot_type;
          }
          if (data.camera_movement !== undefined) {
            updateData.camera_movement = data.camera_movement;
          }
          if (data.duration !== undefined) {
            updateData.duration = data.duration;
          }
          if (data.location_id !== undefined) {
            updateData.location_id = data.location_id;
          }

          // 编辑后重置审核状态和清除视频（内容已改变，视频不再匹配）
          if (Object.keys(updateData).length > 0) {
            updateData.user_approved = false;
            updateData.video_url = null;
            updateData.status = scene.preview_image_url ? "image_ready" : "pending";
          }

          updatedScene = await updateScene(sceneId, updateData);
        } else if (newDescription) {
          // 兼容旧的编辑模式（仅描述）
          updatedScene = await updateScene(sceneId, {
            description: newDescription,
          });
        } else {
          return NextResponse.json(
            { success: false, error: "缺少编辑数据" },
            { status: 400 }
          );
        }
        break;

      case "reset":
        // 重置状态（用于卡住的 generating_video 状态）
        updatedScene = await updateScene(sceneId, {
          status: scene.preview_image_url ? "image_ready" : "pending",
        });
        break;

      default:
        return NextResponse.json(
          { success: false, error: "无效的操作类型" },
          { status: 400 }
        );
    }

    const response: ApiResponse = {
      success: true,
      data: updatedScene,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("更新场景失败:", error);
    const response: ApiResponse = {
      success: false,
      error: error instanceof Error ? error.message : "更新场景失败",
    };
    return NextResponse.json(response, { status: 500 });
  }
}

// 删除场景
export async function DELETE(_request: Request, { params }: RouteParams) {
  try {
    const { sceneId } = await params;
    const supabase = createServiceClient();

    // 1. 获取要删除的场景
    const scene = await getScene(sceneId);
    if (!scene) {
      return NextResponse.json(
        { success: false, error: "场景不存在" },
        { status: 404 }
      );
    }

    const projectId = scene.project_id;
    const deletedIndex = scene.scene_index;

    // 2. 删除场景
    const { error: deleteError } = await supabase
      .from("scenes")
      .delete()
      .eq("id", sceneId);

    if (deleteError) {
      throw new Error(`删除场景失败: ${deleteError.message}`);
    }

    // 3. 更新后续场景的 index（减 1）
    const remainingScenes = await getProjectScenes(projectId);
    for (const s of remainingScenes) {
      if (s.scene_index > deletedIndex) {
        await supabase
          .from("scenes")
          .update({ scene_index: s.scene_index - 1 })
          .eq("id", s.id);
      }
    }

    // 4. 更新项目总时长
    const updatedScenes = await getProjectScenes(projectId);
    const totalDuration = updatedScenes.reduce((sum, s) => sum + s.duration, 0);

    await supabase
      .from("projects")
      .update({ total_duration: totalDuration })
      .eq("id", projectId);

    const response: ApiResponse = {
      success: true,
      data: {
        deletedSceneId: sceneId,
        totalScenes: updatedScenes.length,
        totalDuration,
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("删除场景失败:", error);
    const response: ApiResponse = {
      success: false,
      error: error instanceof Error ? error.message : "删除场景失败",
    };
    return NextResponse.json(response, { status: 500 });
  }
}
