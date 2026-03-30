// 角色形象生成 API
// POST /api/characters/[id]/generate-portrait - 生成角色形象图
// 使用 Gemini 3 Pro 生成，支持吉卜力/赛璐璐两种画风

import { NextResponse } from "next/server";

// 增加超时时间到 5 分钟（图片生成可能需要较长时间）
export const maxDuration = 300; // 秒
import type { ApiResponse } from "@/types";
import { getCharacter, updateCharacter } from "@/lib/db/characters";
import { getProject } from "@/lib/db/projects";
import { geminiClient } from "@/lib/ai/providers/gemini";
import { getArtStyle, type ArtStyleId } from "@/lib/ai/art-styles";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const { style } = body;

    // 获取角色信息
    const character = await getCharacter(id);
    if (!character) {
      return NextResponse.json(
        { success: false, error: "角色不存在" },
        { status: 404 }
      );
    }

    if (!character.base_prompt && !character.description) {
      return NextResponse.json(
        { success: false, error: "请先填写角色外观描述" },
        { status: 400 }
      );
    }

    // 优先用 base_prompt（外观描述），fallback 到 description
    const appearanceDescription = character.base_prompt || character.description || "";

    // 获取项目风格（默认吉卜力）
    let artStyleId: ArtStyleId = "ghibli";
    if (style && (style === "ghibli" || style === "cel")) {
      artStyleId = style;
    } else if (character.project_id) {
      const project = await getProject(character.project_id);
      if (project?.style_config) {
        const styleConfig = project.style_config as { artStyle?: string };
        if (styleConfig.artStyle === "ghibli" || styleConfig.artStyle === "cel") {
          artStyleId = styleConfig.artStyle;
        }
      }
    }

    // 获取画风配置
    const artStyle = getArtStyle(artStyleId);
    const characterName = character.name || "character";

    // 构建角色形象生成提示词（使用画风配置）
    const prompt = `
【TASK】Generate a character design reference illustration

【CHARACTER】
Name: ${characterName}
Appearance: ${appearanceDescription}

【POSE & COMPOSITION - CRITICAL】
- Standing upright in a relaxed neutral pose
- Arms naturally at sides or slightly away from body
- Feet together or shoulder-width apart, firmly on ground
- Front-facing view, looking at camera
- Full body visible: head to toe, nothing cropped
- Character centered in frame with padding around edges
- Eye-level camera angle, straight on (not tilted)

【BACKGROUND】
- Pure white (#FFFFFF) or very light gray
- No shadows, no ground plane, no environment
- Clean and simple for easy extraction

【STYLE - IMPORTANT】
${artStyle.character.positive}

【QUALITY】
- High resolution, sharp details
- Professional character design quality
- Clean linework, consistent proportions

【ABSOLUTE RULES - DO NOT VIOLATE】
- DO NOT crop any body part (head, hands, feet must all be visible)
- DO NOT add any text, watermarks, signatures, labels, or annotations
- DO NOT add UI elements, borders, frames, or backgrounds
- DO NOT generate action poses, sitting, lying, or dynamic poses
- DO NOT tilt the character or use dramatic camera angles
- ONLY output the character illustration, nothing else

【NEGATIVE - AVOID THESE】
${artStyle.character.negative}
`;

    // 调用 Gemini 生成图像（角色立绘使用竖版 9:16）
    console.log("[API] 开始调用 Gemini 生成图像...");
    const imageUrl = await geminiClient.generateImage(prompt, "9:16");
    console.log("[API] Gemini 返回图像，长度:", imageUrl?.length || 0);

    // 更新角色的参考图
    console.log("[API] 开始更新数据库...");
    await updateCharacter(id, {
      reference_images: [imageUrl],
    });
    console.log("[API] 数据库更新成功");

    const response: ApiResponse = {
      success: true,
      data: {
        characterId: id,
        imageUrl,
        artStyle: artStyleId,
      },
    };

    console.log("[API] 准备返回响应，响应体大小约:", JSON.stringify(response).length, "字节");
    return NextResponse.json(response);
  } catch (error) {
    console.error("生成角色形象失败:", error);

    const response: ApiResponse = {
      success: false,
      error: error instanceof Error ? error.message : "生成角色形象失败",
    };
    return NextResponse.json(response, { status: 500 });
  }
}
