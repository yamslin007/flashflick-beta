// 根据中文角色描述，用 Claude 重新生成英文 base_prompt
// POST /api/characters/[id]/regenerate-prompt

import { NextResponse } from "next/server";
import type { ApiResponse } from "@/types";
import { getCharacter, updateCharacter } from "@/lib/db/characters";
import { claudeClient } from "@/lib/ai/providers/claude";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const { description } = await request.json();

    if (!description?.trim()) {
      return NextResponse.json(
        { success: false, error: "角色描述不能为空" },
        { status: 400 }
      );
    }

    const character = await getCharacter(id);
    if (!character) {
      return NextResponse.json(
        { success: false, error: "角色不存在" },
        { status: 404 }
      );
    }

    // 用 Claude 将中文描述转换为英文外观 prompt
    const basePrompt = await claudeClient.complete(
      `You are an expert at writing AI image generation prompts for anime characters.

Convert the following Chinese character description into a concise English appearance prompt suitable for AI portrait generation.

Character name: ${character.name || "Unknown"}
Chinese description: ${description.trim()}

Rules:
- Focus ONLY on visual appearance: hair color/style, eye color, clothing, body type, distinctive features
- Write in comma-separated tags format
- Keep it under 80 words
- Do NOT include personality, backstory, or non-visual traits
- Do NOT include any Chinese characters
- Output ONLY the English prompt, nothing else

Example output: "teenage girl, long blue hair, twin tails, violet eyes, white sailor uniform, red ribbon, slender build, soft smile"`,
      { maxTokens: 200, temperature: 0.3 }
    );

    const trimmedPrompt = basePrompt.trim().replace(/^["']|["']$/g, "");

    // 更新数据库
    const updated = await updateCharacter(id, { base_prompt: trimmedPrompt });

    const response: ApiResponse = {
      success: true,
      data: { ...updated, generatedPrompt: trimmedPrompt },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("重新生成 prompt 失败:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "生成失败" },
      { status: 500 }
    );
  }
}
