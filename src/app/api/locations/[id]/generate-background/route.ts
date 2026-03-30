// 场景图生成 API
// POST /api/locations/[id]/generate-background - 生成场景空景图
// 使用 Gemini 3 Pro 单次生成，纯环境，无人物
// 采用单次生成方案以确保全局光照一致性（避免 Outpainting 的接缝问题）
// 画风：吉卜力 / 赛璐璐

import { NextResponse } from "next/server";

// 增加超时时间到 5 分钟
export const maxDuration = 300;
import type { ApiResponse } from "@/types";
import { getLocation, updateLocation } from "@/lib/db/locations";
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
    const { style, mode = "panorama" } = body; // mode: "panorama" (32:9) | "single" (16:9)

    // 获取场景地点信息
    const location = await getLocation(id);
    if (!location) {
      return NextResponse.json(
        { success: false, error: "场景地点不存在" },
        { status: 404 }
      );
    }

    // 获取项目风格（默认吉卜力）
    let artStyleId: ArtStyleId = "ghibli";
    if (style && (style === "ghibli" || style === "cel")) {
      artStyleId = style;
    } else if (location.project_id) {
      const project = await getProject(location.project_id);
      if (project?.style_config) {
        const styleConfig = project.style_config as { artStyle?: string };
        if (styleConfig.artStyle === "ghibli" || styleConfig.artStyle === "cel") {
          artStyleId = styleConfig.artStyle;
        }
      }
    }

    // 获取画风配置
    const artStyle = getArtStyle(artStyleId);

    // 使用场景的 base_prompt 或 description
    const environmentDescription = location.base_prompt || location.description || location.name;

    const basePrompt = `Generate a detailed background illustration with these requirements:

[ART STYLE - IMPORTANT]
${artStyle.background.positive}

[ENVIRONMENT]
- Scene: ${environmentDescription}

[CRITICAL REQUIREMENTS]
- This is an EMPTY SCENE background with ABSOLUTELY NO CHARACTERS, NO PEOPLE, NO FIGURES, NO SILHOUETTES
- Pure environment/background only - show the location without any living beings
- High quality, detailed, professional background art
- Suitable as a background for character composition
- DO NOT add ANY text, words, letters, numbers, watermarks, signatures, or labels
- Horizontal composition (16:9 aspect ratio)

[NEGATIVE - AVOID THESE]
${artStyle.background.negative}`;

    if (mode === "single") {
      // 单视角模式：只生成一张 16:9 图片
      const prompt = `${basePrompt}
- Wide angle view showing the full environment`;

      const imageUrl = await geminiClient.generateImage(prompt, "16:9");

      await updateLocation(id, {
        reference_image_url: imageUrl,
      });

      const response: ApiResponse = {
        success: true,
        data: {
          locationId: id,
          imageUrl,
          artStyle: artStyleId,
        },
      };

      return NextResponse.json(response);
    }

    // 全景模式：使用 16:9 横版比例单次直出
    // 彻底解决光照不一致问题，无需 Outpainting
    console.log("[Location] 开始生成 16:9 场景图...");

    // Master Plate Prompt - 强调 Cinematic、Wide Angle
    const masterPrompt = `(MASTER PLATE): A cinematic establishing shot of ${environmentDescription}.

[COMPOSITION]
- Aspect Ratio: 16:9 (Widescreen)
- Lens: Wide angle lens, establishing shot
- Framing: Balanced composition suitable for video production

[ART STYLE - IMPORTANT]
${artStyle.background.positive}

[NEGATIVE - AVOID THESE]
${artStyle.background.negative}
- NO split screens, NO collage, NO borders, NO text, NO watermarks
- NO people, NO characters, NO figures, NO silhouettes (empty scene only)
- NO vignette, NO frame within frame`;

    let panoramaImage: string;
    try {
      // 使用 16:9 横版比例
      panoramaImage = await geminiClient.generateImage(masterPrompt, "16:9");
      console.log("[Location] 16:9 场景图生成完成");
      console.log("[Location] 图片大小:", Math.round(panoramaImage.length / 1024), "KB");
    } catch (genError) {
      console.error("[Location] 生成全景图失败:", genError);
      throw new Error(`生成全景图失败: ${genError instanceof Error ? genError.message : "未知错误"}`);
    }

    // 主视角和扩展视角都使用同一张图（因为是单次生成的完整全景）
    const mainImage = panoramaImage;
    const reverseImage = panoramaImage;
    console.log("[Location] 单次生成完成，无需拼接");

    // 更新场景地点的所有图片
    await updateLocation(id, {
      view_main_url: mainImage,
      view_reverse_url: reverseImage,
      panorama_url: panoramaImage,
      reference_image_url: panoramaImage, // 保持向后兼容
    });

    const response: ApiResponse = {
      success: true,
      data: {
        locationId: id,
        viewMainUrl: mainImage,
        viewReverseUrl: reverseImage,
        panoramaUrl: panoramaImage,
        imageUrl: panoramaImage, // 向后兼容
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("生成空景参考图失败:", error);

    const response: ApiResponse = {
      success: false,
      error: error instanceof Error ? error.message : "生成空景参考图失败",
    };
    return NextResponse.json(response, { status: 500 });
  }
}
