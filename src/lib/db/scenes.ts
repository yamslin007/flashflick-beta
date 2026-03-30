// 场景数据库操作
import { createServiceClient } from "./supabase/server";
import type { Scene, InsertTables, UpdateTables } from "./supabase/types";

type SceneInsert = InsertTables<"scenes">;
type SceneUpdate = UpdateTables<"scenes">;

// 批量创建场景
export async function createScenes(scenes: SceneInsert[]): Promise<Scene[]> {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("scenes")
    .insert(scenes)
    .select();

  if (error) {
    throw new Error(`创建场景失败: ${error.message}`);
  }

  return data || [];
}

// 获取场景
export async function getScene(id: string): Promise<Scene | null> {
  const supabase = createServiceClient();

  const { data: scene, error } = await supabase
    .from("scenes")
    .select()
    .eq("id", id)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return null;
    }
    throw new Error(`获取场景失败: ${error.message}`);
  }

  return scene;
}

// 获取项目的所有场景
export async function getProjectScenes(projectId: string): Promise<Scene[]> {
  const supabase = createServiceClient();

  const { data: scenes, error } = await supabase
    .from("scenes")
    .select()
    .eq("project_id", projectId)
    .order("scene_index", { ascending: true });

  if (error) {
    throw new Error(`获取场景列表失败: ${error.message}`);
  }

  return scenes || [];
}

// 更新场景（带重试，处理 terminated / ECONNRESET 等网络错误）
export async function updateScene(
  id: string,
  data: SceneUpdate,
  maxRetries = 3
): Promise<Scene> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const supabase = createServiceClient();

    const { data: scene, error } = await supabase
      .from("scenes")
      .update(data)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      const msg = error.message || "";
      const isRetryable =
        msg.includes("terminated") ||
        msg.includes("ECONNRESET") ||
        msg.includes("fetch failed") ||
        msg.includes("ConnectTimeoutError");

      if (isRetryable && attempt < maxRetries) {
        const delay = attempt * 3000;
        console.log(`[DB] 更新场景网络错误 (${msg})，${delay / 1000}s 后重试 (${attempt}/${maxRetries})`);
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }
      throw new Error(`更新场景失败: ${error.message}`);
    }

    return scene;
  }
  throw new Error("updateScene: 不应到达此处");
}

// 更新场景状态
export async function updateSceneStatus(
  id: string,
  status: string
): Promise<Scene> {
  return updateScene(id, { status });
}

// 批准场景
export async function approveScene(id: string): Promise<Scene> {
  return updateScene(id, { user_approved: true, status: "generating_video" });
}

// 拒绝场景（添加反馈）
export async function rejectScene(
  id: string,
  feedback: string
): Promise<Scene> {
  return updateScene(id, {
    user_approved: false,
    user_feedback: feedback,
    status: "rejected",
  });
}

// 更新场景预览图
export async function updateScenePreview(
  id: string,
  previewImageUrl: string
): Promise<Scene> {
  return updateScene(id, {
    preview_image_url: previewImageUrl,
    status: "image_ready",
  });
}

// 更新场景视频
export async function updateSceneVideo(
  id: string,
  videoUrl: string
): Promise<Scene> {
  return updateScene(id, {
    video_url: videoUrl,
    status: "completed",
  });
}

// 删除单个场景
export async function deleteScene(id: string): Promise<void> {
  const supabase = createServiceClient();

  const { error } = await supabase.from("scenes").delete().eq("id", id);

  if (error) {
    throw new Error(`删除场景失败: ${error.message}`);
  }
}

// 删除项目的所有场景
export async function deleteProjectScenes(projectId: string): Promise<void> {
  const supabase = createServiceClient();

  const { error } = await supabase
    .from("scenes")
    .delete()
    .eq("project_id", projectId);

  if (error) {
    throw new Error(`删除项目场景失败: ${error.message}`);
  }
}
