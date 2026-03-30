// 自定义画风数据库操作
import { createServiceClient } from "./supabase/server";
import type { CustomArtStyle, InsertTables, UpdateTables } from "./supabase/types";

type CustomArtStyleInsert = InsertTables<"custom_art_styles">;
type CustomArtStyleUpdate = UpdateTables<"custom_art_styles">;

// 创建自定义画风
export async function createCustomArtStyle(data: CustomArtStyleInsert): Promise<CustomArtStyle> {
  const supabase = createServiceClient();

  const { data: style, error } = await supabase
    .from("custom_art_styles")
    .insert(data)
    .select()
    .single();

  if (error) {
    throw new Error(`创建自定义画风失败: ${error.message}`);
  }

  return style;
}

// 获取单个自定义画风
export async function getCustomArtStyle(id: string): Promise<CustomArtStyle | null> {
  const supabase = createServiceClient();

  const { data: style, error } = await supabase
    .from("custom_art_styles")
    .select()
    .eq("id", id)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return null; // 未找到
    }
    throw new Error(`获取自定义画风失败: ${error.message}`);
  }

  return style;
}

// 获取所有自定义画风
export async function getAllCustomArtStyles(): Promise<CustomArtStyle[]> {
  const supabase = createServiceClient();

  const { data: styles, error } = await supabase
    .from("custom_art_styles")
    .select()
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`获取自定义画风列表失败: ${error.message}`);
  }

  return styles || [];
}

// 更新自定义画风
export async function updateCustomArtStyle(
  id: string,
  data: CustomArtStyleUpdate
): Promise<CustomArtStyle> {
  const supabase = createServiceClient();

  const { data: style, error } = await supabase
    .from("custom_art_styles")
    .update(data)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    throw new Error(`更新自定义画风失败: ${error.message}`);
  }

  return style;
}

// 删除自定义画风
export async function deleteCustomArtStyle(id: string): Promise<void> {
  const supabase = createServiceClient();

  const { error } = await supabase
    .from("custom_art_styles")
    .delete()
    .eq("id", id);

  if (error) {
    throw new Error(`删除自定义画风失败: ${error.message}`);
  }
}

// 增加使用次数
export async function incrementStyleUsage(id: string): Promise<void> {
  const supabase = createServiceClient();

  const { data: current } = await supabase
    .from("custom_art_styles")
    .select("usage_count")
    .eq("id", id)
    .single();

  if (current) {
    await supabase
      .from("custom_art_styles")
      .update({ usage_count: (current.usage_count || 0) + 1 })
      .eq("id", id);
  }
}
