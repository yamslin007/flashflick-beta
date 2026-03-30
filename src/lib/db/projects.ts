// 项目数据库操作
import { createServiceClient } from "./supabase/server";
import type { Project, InsertTables, UpdateTables } from "./supabase/types";

type ProjectInsert = InsertTables<"projects">;
type ProjectUpdate = UpdateTables<"projects">;

// 创建项目
export async function createProject(data: ProjectInsert): Promise<Project> {
  const supabase = createServiceClient();

  const { data: project, error } = await supabase
    .from("projects")
    .insert(data)
    .select()
    .single();

  if (error) {
    throw new Error(`创建项目失败: ${error.message}`);
  }

  return project;
}

// 获取项目
export async function getProject(id: string): Promise<Project | null> {
  const supabase = createServiceClient();

  const { data: project, error } = await supabase
    .from("projects")
    .select()
    .eq("id", id)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return null; // 未找到
    }
    throw new Error(`获取项目失败: ${error.message}`);
  }

  return project;
}

// 获取用户的所有项目
export async function getUserProjects(userId: string): Promise<Project[]> {
  const supabase = createServiceClient();

  const { data: projects, error } = await supabase
    .from("projects")
    .select()
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`获取项目列表失败: ${error.message}`);
  }

  return projects || [];
}

// 更新项目
export async function updateProject(
  id: string,
  data: ProjectUpdate
): Promise<Project> {
  const supabase = createServiceClient();

  const { data: project, error } = await supabase
    .from("projects")
    .update(data)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    throw new Error(`更新项目失败: ${error.message}`);
  }

  return project;
}

// 删除项目
export async function deleteProject(id: string): Promise<void> {
  const supabase = createServiceClient();

  const { error } = await supabase.from("projects").delete().eq("id", id);

  if (error) {
    throw new Error(`删除项目失败: ${error.message}`);
  }
}

// 更新项目状态
export async function updateProjectStatus(
  id: string,
  status: string
): Promise<Project> {
  return updateProject(id, { status });
}

// 更新项目最终视频 URL
export async function updateProjectFinalVideo(
  id: string,
  finalVideoUrl: string
): Promise<Project> {
  return updateProject(id, {
    final_video_url: finalVideoUrl,
    status: "completed"
  });
}
