import { NextResponse } from "next/server";
import type { ApiResponse } from "@/types";
import { getProject, updateProject } from "@/lib/db/projects";
import { createLocations, getProjectLocations, deleteLocation } from "@/lib/db/locations";
import { generateLocationsFromTitleAndCharacters } from "@/lib/ai/script-parser";
import { getProjectCharacters } from "@/lib/db/characters";
import type { StyleConfig } from "@/lib/ai/script-parser";

// 生成场景 (步骤2)
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;

    // 获取项目
    const project = await getProject(projectId);
    if (!project) {
      return NextResponse.json(
        { success: false, error: "项目不存在" },
        { status: 404 }
      );
    }

    const allowedStatuses = ["locations_pending", "characters_pending", "scenes_pending", "storyboard_ready"];
    if (!allowedStatuses.includes(project.status || "")) {
      return NextResponse.json(
        { success: false, error: "项目状态不正确，无法生成场景" },
        { status: 400 }
      );
    }

    if (!project.original_prompt || !project.title) {
      return NextResponse.json(
        { success: false, error: "项目缺少必要信息" },
        { status: 400 }
      );
    }

    // 获取角色
    const characters = await getProjectCharacters(projectId);
    if (characters.length === 0) {
      return NextResponse.json(
        { success: false, error: "请先生成角色" },
        { status: 400 }
      );
    }

    // 构建角色格式
    const parsedCharacters = characters.map((char) => ({
      id: char.id,
      name: char.name || "",
      description: char.description || "",
      basePrompt: char.base_prompt || "",
      appearance: {},
      inlineLook: char.inline_look || char.name || "",
    }));

    // 调用 AI 生成场景
    const styleConfig: StyleConfig = {
      artStyle: (project.style_config as { artStyle?: string })?.artStyle || "ghibli",
    };

    const locations = await generateLocationsFromTitleAndCharacters(
      project.title,
      parsedCharacters,
      styleConfig,
      project.total_duration || 60
    );

    // 删除旧的场景（如果有）
    const existingLocations = await getProjectLocations(projectId);
    for (const loc of existingLocations) {
      await deleteLocation(loc.id);
    }

    // 创建新场景
    const locationsToCreate = locations.map((loc, index) => ({
      project_id: projectId,
      name: loc.name,
      description: loc.description,
      base_prompt: loc.basePrompt,
      location_index: index,
    }));

    const createdLocations = await createLocations(locationsToCreate);

    // 注意：不更新项目状态，状态由用户操作驱动（characters 页控制）

    const response: ApiResponse<{
      projectId: string;
      locations: typeof createdLocations;
    }> = {
      success: true,
      data: {
        projectId,
        locations: createdLocations,
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("生成场景失败:", error);

    // 更新项目状态为失败
    try {
      const { id: projectId } = await params;
      await updateProject(projectId, { status: "failed" });
    } catch {
      // ignore
    }

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "生成失败",
      },
      { status: 500 }
    );
  }
}
