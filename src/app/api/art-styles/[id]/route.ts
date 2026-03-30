// 单个画风 API - 获取/更新/删除
import { NextRequest, NextResponse } from "next/server";
import {
  getCustomArtStyle,
  updateCustomArtStyle,
  deleteCustomArtStyle,
} from "@/lib/db/custom-art-styles";
import { ART_STYLES, type ArtStyleId } from "@/lib/ai/art-styles";

interface RouteContext {
  params: Promise<{ id: string }>;
}

// GET /api/art-styles/[id] - 获取单个画风
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;

    // 检查是否是预设画风
    if (ART_STYLES[id as ArtStyleId]) {
      const preset = ART_STYLES[id as ArtStyleId];
      return NextResponse.json({
        success: true,
        data: {
          id: preset.id,
          name: preset.name,
          nameEn: preset.nameEn,
          description: preset.description,
          isPreset: true,
          basePreset: null,
          positivePrompt: preset.scene.positive,
          negativePrompt: preset.scene.negative,
          previewImageUrl: null,
          usageCount: 0,
          createdAt: null,
          updatedAt: null,
        },
      });
    }

    // 查找自定义画风
    const style = await getCustomArtStyle(id);
    if (!style) {
      return NextResponse.json(
        { success: false, error: "画风不存在" },
        { status: 404 }
      );
    }

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
    console.error("获取画风失败:", error);
    return NextResponse.json(
      { success: false, error: "获取画风失败" },
      { status: 500 }
    );
  }
}

// PATCH /api/art-styles/[id] - 更新自定义画风
export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;

    // 预设画风不能修改
    if (ART_STYLES[id as ArtStyleId]) {
      return NextResponse.json(
        { success: false, error: "预设画风不能修改" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      name,
      nameEn,
      description,
      positivePrompt,
      negativePrompt,
      previewImageUrl,
    } = body;

    // 构建更新数据
    const updateData: Record<string, unknown> = {};

    if (name !== undefined) updateData.name = name;
    if (nameEn !== undefined) updateData.name_en = nameEn;
    if (description !== undefined) updateData.description = description;
    if (previewImageUrl !== undefined) updateData.preview_image_url = previewImageUrl;
    if (positivePrompt !== undefined) updateData.positive_prompt = positivePrompt;
    if (negativePrompt !== undefined) updateData.negative_prompt = negativePrompt;

    const style = await updateCustomArtStyle(id, updateData);

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
    console.error("更新画风失败:", error);
    return NextResponse.json(
      { success: false, error: "更新画风失败" },
      { status: 500 }
    );
  }
}

// DELETE /api/art-styles/[id] - 删除自定义画风
export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;

    // 预设画风不能删除
    if (ART_STYLES[id as ArtStyleId]) {
      return NextResponse.json(
        { success: false, error: "预设画风不能删除" },
        { status: 403 }
      );
    }

    await deleteCustomArtStyle(id);

    return NextResponse.json({
      success: true,
      message: "画风已删除",
    });
  } catch (error) {
    console.error("删除画风失败:", error);
    return NextResponse.json(
      { success: false, error: "删除画风失败" },
      { status: 500 }
    );
  }
}
