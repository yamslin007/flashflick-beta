import { NextResponse } from "next/server";
import type { ApiResponse } from "@/types";
import { getProject, updateProject } from "@/lib/db/projects";
import { createCharacters, deleteProjectCharacters, getProjectCharacters } from "@/lib/db/characters";
import { parseTitleAndCharacters, generateLocationsFromTitleAndCharacters } from "@/lib/ai/script-parser";
import { createLocations, getProjectLocations, deleteLocation } from "@/lib/db/locations";
import type { StyleConfig } from "@/lib/ai/script-parser";

// 生成标题和角色 (步骤1)
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

    // 只有已完成分镜阶段的项目不允许重新生成
    const completedStatuses = ["storyboard_ready", "generating", "completed"];
    if (completedStatuses.includes(project.status || "")) {
      return NextResponse.json(
        { success: false, error: "项目已完成分镜生成，无法重新生成标题和角色" },
        { status: 400 }
      );
    }

    if (!project.original_prompt) {
      return NextResponse.json(
        { success: false, error: "项目缺少原始描述" },
        { status: 400 }
      );
    }

    // 调用 AI 解析标题和角色
    const styleConfig = project.style_config as { artStyle?: string } | null;
    const result = await parseTitleAndCharacters(project.original_prompt, {
      style: styleConfig?.artStyle || "ghibli",
      duration: project.total_duration || 60,
    });

    // 更新项目标题，状态保持 title_characters_pending，等用户确认后再推进
    await updateProject(projectId, {
      title: result.title,
    });

    // 删除旧角色（重新生成时清空）
    await deleteProjectCharacters(projectId);

    // 创建角色记录
    let characters: { id: string; name: string; description: string | null }[] = [];
    if (result.characters && result.characters.length > 0) {
      const charactersToCreate = result.characters.map((char) => ({
        project_id: projectId,
        name: char.name,
        description: char.description,
        base_prompt: char.basePrompt || "",
        reference_images: [],
        inline_look: char.inlineLook || null,
      }));

      const created = await createCharacters(charactersToCreate);
      characters = created.map((char) => ({
        id: char.id,
        name: char.name || "",
        description: char.description,
      }));
    }

    // 后台异步生成 locations，不阻塞响应
    const projectSnapshot = project;
    const createdCharacters = characters;
    Promise.resolve().then(async () => {
      try {
        const styleConf: StyleConfig = {
          artStyle: (projectSnapshot.style_config as { artStyle?: string })?.artStyle || "ghibli",
        };
        const parsedChars = createdCharacters.map((c) => ({
          id: c.id,
          name: c.name,
          description: c.description || "",
          basePrompt: "",
          appearance: {},
          inlineLook: c.name,
        }));
        const locations = await generateLocationsFromTitleAndCharacters(
          result.title,
          parsedChars,
          styleConf,
          projectSnapshot.total_duration || 60
        );
        const existingLocations = await getProjectLocations(projectId);
        for (const loc of existingLocations) {
          await deleteLocation(loc.id);
        }
        const locationsToCreate = locations.map((loc, index) => ({
          project_id: projectId,
          name: loc.name,
          description: loc.description,
          base_prompt: loc.basePrompt,
          location_index: index,
        }));
        await createLocations(locationsToCreate);
        console.log(`[后台] 项目 ${projectId} locations 生成完成，共 ${locations.length} 个`);
      } catch (err) {
        console.error(`[后台] 项目 ${projectId} locations 生成失败:`, err);
      }
    });

    const response: ApiResponse<{
      projectId: string;
      title: string;
      characters: typeof characters;
    }> = {
      success: true,
      data: {
        projectId,
        title: result.title,
        characters,
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("生成标题和角色失败:", error);

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
