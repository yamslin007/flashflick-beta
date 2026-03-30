import { NextResponse } from "next/server";
import type { ApiResponse } from "@/types";
import { getProject, updateProject } from "@/lib/db/projects";
import { createScenes, getProjectScenes, deleteProjectScenes } from "@/lib/db/scenes";
import { getProjectCharacters } from "@/lib/db/characters";
import { getProjectLocations } from "@/lib/db/locations";
import { generateScenesFromLocations, buildScenePrompt } from "@/lib/ai/script-parser";
import type { StyleConfig, ParsedCharacter } from "@/lib/ai/script-parser";
import type { Json } from "@/lib/db/supabase/types";

// 生成场景 (步骤3)
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

    const allowedStatuses = ["characters_pending", "scenes_pending", "locations_pending", "storyboard_ready", "failed"];
    if (!allowedStatuses.includes(project.status || "")) {
      return NextResponse.json(
        { success: false, error: "项目状态不正确，无法生成分镜" },
        { status: 400 }
      );
    }

    if (!project.title) {
      return NextResponse.json(
        { success: false, error: "项目缺少标题" },
        { status: 400 }
      );
    }

    // 获取角色和场景
    const [characters, locations] = await Promise.all([
      getProjectCharacters(projectId),
      getProjectLocations(projectId),
    ]);

    if (characters.length === 0) {
      return NextResponse.json(
        { success: false, error: "请先生成角色" },
        { status: 400 }
      );
    }

    // 构建角色格式
    const parsedCharacters: ParsedCharacter[] = characters.map((char) => ({
      id: char.id,
      name: char.name || "",
      description: char.description || "",
      basePrompt: char.base_prompt || "",
      appearance: {},
      inlineLook: char.inline_look || char.name || "",
    }));

    // 构建场景格式
    const parsedLocations = locations.map((loc) => ({
      id: loc.id,
      name: loc.name,
      description: loc.description || "",
      basePrompt: loc.base_prompt || "",
    }));

    // 调用 AI 生成分镜
    const styleConfig: StyleConfig = {
      artStyle: (project.style_config as { artStyle?: string })?.artStyle || "ghibli",
    };

    const scenes = await generateScenesFromLocations(
      project.title,
      parsedCharacters,
      parsedLocations,
      styleConfig,
      project.total_duration || 60,
      project.original_prompt || undefined
    );

    // 删除旧的分镜（如果有）
    await deleteProjectScenes(projectId);

    // 创建角色 ID 到名称的映射
    const characterIdToName = new Map<string, string>();
    characters.forEach((char) => {
      characterIdToName.set(char.id, char.name || "");
    });

    // 创建角色名称到 inlineLook 的映射
    const characterNameToLook = new Map<string, string>();
    characters.forEach((char) => {
      characterNameToLook.set(char.name || "", char.inline_look || "");
    });

    // 创建场景名称到数据库 ID 的映射
    const locationNameToId = new Map<string, string>();
    locations.forEach((loc) => {
      locationNameToId.set(loc.name, loc.id);
    });

    // 构建分镜数据
    const scenesToCreate = scenes.map((scene, index) => {
      // 将角色 ID 转换为名称
      const characterNames = (scene.characterIds || [])
        .map((id) => characterIdToName.get(id) || id)
        .filter((name): name is string => !!name);

      // 查找匹配的 location
      const matchedLocation = locations.find(
        (loc) => loc.name === scene.locationId || loc.name.includes(scene.locationId) || scene.locationId.includes(loc.name)
      );

      // 从第一个 Cut 获取镜头类型
      const firstCut = scene.cuts?.[0];
      const shotType = firstCut?.cameraAngle?.toLowerCase().replace(/\s+/g, "_") || "medium_shot";

      return {
        project_id: projectId,
        scene_index: index,
        duration: Math.max(1, Math.round(Number(scene.duration) || 8)),
        shot_type: shotType,
        camera_movement: null,
        camera_movement_prompt: null,
        description: scene.description,
        full_prompt: buildScenePrompt(scene, parsedCharacters, styleConfig),
        status: "pending",
        character_ids: characterNames,
        location_id: matchedLocation?.id || null,
        bgm: scene.bgm || null,
        sfx: scene.sfx || null,
        pacing: scene.pacing || null,
        cuts: (scene.cuts || []) as unknown as Json,
        dialogue_order_lock: scene.dialogueOrderLock || [],
      };
    });

    const createdScenes = await createScenes(scenesToCreate);

    // 更新项目状态为 storyboard_ready
    await updateProject(projectId, {
      status: "storyboard_ready",
    });

    const response: ApiResponse<{
      projectId: string;
      scenesCount: number;
    }> = {
      success: true,
      data: {
        projectId,
        scenesCount: createdScenes.length,
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("生成分镜失败:", error);

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
