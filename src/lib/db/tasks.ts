// 任务数据库操作
import { createServiceClient } from "./supabase/server";
import type { Task, InsertTables, UpdateTables, Json } from "./supabase/types";

type TaskInsert = InsertTables<"tasks">;
type TaskUpdate = UpdateTables<"tasks">;

// 创建任务
export async function createTask(data: TaskInsert): Promise<Task> {
  const supabase = createServiceClient();

  const { data: task, error } = await supabase
    .from("tasks")
    .insert(data)
    .select()
    .single();

  if (error) {
    throw new Error(`创建任务失败: ${error.message}`);
  }

  return task;
}

// 获取任务
export async function getTask(id: string): Promise<Task | null> {
  const supabase = createServiceClient();

  const { data: task, error } = await supabase
    .from("tasks")
    .select()
    .eq("id", id)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return null;
    }
    throw new Error(`获取任务失败: ${error.message}`);
  }

  return task;
}

// 通过外部任务 ID 获取任务
export async function getTaskByExternalId(
  externalTaskId: string
): Promise<Task | null> {
  const supabase = createServiceClient();

  const { data: task, error } = await supabase
    .from("tasks")
    .select()
    .eq("external_task_id", externalTaskId)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return null;
    }
    throw new Error(`获取任务失败: ${error.message}`);
  }

  return task;
}

// 获取项目的所有任务
export async function getProjectTasks(projectId: string): Promise<Task[]> {
  const supabase = createServiceClient();

  const { data: tasks, error } = await supabase
    .from("tasks")
    .select()
    .eq("project_id", projectId)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(`获取任务列表失败: ${error.message}`);
  }

  return tasks || [];
}

// 更新任务
export async function updateTask(id: string, data: TaskUpdate): Promise<Task> {
  const supabase = createServiceClient();

  const { data: task, error } = await supabase
    .from("tasks")
    .update(data)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    throw new Error(`更新任务失败: ${error.message}`);
  }

  return task;
}

// 开始任务
export async function startTask(
  id: string,
  externalTaskId?: string
): Promise<Task> {
  return updateTask(id, {
    status: "processing",
    started_at: new Date().toISOString(),
    external_task_id: externalTaskId,
  });
}

// 完成任务
export async function completeTask(
  id: string,
  outputResult: Json
): Promise<Task> {
  return updateTask(id, {
    status: "completed",
    completed_at: new Date().toISOString(),
    output_result: outputResult,
  });
}

// 任务失败
export async function failTask(id: string, errorMessage: string): Promise<Task> {
  return updateTask(id, {
    status: "failed",
    completed_at: new Date().toISOString(),
    error_message: errorMessage,
  });
}
