// 角色数据库操作
import { createServiceClient } from "./supabase/server";
import type { Character, InsertTables, UpdateTables } from "./supabase/types";

type CharacterInsert = InsertTables<"characters">;
type CharacterUpdate = UpdateTables<"characters">;

// 创建角色
export async function createCharacter(data: CharacterInsert): Promise<Character> {
  const supabase = createServiceClient();

  const { data: character, error } = await supabase
    .from("characters")
    .insert(data)
    .select()
    .single();

  if (error) {
    throw new Error(`创建角色失败: ${error.message}`);
  }

  return character;
}

// 批量创建角色
export async function createCharacters(data: CharacterInsert[]): Promise<Character[]> {
  const supabase = createServiceClient();

  const { data: characters, error } = await supabase
    .from("characters")
    .insert(data)
    .select();

  if (error) {
    throw new Error(`批量创建角色失败: ${error.message}`);
  }

  return characters || [];
}

// 获取角色
export async function getCharacter(id: string): Promise<Character | null> {
  const supabase = createServiceClient();

  const { data: character, error } = await supabase
    .from("characters")
    .select()
    .eq("id", id)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return null; // 未找到
    }
    throw new Error(`获取角色失败: ${error.message}`);
  }

  return character;
}

// 获取项目的所有角色
export async function getProjectCharacters(projectId: string): Promise<Character[]> {
  const supabase = createServiceClient();

  const { data: characters, error } = await supabase
    .from("characters")
    .select()
    .eq("project_id", projectId)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(`获取角色列表失败: ${error.message}`);
  }

  return characters || [];
}

// 获取所有角色（可选按项目筛选）- 包含项目信息
// onlyConfirmed: 默认 true，只返回已确认的角色（用于角色库）
export async function getAllCharacters(projectId?: string, onlyConfirmed: boolean = true): Promise<Array<Character & { project_title: string | null }>> {
  const supabase = createServiceClient();

  // 使用 left join 以包含没有关联项目的独立角色
  let query = supabase
    .from("characters")
    .select(`
      *,
      projects(title)
    `)
    .order("created_at", { ascending: false });

  if (projectId) {
    query = query.eq("project_id", projectId);
  }

  // 角色库只显示已确认的角色
  if (onlyConfirmed) {
    query = query.eq("confirmed", true);
  }

  const { data: characters, error } = await query;

  if (error) {
    throw new Error(`获取角色列表失败: ${error.message}`);
  }

  // 转换数据格式，提取项目标题
  return (characters || []).map((char) => {
    const { projects, ...rest } = char as Record<string, unknown> & { projects?: { title: string | null } | null };
    return {
      ...rest,
      project_title: projects?.title || null,
    };
  }) as unknown as Array<Character & { project_title: string | null }>;
}

// 批量确认角色（用于角色确认页面的"确认"按钮）
export async function confirmProjectCharacters(projectId: string): Promise<void> {
  const supabase = createServiceClient();

  const { error } = await supabase
    .from("characters")
    .update({ confirmed: true })
    .eq("project_id", projectId);

  if (error) {
    throw new Error(`确认角色失败: ${error.message}`);
  }
}

// 更新角色
export async function updateCharacter(
  id: string,
  data: CharacterUpdate
): Promise<Character> {
  const supabase = createServiceClient();

  const { data: character, error } = await supabase
    .from("characters")
    .update(data)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    throw new Error(`更新角色失败: ${error.message}`);
  }

  return character;
}

// 删除角色
export async function deleteCharacter(id: string): Promise<void> {
  const supabase = createServiceClient();

  const { error } = await supabase.from("characters").delete().eq("id", id);

  if (error) {
    throw new Error(`删除角色失败: ${error.message}`);
  }
}

// 删除项目的所有角色
export async function deleteProjectCharacters(projectId: string): Promise<void> {
  const supabase = createServiceClient();

  const { error } = await supabase
    .from("characters")
    .delete()
    .eq("project_id", projectId);

  if (error) {
    throw new Error(`删除项目角色失败: ${error.message}`);
  }
}
