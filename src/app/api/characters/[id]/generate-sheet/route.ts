// 角色三视图生成 API
// POST /api/characters/[id]/generate-sheet - 以正面图为参考生成侧面和背面

import { NextResponse } from "next/server";

// 增加超时时间到 5 分钟
export const maxDuration = 300;
import type { ApiResponse } from "@/types";
import type { Json } from "@/lib/db/supabase/types";
import { getCharacter, updateCharacter } from "@/lib/db/characters";
import { getProject } from "@/lib/db/projects";
import { characterSheetGenerator, type CharacterAssets } from "@/lib/ai/character-sheet-generator";

interface RouteParams {
  params: Promise<{ id: string }>;
}

interface GenerateSheetBody {
  style?: string; // 艺术风格
}

export async function POST(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body: GenerateSheetBody = await request.json().catch(() => ({}));

    // 获取角色信息
    const character = await getCharacter(id);
    if (!character) {
      return NextResponse.json(
        { success: false, error: "角色不存在" },
        { status: 404 }
      );
    }

    if (!character.description) {
      return NextResponse.json(
        { success: false, error: "请先填写角色外观描述" },
        { status: 400 }
      );
    }

    // 检查是否有正面图
    const refImages = character.reference_images as string[] | null;
    const frontImage = refImages?.[0];
    if (!frontImage) {
      return NextResponse.json(
        { success: false, error: "请先生成正面立绘，确认满意后再生成三视图" },
        { status: 400 }
      );
    }

    // 获取项目风格
    let artStyle = body.style;
    if (!artStyle && character.project_id) {
      const project = await getProject(character.project_id);
      if (project?.style_config) {
        const styleConfig = project.style_config as { artStyle?: string };
        artStyle = styleConfig.artStyle || "anime";
      }
    }
    artStyle = artStyle || "anime";

    console.log(`[generate-sheet] 以正面图为参考生成三视图设计稿: ${character.name}`);

    // 以正面图为参考，一次性生成完整三视图设计稿
    const assets = await characterSheetGenerator.generateFromFrontImage(
      frontImage,
      character.name || "character",
      character.description,
      artStyle
    );

    // 更新角色数据
    await updateCharacter(id, {
      assets: assets as unknown as Json,
    });

    console.log(`[generate-sheet] 三视图生成成功: ${character.name}`);

    const response: ApiResponse<{ characterId: string; assets: CharacterAssets }> = {
      success: true,
      data: {
        characterId: id,
        assets,
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("[generate-sheet] 生成角色三视图失败:", error);

    const response: ApiResponse = {
      success: false,
      error: error instanceof Error ? error.message : "生成角色三视图失败",
    };
    return NextResponse.json(response, { status: 500 });
  }
}
