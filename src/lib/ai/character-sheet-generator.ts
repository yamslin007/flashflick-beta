// 角色三视图生成服务
// 流程：先生成正面图 → 用户确认 → 以正面图为参考，一次性生成完整三视图设计稿

import { geminiClient } from "./providers/gemini";
import { getArtStyle, type ArtStyleId } from "./art-styles";

// 角色多视角资源类型
export interface CharacterAssets {
  sheet_url: string;       // 完整三视图设计稿 (横图，包含正面+侧面+背面)
  front: string;           // 原始正面立绘 (用户确认的那张)
  generated_at: string;    // 生成时间
}

// 镜头类型
export type ShotType =
  | "close_up"        // 特写
  | "medium_close"    // 中近景
  | "medium"          // 中景
  | "medium_wide"     // 中全景
  | "wide"            // 全景
  | "extreme_wide";   // 远景

/**
 * 三视图生成服务
 */
export class CharacterSheetGenerator {
  /**
   * 以正面图为参考，一次性生成完整的三视图设计稿
   * @param frontImage 已确认的正面图
   * @param characterName 角色名称
   * @param description 角色外观描述
   * @param styleId 画风 ID（ghibli 或 cel）
   */
  async generateFromFrontImage(
    frontImage: string,
    characterName: string,
    description: string,
    styleId: ArtStyleId | string = "ghibli"
  ): Promise<CharacterAssets> {
    console.log("[CharacterSheetGenerator] 开始以正面图为参考生成角色设计稿（四视图+色板+细节）");

    // 获取画风配置
    const artStyle = getArtStyle(styleId);

    // Build full character design sheet prompt (4 views + color palette + details)
    const fullDesignSheetPrompt = `
[TASK]
Create a professional CHARACTER DESIGN REFERENCE SHEET with multiple views, color palette, and detail callouts.

[REFERENCE IMAGE]
Use the attached image as the EXACT character design reference. Maintain EXACTLY:
- Same face, hairstyle, hair color
- Same outfit, clothing details, patterns, colors
- Same body proportions, height

[ART STYLE - IMPORTANT]
${artStyle.character.positive}

[LAYOUT] (16:9 aspect ratio)

TOP SECTION - Four Full-Body Views (evenly spaced, same height):
┌─────────┬─────────┬─────────┬─────────┐
│ FRONT   │ LEFT    │ BACK    │ RIGHT   │
│ VIEW    │ PROFILE │ VIEW    │ PROFILE │
└─────────┴─────────┴─────────┴─────────┘

BOTTOM LEFT - Color Palette (MUST extract from reference image):
- 6-8 color swatches EXTRACTED FROM THE CHARACTER in the reference image
- MUST include actual colors from: hair, skin, eyes, clothing, accessories
- DO NOT generate random colors - use ONLY colors that appear on the character
- Small squares with clean borders
- Label: "COLOR PALETTE"

BOTTOM RIGHT - Detail Callouts (circular or rectangular frames):
- Face/Eyes close-up
- Hair detail
- Top/Shirt/Upper clothing detail
- Pants/Skirt/Lower clothing detail
- Shoes/Footwear detail
- Accessories detail (if any)
- Connect each detail with thin lines to the main figure

[CHARACTER INFO]
Name: ${characterName}
Description: ${description}

[STYLE]
- Professional character design sheet layout
- Light gray or white background
- Clean, organized layout

[REQUIREMENTS]
- Consistent character design across all four views
- Full body visible in each view (head to toe)
- Standing in relaxed neutral pose
- Color palette MUST match the actual colors from the reference image exactly
- ALL text labels in English ONLY: "FRONT", "LEFT", "BACK", "RIGHT", "COLOR PALETTE", "DETAILS"
- NO Chinese, Japanese, Korean or any non-English text

[NEGATIVE - AVOID THESE]
${artStyle.character.negative}
`;

    // 调用 Gemini 生成角色设计稿 (使用 16:9 横版)
    const sheetUrl = await geminiClient.generateImageWithReference(
      fullDesignSheetPrompt,
      [frontImage],
      [characterName],
      "16:9"
    );

    console.log("[CharacterSheetGenerator] 角色设计稿生成成功");

    return {
      sheet_url: sheetUrl,
      front: frontImage,  // 保留原始正面立绘
      generated_at: new Date().toISOString(),
    };
  }

  /**
   * 根据镜头类型和角色动作选择合适的视角
   */
  static getViewAngleForShot(
    shotType: ShotType,
    characterAction?: string,
    characterPosition?: "left" | "center" | "right"
  ): "front" | "side" | "back" {
    // 离开/背对镜头 → 背面
    if (characterAction?.includes("离开") ||
        characterAction?.includes("leaving") ||
        characterAction?.includes("走远") ||
        characterAction?.includes("背对")) {
      return "back";
    }

    // 行走/侧面 → 侧面
    if (characterAction?.includes("走") ||
        characterAction?.includes("walk") ||
        characterAction?.includes("跑") ||
        characterAction?.includes("run") ||
        characterAction?.includes("侧")) {
      return "side";
    }

    // 特写/对话 → 正面
    if (shotType === "close_up" || shotType === "medium_close") {
      return "front";
    }

    // 中景对话通常用正面或稍微侧面
    if (shotType === "medium") {
      if (characterPosition === "left" || characterPosition === "right") {
        return "side";
      }
      return "front";
    }

    return "front";
  }

  /**
   * 判断侧面图是否需要水平翻转
   */
  static shouldFlipSideView(
    characterPosition: "left" | "center" | "right",
    lookingAt?: "left" | "right" | "camera"
  ): boolean {
    if (characterPosition === "right") {
      return true;
    }
    if (lookingAt === "left") {
      return true;
    }
    return false;
  }
}

// 导出单例
export const characterSheetGenerator = new CharacterSheetGenerator();
