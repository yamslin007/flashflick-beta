// 角色详情 API
// GET /api/characters/[id] - 获取角色
// PATCH /api/characters/[id] - 更新角色（同步更新剧本中的角色信息）
// DELETE /api/characters/[id] - 删除角色

import { NextResponse } from "next/server";
import type { ApiResponse } from "@/types";
import { getCharacter, updateCharacter, deleteCharacter } from "@/lib/db/characters";
import { getProject, updateProject } from "@/lib/db/projects";
import { getProjectScenes, updateScene } from "@/lib/db/scenes";
import type { Json } from "@/lib/db/supabase/types";

interface RouteParams {
  params: Promise<{ id: string }>;
}

interface CharacterAssets {
  sheet_url?: string;
  front?: string;
  side?: string;
  back?: string;
  generated_at?: string;
  legacy?: boolean;
}

interface UpdateCharacterBody {
  name?: string;
  description?: string;
  basePrompt?: string;
  referenceImages?: string[];
  assets?: CharacterAssets | null;
}

// 获取角色
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;

    const character = await getCharacter(id);
    if (!character) {
      return NextResponse.json(
        { success: false, error: "角色不存在" },
        { status: 404 }
      );
    }

    const response: ApiResponse = {
      success: true,
      data: character,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("获取角色失败:", error);

    const response: ApiResponse = {
      success: false,
      error: error instanceof Error ? error.message : "获取角色失败",
    };
    return NextResponse.json(response, { status: 500 });
  }
}

// 更新角色（同步更新剧本中的角色信息）
export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body: UpdateCharacterBody = await request.json();

    // 验证角色存在
    const existingCharacter = await getCharacter(id);
    if (!existingCharacter) {
      return NextResponse.json(
        { success: false, error: "角色不存在" },
        { status: 404 }
      );
    }

    const oldName = existingCharacter.name;
    const projectId = existingCharacter.project_id;

    // 构建更新数据
    const updateData: Record<string, unknown> = {};

    if (body.name !== undefined) {
      if (!body.name.trim()) {
        return NextResponse.json(
          { success: false, error: "角色名称不能为空" },
          { status: 400 }
        );
      }
      updateData.name = body.name.trim();
    }

    if (body.description !== undefined) {
      updateData.description = body.description.trim() || null;
    }

    if (body.basePrompt !== undefined) {
      updateData.base_prompt = body.basePrompt.trim() || null;
    }

    if (body.referenceImages !== undefined) {
      updateData.reference_images = body.referenceImages;
    }

    if (body.assets !== undefined) {
      updateData.assets = body.assets;
    }

    // 更新角色
    const character = await updateCharacter(id, updateData);

    // 如果角色名称改变了，同步更新剧本和场景中的引用
    const newName = body.name?.trim();
    if (newName && oldName && newName !== oldName && projectId) {
      await syncCharacterNameInProject(projectId, oldName, newName, body.description?.trim());
    } else if (body.description !== undefined && projectId) {
      // 即使名称没变，描述变了也要同步更新 parsed_script
      await syncCharacterDescriptionInProject(projectId, oldName || "", body.description?.trim() || "");
    }

    const response: ApiResponse = {
      success: true,
      data: character,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("更新角色失败:", error);

    const response: ApiResponse = {
      success: false,
      error: error instanceof Error ? error.message : "更新角色失败",
    };
    return NextResponse.json(response, { status: 500 });
  }
}

/**
 * 同步更新项目中的角色名称引用
 * - 更新 projects.parsed_script 中的角色信息
 * - 更新 scenes.character_ids 中的角色名称
 * - 更新 scenes.cuts 中的角色引用
 */
async function syncCharacterNameInProject(
  projectId: string,
  oldName: string,
  newName: string,
  newDescription?: string
) {
  try {
    // 1. 更新 parsed_script 中的角色信息
    const project = await getProject(projectId);
    if (project?.parsed_script) {
      const parsedScript = project.parsed_script as {
        characters?: Array<{ name: string; description?: string }>;
        scenes?: Array<{
          characterIds?: string[];
          cuts?: Array<{ character?: { name: string } }>;
        }>;
      };

      // 更新角色列表
      if (parsedScript.characters) {
        parsedScript.characters = parsedScript.characters.map((char) => {
          if (char.name === oldName) {
            return {
              ...char,
              name: newName,
              ...(newDescription !== undefined ? { description: newDescription } : {}),
            };
          }
          return char;
        });
      }

      // 更新场景中的角色引用
      if (parsedScript.scenes) {
        parsedScript.scenes = parsedScript.scenes.map((scene) => {
          // 更新 characterIds
          if (scene.characterIds) {
            scene.characterIds = scene.characterIds.map((name) =>
              name === oldName ? newName : name
            );
          }
          // 更新 cuts 中的角色引用
          if (scene.cuts) {
            scene.cuts = scene.cuts.map((cut) => {
              if (cut.character?.name === oldName) {
                return {
                  ...cut,
                  character: { ...cut.character, name: newName },
                };
              }
              return cut;
            });
          }
          return scene;
        });
      }

      await updateProject(projectId, {
        parsed_script: parsedScript as unknown as Json,
      });
    }

    // 2. 更新 scenes 表中的 character_ids 和 cuts
    const scenes = await getProjectScenes(projectId);
    for (const scene of scenes) {
      let needsUpdate = false;
      const updates: Record<string, unknown> = {};

      // 更新 character_ids
      if (scene.character_ids && Array.isArray(scene.character_ids)) {
        const newCharacterIds = scene.character_ids.map((name: string) =>
          name === oldName ? newName : name
        );
        if (JSON.stringify(newCharacterIds) !== JSON.stringify(scene.character_ids)) {
          updates.character_ids = newCharacterIds;
          needsUpdate = true;
        }
      }

      // 更新 cuts 中的角色引用
      if (scene.cuts && Array.isArray(scene.cuts)) {
        const newCuts = (scene.cuts as Array<{ character?: { name: string } }>).map((cut) => {
          if (cut.character?.name === oldName) {
            return {
              ...cut,
              character: { ...cut.character, name: newName },
            };
          }
          return cut;
        });
        if (JSON.stringify(newCuts) !== JSON.stringify(scene.cuts)) {
          updates.cuts = newCuts as unknown as Json;
          needsUpdate = true;
        }
      }

      if (needsUpdate) {
        await updateScene(scene.id, updates);
      }
    }

    console.log(`已同步更新角色名称: "${oldName}" -> "${newName}"`);
  } catch (error) {
    console.error("同步角色名称失败:", error);
    // 不抛出错误，主要的角色更新已完成
  }
}

/**
 * 仅同步更新 parsed_script 中的角色描述（名称未变的情况）
 */
async function syncCharacterDescriptionInProject(
  projectId: string,
  characterName: string,
  newDescription: string
) {
  try {
    const project = await getProject(projectId);
    if (project?.parsed_script) {
      const parsedScript = project.parsed_script as {
        characters?: Array<{ name: string; description?: string }>;
      };

      if (parsedScript.characters) {
        parsedScript.characters = parsedScript.characters.map((char) => {
          if (char.name === characterName) {
            return { ...char, description: newDescription };
          }
          return char;
        });

        await updateProject(projectId, {
          parsed_script: parsedScript as unknown as Json,
        });
        console.log(`已同步更新角色描述: "${characterName}"`);
      }
    }
  } catch (error) {
    console.error("同步角色描述失败:", error);
  }
}

// 删除角色
export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;

    // 验证角色存在
    const existingCharacter = await getCharacter(id);
    if (!existingCharacter) {
      return NextResponse.json(
        { success: false, error: "角色不存在" },
        { status: 404 }
      );
    }

    await deleteCharacter(id);

    const response: ApiResponse = {
      success: true,
      data: { id },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("删除角色失败:", error);

    const response: ApiResponse = {
      success: false,
      error: error instanceof Error ? error.message : "删除角色失败",
    };
    return NextResponse.json(response, { status: 500 });
  }
}
