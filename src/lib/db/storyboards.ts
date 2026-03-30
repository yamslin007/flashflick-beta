// 分镜图库数据库操作
import { createServiceClient } from "./supabase/server";
import type { Storyboard, InsertTables, UpdateTables, Json } from "./supabase/types";

type StoryboardInsert = InsertTables<"storyboards">;
type StoryboardUpdate = UpdateTables<"storyboards">;

// 创建分镜图
export async function createStoryboard(data: StoryboardInsert): Promise<Storyboard> {
  const supabase = createServiceClient();

  const { data: storyboard, error } = await supabase
    .from("storyboards")
    .insert(data)
    .select()
    .single();

  if (error) {
    throw new Error(`创建分镜图失败: ${error.message}`);
  }

  return storyboard;
}

// 批量创建分镜图
export async function createStoryboards(data: StoryboardInsert[]): Promise<Storyboard[]> {
  const supabase = createServiceClient();

  const { data: storyboards, error } = await supabase
    .from("storyboards")
    .insert(data)
    .select();

  if (error) {
    throw new Error(`批量创建分镜图失败: ${error.message}`);
  }

  return storyboards || [];
}

// 获取单个分镜图
export async function getStoryboard(id: string): Promise<Storyboard | null> {
  const supabase = createServiceClient();

  const { data: storyboard, error } = await supabase
    .from("storyboards")
    .select()
    .eq("id", id)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return null; // 未找到
    }
    throw new Error(`获取分镜图失败: ${error.message}`);
  }

  return storyboard;
}

// 获取项目的所有分镜图
export async function getProjectStoryboards(projectId: string): Promise<Storyboard[]> {
  const supabase = createServiceClient();

  const { data: storyboards, error } = await supabase
    .from("storyboards")
    .select()
    .eq("project_id", projectId)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(`获取项目分镜图列表失败: ${error.message}`);
  }

  return storyboards || [];
}

// 获取所有分镜图（可选按项目筛选）- 包含项目信息
// onlyConfirmed: 默认 true，只返回已确认的分镜图（用于分镜库）
export async function getAllStoryboards(
  projectId?: string,
  onlyConfirmed: boolean = true
): Promise<Array<Storyboard & { project_title: string | null }>> {
  const supabase = createServiceClient();

  // 使用 left join 以包含没有关联项目的独立分镜图
  let query = supabase
    .from("storyboards")
    .select(`
      *,
      projects(title)
    `)
    .order("created_at", { ascending: false });

  if (projectId) {
    query = query.eq("project_id", projectId);
  }

  // 分镜库只显示已确认的分镜图
  if (onlyConfirmed) {
    query = query.eq("confirmed", true);
  }

  const { data: storyboards, error } = await query;

  if (error) {
    throw new Error(`获取分镜图列表失败: ${error.message}`);
  }

  // 转换数据格式，提取项目标题
  return (storyboards || []).map((sb) => {
    const { projects, ...rest } = sb as Record<string, unknown> & { projects?: { title: string | null } | null };
    return {
      ...rest,
      project_title: projects?.title || null,
    };
  }) as unknown as Array<Storyboard & { project_title: string | null }>;
}

// 批量确认分镜图（用于保存到分镜库）
export async function confirmProjectStoryboards(projectId: string): Promise<void> {
  const supabase = createServiceClient();

  const { error } = await supabase
    .from("storyboards")
    .update({ confirmed: true })
    .eq("project_id", projectId);

  if (error) {
    throw new Error(`确认分镜图失败: ${error.message}`);
  }
}

// 确认单个分镜图
export async function confirmStoryboard(id: string): Promise<Storyboard> {
  const supabase = createServiceClient();

  const { data: storyboard, error } = await supabase
    .from("storyboards")
    .update({ confirmed: true })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    throw new Error(`确认分镜图失败: ${error.message}`);
  }

  return storyboard;
}

// 更新分镜图
export async function updateStoryboard(
  id: string,
  data: StoryboardUpdate
): Promise<Storyboard> {
  const supabase = createServiceClient();

  const { data: storyboard, error } = await supabase
    .from("storyboards")
    .update(data)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    throw new Error(`更新分镜图失败: ${error.message}`);
  }

  return storyboard;
}

// 删除分镜图
export async function deleteStoryboard(id: string): Promise<void> {
  const supabase = createServiceClient();

  const { error } = await supabase.from("storyboards").delete().eq("id", id);

  if (error) {
    throw new Error(`删除分镜图失败: ${error.message}`);
  }
}

// 删除项目的所有分镜图
export async function deleteProjectStoryboards(projectId: string): Promise<void> {
  const supabase = createServiceClient();

  const { error } = await supabase
    .from("storyboards")
    .delete()
    .eq("project_id", projectId);

  if (error) {
    throw new Error(`删除项目分镜图失败: ${error.message}`);
  }
}

// 从场景创建分镜图（保存到分镜库）
export interface SaveSceneToStoryboardOptions {
  sceneId: string;
  projectId: string;
  name?: string;
  description?: string;
  imageUrl: string;
  prompt?: string;
  shotType?: string;
  cameraMovement?: string;
  artStyle?: string;
  aspectRatio?: string;
  tags?: string[];
  metadata?: Json;
  confirmed?: boolean;  // 默认 true（保存时直接确认）
}

export async function saveSceneToStoryboard(
  options: SaveSceneToStoryboardOptions
): Promise<Storyboard> {
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
  } = options;

  return createStoryboard({
    scene_id: sceneId,
    project_id: projectId,
    name: name || null,
    description: description || null,
    image_url: imageUrl,
    prompt: prompt || null,
    shot_type: shotType || null,
    camera_movement: cameraMovement || null,
    art_style: artStyle || null,
    aspect_ratio: aspectRatio || null,
    tags: tags || null,
    metadata: metadata || null,
    confirmed,
  });
}

// 检查场景是否已保存到分镜库
export async function isSceneInStoryboardLibrary(sceneId: string): Promise<boolean> {
  const supabase = createServiceClient();

  const { count, error } = await supabase
    .from("storyboards")
    .select("*", { count: "exact", head: true })
    .eq("scene_id", sceneId)
    .eq("confirmed", true);

  if (error) {
    throw new Error(`检查分镜图失败: ${error.message}`);
  }

  return (count || 0) > 0;
}
