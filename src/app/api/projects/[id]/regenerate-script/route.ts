import { NextResponse } from "next/server";
import type { ApiResponse } from "@/types";
import type { Json } from "@/lib/db/supabase/types";
import { parseScript, buildScenePrompt } from "@/lib/ai/script-parser";
import { getProject, updateProject } from "@/lib/db/projects";
import { createScenes, deleteProjectScenes } from "@/lib/db/scenes";
import { createCharacters, deleteProjectCharacters } from "@/lib/db/characters";
import { createLocations, deleteProjectLocations } from "@/lib/db/locations";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// 重新生成项目剧本
export async function POST(request: Request, { params }: RouteParams) {
  try {
    const { id: projectId } = await params;

    // 获取项目信息
    const project = await getProject(projectId);
    if (!project) {
      return NextResponse.json(
        { success: false, error: "项目不存在" },
        { status: 404 }
      );
    }

    if (!project.original_prompt) {
      return NextResponse.json(
        { success: false, error: "项目缺少原始描述，无法重新生成" },
        { status: 400 }
      );
    }

    // 获取风格配置
    const styleConfig = project.style_config as { artStyle?: string; aspectRatio?: string } | null;
    const style = styleConfig?.artStyle || "ghibli";
    const duration = project.total_duration || 60;

    // 更新项目状态为解析中
    await updateProject(projectId, { status: "parsing" });

    // 调用 Claude 重新解析剧本
    let parsedScript;
    try {
      parsedScript = await parseScript(project.original_prompt, {
        style,
        duration,
      });
    } catch (parseError) {
      await updateProject(projectId, { status: "failed" });
      return NextResponse.json(
        {
          success: false,
          error: `剧本解析失败: ${parseError instanceof Error ? parseError.message : "未知错误"}`,
        },
        { status: 500 }
      );
    }

    // 删除旧的数据（先删除场景，因为场景有外键关联）
    await deleteProjectScenes(projectId);
    await deleteProjectCharacters(projectId);
    await deleteProjectLocations(projectId);

    // 更新项目信息
    await updateProject(projectId, {
      title: parsedScript.title,
      parsed_script: parsedScript as unknown as Json,
      status: "script_pending",
    });

    // 创建角色 ID 到名称的映射
    const characterIdToName = new Map<string, string>();
    parsedScript.characters.forEach((char) => {
      characterIdToName.set(char.id, char.name);
    });

    // 创建场景地点记录
    const locationIdToDbId = new Map<string, string>();
    if (parsedScript.locations && parsedScript.locations.length > 0) {
      const locationsToCreate = parsedScript.locations.map((loc, index) => ({
        project_id: projectId,
        name: loc.name,
        description: loc.description,
        base_prompt: loc.basePrompt,
        location_index: index,
      }));

      const createdLocations = await createLocations(locationsToCreate);
      createdLocations.forEach((dbLoc, index) => {
        const parsedLoc = parsedScript.locations[index];
        if (parsedLoc) {
          locationIdToDbId.set(parsedLoc.id, dbLoc.id);
        }
      });
    }

    // 创建场景记录
    const scenesToCreate = parsedScript.scenes.map((scene) => {
      const characterNames = (scene.characterIds || [])
        .map((id) => characterIdToName.get(id) || id)
        .filter((name): name is string => !!name);

      const locationDbId = scene.locationId ? locationIdToDbId.get(scene.locationId) : null;
      const firstCut = scene.cuts?.[0];
      const shotType = firstCut?.cameraAngle?.toLowerCase().replace(/\s+/g, "_") || "medium_shot";

      return {
        project_id: projectId,
        scene_index: scene.sceneIndex,
        duration: scene.duration,
        shot_type: shotType,
        camera_movement: null,
        camera_movement_prompt: null,
        description: scene.description,
        full_prompt: buildScenePrompt(
          scene,
          parsedScript.characters,
          parsedScript.style
        ),
        status: "pending",
        character_ids: characterNames,
        location_id: locationDbId || null,
        bgm: scene.bgm || null,
        sfx: scene.sfx || null,
        pacing: scene.pacing || null,
        cuts: (scene.cuts || []) as unknown as Json,
        dialogue_order_lock: scene.dialogueOrderLock || [],
      };
    });

    await createScenes(scenesToCreate);

    // 创建角色记录
    if (parsedScript.characters && parsedScript.characters.length > 0) {
      const charactersToCreate = parsedScript.characters.map((char) => ({
        project_id: projectId,
        name: char.name,
        description: char.description, // 只使用中文描述，不拼接英文 appearance
        base_prompt: char.basePrompt,
        reference_images: [],
        inline_look: char.inlineLook || null,
      }));

      await createCharacters(charactersToCreate);
    }

    const response: ApiResponse<{
      projectId: string;
      status: string;
      title: string;
      scenesCount: number;
      charactersCount: number;
      locationsCount: number;
    }> = {
      success: true,
      data: {
        projectId,
        status: "script_pending",
        title: parsedScript.title,
        scenesCount: parsedScript.scenes.length,
        charactersCount: parsedScript.characters?.length || 0,
        locationsCount: parsedScript.locations?.length || 0,
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("重新生成剧本失败:", error);

    const response: ApiResponse = {
      success: false,
      error: error instanceof Error ? error.message : "重新生成剧本失败",
    };
    return NextResponse.json(response, { status: 500 });
  }
}
