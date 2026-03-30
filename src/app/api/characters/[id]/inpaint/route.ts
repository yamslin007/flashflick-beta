// 角色局部重绘 API
// POST /api/characters/[id]/inpaint - 局部重绘角色形象
// 使用 Gemini 2.5 Flash 图片编辑 API

import { NextResponse } from "next/server";

// 增加超时时间到 5 分钟
export const maxDuration = 300;
import type { ApiResponse } from "@/types";
import { getCharacter, updateCharacter } from "@/lib/db/characters";
import { geminiClient } from "@/lib/ai/providers/gemini";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { mask, prompt } = body;

    if (!mask) {
      return NextResponse.json(
        { success: false, error: "请绘制重绘区域" },
        { status: 400 }
      );
    }

    if (!prompt) {
      return NextResponse.json(
        { success: false, error: "请输入重绘提示词" },
        { status: 400 }
      );
    }

    // 获取角色信息
    const character = await getCharacter(id);
    if (!character) {
      return NextResponse.json(
        { success: false, error: "角色不存在" },
        { status: 404 }
      );
    }

    const refImages = character.reference_images as string[] | null;
    const originalImage = refImages?.[0];
    if (!originalImage) {
      return NextResponse.json(
        { success: false, error: "角色没有形象图片" },
        { status: 400 }
      );
    }

    // 调用 Gemini 局部重绘
    const imageUrl = await geminiClient.editImage({
      image: originalImage,
      mask,
      prompt: `${prompt}, high quality, detailed, sharp focus, same artistic style as original image`,
    });

    // 更新角色的参考图
    await updateCharacter(id, {
      reference_images: [imageUrl],
    });

    const response: ApiResponse = {
      success: true,
      data: {
        characterId: id,
        imageUrl,
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("局部重绘失败:", error);

    const response: ApiResponse = {
      success: false,
      error: error instanceof Error ? error.message : "局部重绘失败",
    };
    return NextResponse.json(response, { status: 500 });
  }
}
