// 场景地点数据库操作
import { createServiceClient } from "./supabase/server";
import type { Location, InsertTables, UpdateTables } from "./supabase/types";

type LocationInsert = InsertTables<"locations">;
type LocationUpdate = UpdateTables<"locations">;

// 创建场景地点
export async function createLocation(data: LocationInsert): Promise<Location> {
  const supabase = createServiceClient();

  const { data: location, error } = await supabase
    .from("locations")
    .insert(data)
    .select()
    .single();

  if (error) {
    throw new Error(`创建场景地点失败: ${error.message}`);
  }

  return location;
}

// 批量创建场景地点
export async function createLocations(data: LocationInsert[]): Promise<Location[]> {
  const supabase = createServiceClient();

  const { data: locations, error } = await supabase
    .from("locations")
    .insert(data)
    .select();

  if (error) {
    throw new Error(`批量创建场景地点失败: ${error.message}`);
  }

  return locations || [];
}

// 获取单个场景地点
export async function getLocation(id: string): Promise<Location | null> {
  const supabase = createServiceClient();

  const { data: location, error } = await supabase
    .from("locations")
    .select()
    .eq("id", id)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return null; // 未找到
    }
    throw new Error(`获取场景地点失败: ${error.message}`);
  }

  return location;
}

// 获取项目的所有场景地点
export async function getProjectLocations(projectId: string): Promise<Location[]> {
  const supabase = createServiceClient();

  const { data: locations, error } = await supabase
    .from("locations")
    .select()
    .eq("project_id", projectId)
    .order("location_index", { ascending: true });

  if (error) {
    throw new Error(`获取场景地点列表失败: ${error.message}`);
  }

  return locations || [];
}

// 更新场景地点
export async function updateLocation(
  id: string,
  data: LocationUpdate
): Promise<Location> {
  const supabase = createServiceClient();

  const { data: location, error } = await supabase
    .from("locations")
    .update(data)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    throw new Error(`更新场景地点失败: ${error.message}`);
  }

  return location;
}

// 删除场景地点
export async function deleteLocation(id: string): Promise<void> {
  const supabase = createServiceClient();

  const { error } = await supabase.from("locations").delete().eq("id", id);

  if (error) {
    throw new Error(`删除场景地点失败: ${error.message}`);
  }
}

// 删除项目的所有场景地点
export async function deleteProjectLocations(projectId: string): Promise<void> {
  const supabase = createServiceClient();

  const { error } = await supabase
    .from("locations")
    .delete()
    .eq("project_id", projectId);

  if (error) {
    throw new Error(`删除项目场景地点失败: ${error.message}`);
  }
}
