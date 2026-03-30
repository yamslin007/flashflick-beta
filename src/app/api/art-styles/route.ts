// 风格库 API - 列表 + 创建
import { NextRequest, NextResponse } from "next/server";
import { getAllCustomArtStyles, createCustomArtStyle } from "@/lib/db/custom-art-styles";
import { ART_STYLES, type ArtStyleId } from "@/lib/ai/art-styles";

// GET /api/art-styles - 获取所有画风（预设 + 自定义）
export async function GET() {
  try {
    // 获取预设画风（提取通用提示词，以 scene 为基准）
    const presetStyles = Object.values(ART_STYLES).map((style) => ({
      id: style.id,
      name: style.name,
      nameEn: style.nameEn,
      description: style.description,
      isPreset: true,
      basePreset: null,
      // 预设画风的通用提示词（用 scene 的作为展示）
      positivePrompt: style.scene.positive,
      negativePrompt: style.scene.negative,
      previewImageUrl: null,
      usageCount: 0,
      createdAt: null,
      updatedAt: null,
    }));

    // 获取自定义画风
    const customStyles = await getAllCustomArtStyles();
    const customStylesFormatted = customStyles.map((style) => ({
      id: style.id,
      name: style.name,
      nameEn: style.name_en,
      description: style.description,
      isPreset: false,
      basePreset: style.base_preset,
      positivePrompt: style.positive_prompt,
      negativePrompt: style.negative_prompt,
      previewImageUrl: style.preview_image_url,
      usageCount: style.usage_count,
      createdAt: style.created_at,
      updatedAt: style.updated_at,
    }));

    return NextResponse.json({
      success: true,
      data: {
        presets: presetStyles,
        custom: customStylesFormatted,
      },
    });
  } catch (error) {
    console.error("获取画风列表失败:", error);
    return NextResponse.json(
      { success: false, error: "获取画风列表失败" },
      { status: 500 }
    );
  }
}

// POST /api/art-styles - 创建自定义画风
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      name,
      nameEn,
      description,
      basePreset,
      positivePrompt,
      negativePrompt,
    } = body;

    // 验证必填字段
    if (!name) {
      return NextResponse.json(
        { success: false, error: "画风名称不能为空" },
        { status: 400 }
      );
    }

    // 如果基于预设创建，获取预设的提示词作为默认值
    let finalPositive = positivePrompt || "";
    let finalNegative = negativePrompt || "";

    if (basePreset && ART_STYLES[basePreset as ArtStyleId]) {
      const preset = ART_STYLES[basePreset as ArtStyleId];
      // 使用 scene 的提示词作为基准
      finalPositive = finalPositive || preset.scene.positive;
      finalNegative = finalNegative || preset.scene.negative;
    }

    // 验证提示词不为空
    if (!finalPositive) {
      return NextResponse.json(
        { success: false, error: "正向提示词不能为空" },
        { status: 400 }
      );
    }

    const style = await createCustomArtStyle({
      name,
      name_en: nameEn || null,
      description: description || null,
      base_preset: basePreset || null,
      positive_prompt: finalPositive,
      negative_prompt: finalNegative,
    });

    return NextResponse.json({
      success: true,
      data: {
        id: style.id,
        name: style.name,
        nameEn: style.name_en,
        description: style.description,
        isPreset: false,
        basePreset: style.base_preset,
        positivePrompt: style.positive_prompt,
        negativePrompt: style.negative_prompt,
        previewImageUrl: style.preview_image_url,
        usageCount: style.usage_count,
        createdAt: style.created_at,
        updatedAt: style.updated_at,
      },
    });
  } catch (error) {
    console.error("创建自定义画风失败:", error);
    return NextResponse.json(
      { success: false, error: "创建自定义画风失败" },
      { status: 500 }
    );
  }
}
