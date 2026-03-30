// 图像生成服务
// 为分镜场景生成预览图
// 画风：吉卜力 / 赛璐璐
// 支持多格布局（2-6宫格）展示连续镜头

import { geminiClient } from "./providers/gemini";
import type { Scene, Character } from "@/lib/db/supabase/types";
import { getArtStyle, type ArtStyleId } from "./art-styles";
import type { ParsedCut } from "./script-parser";

// 模型类型
export type ImageModel = "gemini";

// 比例类型 - 扩展支持多格布局需要的比例
export type AspectRatio = "16:9" | "9:16" | "1:1" | "4:3" | "3:4" | "21:9";

// 多格布局配置
export interface PanelLayout {
  name: string;           // 布局名称
  triggerWord: string;    // Gemini 触发词
  aspectRatio: AspectRatio; // 推荐比例
  panelPositions: string[]; // 面板位置描述
}

// 根据 Cut 数量选择布局（导出供视频生成使用）
export const PANEL_LAYOUTS: Record<number, PanelLayout> = {
  2: {
    name: "左右分屏",
    triggerWord: "Split Screen Horizontal, two panels side by side",
    aspectRatio: "21:9",
    panelPositions: ["Left Panel", "Right Panel"],
  },
  3: {
    name: "T型布局",
    triggerWord: "T-Layout Comic Strip, one large panel on top, two smaller panels on bottom",
    aspectRatio: "16:9",
    panelPositions: ["Top Panel (large)", "Bottom-Left Panel", "Bottom-Right Panel"],
  },
  4: {
    name: "田字格",
    triggerWord: "2x2 Grid Comic Strip, four equal panels",
    aspectRatio: "1:1",
    panelPositions: ["Top-Left Panel", "Top-Right Panel", "Bottom-Left Panel", "Bottom-Right Panel"],
  },
  5: {
    name: "五宫格",
    triggerWord: "Comic Strip Layout with 5 panels, 2 panels on top row, 3 panels on bottom row",
    aspectRatio: "16:9",
    panelPositions: ["Top-Left Panel", "Top-Right Panel", "Bottom-Left Panel", "Bottom-Center Panel", "Bottom-Right Panel"],
  },
  6: {
    name: "六宫格",
    triggerWord: "2x3 Grid Comic Strip, six panels in two columns and three rows",
    aspectRatio: "3:4",
    panelPositions: ["Top-Left Panel", "Top-Right Panel", "Middle-Left Panel", "Middle-Right Panel", "Bottom-Left Panel", "Bottom-Right Panel"],
  },
};

// 图像尺寸配置
const IMAGE_SIZES = {
  "16:9": { width: 1024, height: 576 },   // 横版，适合分镜
  "9:16": { width: 576, height: 1024 },   // 竖版，适合短视频
  "1:1": { width: 1024, height: 1024 },   // 正方形，适合四宫格
  "4:3": { width: 1024, height: 768 },    // 4:3
  "3:4": { width: 768, height: 1024 },    // 3:4，适合六宫格
  "21:9": { width: 1344, height: 576 },   // 超宽，适合左右分屏
};

// 旧的尺寸配置（兼容）
const LEGACY_SIZES = {
  preview: { width: 1024, height: 576 },
  thumbnail: { width: 512, height: 288 },
  hd: { width: 1920, height: 1080 },
};

// 镜头类型对应的构图提示词
const SHOT_TYPE_PROMPTS: Record<string, string> = {
  close_up: "close-up shot, face focus, detailed facial features",
  medium_shot: "medium shot, upper body, waist up",
  wide_shot: "wide shot, full body, environmental context",
  extreme_wide: "extreme wide shot, landscape, establishing shot, epic scale",
};

export interface GenerateSceneImageOptions {
  // 新的配置方式
  model?: ImageModel;           // 模型：gemini
  aspectRatio?: AspectRatio;    // 比例：16:9 / 9:16 / 1:1 / 4:3 / 3:4 / 21:9
  artStyle?: ArtStyleId;        // 画风：ghibli / cel
  // 旧的配置（兼容）
  size?: keyof typeof LEGACY_SIZES;
  style?: string;               // 旧的 style 参数，会被转换为 artStyle
  enhancePrompt?: boolean;
  characters?: Character[];
  // 角色一致性
  referenceImages?: string[];   // 角色立绘 URL 列表
  characterNames?: string[];    // 对应的角色名称列表
  // 场景一致性
  locationImage?: string;       // 场景空景图 URL (21:9 全景)
  locationName?: string;        // 场景名称
  // 多格模式
  useMultiPanel?: boolean;      // 是否使用多格布局（默认 true）
}

/**
 * 构建角色描述提示词
 */
function buildCharacterPrompt(characters: Character[]): string {
  if (!characters || characters.length === 0) return "";

  const characterDescriptions = characters
    .filter((c) => c.name && c.description)
    .map((c) => {
      const desc = c.description || "";
      return `${c.name}: ${desc}`;
    });

  if (characterDescriptions.length === 0) return "";

  return `Characters: ${characterDescriptions.join("; ")}`;
}

/**
 * 获取布局配置
 * 根据 Cut 数量选择最佳布局
 */
export function getPanelLayout(cutCount: number): PanelLayout {
  // 限制范围 2-6
  const clampedCount = Math.max(2, Math.min(6, cutCount));
  return PANEL_LAYOUTS[clampedCount];
}

/**
 * 构建单个 Cut 的面板描述
 */
function buildPanelDescription(cut: ParsedCut, panelPosition: string): string {
  const parts: string[] = [];

  // 面板位置
  parts.push(`[${panelPosition}]`);

  // 镜头角度
  if (cut.cameraAngle) {
    parts.push(cut.cameraAngle);
  }

  // 角色信息
  if (cut.character) {
    const charParts: string[] = [];
    if (cut.character.name) charParts.push(cut.character.name);
    if (cut.character.look) charParts.push(cut.character.look);
    if (cut.character.emotion) charParts.push(`${cut.character.emotion} expression`);
    if (cut.character.cameraFocus) charParts.push(cut.character.cameraFocus);
    if (charParts.length > 0) {
      parts.push(charParts.join(", "));
    }
  }

  // 视觉描述
  if (cut.visualDescription) {
    parts.push(cut.visualDescription);
  }

  return parts.join(" - ");
}

/**
 * 构建多格布局的提示词（四宫格/六宫格等）
 * 将多个 Cuts 组合成一张分镜图
 */
export function buildMultiPanelPrompt(
  cuts: ParsedCut[],
  artStyleId: ArtStyleId | string = "ghibli"
): { positive: string; negative: string; aspectRatio: AspectRatio } {
  const artStyle = getArtStyle(artStyleId);
  const layout = getPanelLayout(cuts.length);

  console.log(`[ImageGenerator] 使用 ${layout.name} 布局生成分镜图，${cuts.length} 个 Cuts`);

  const parts: string[] = [];

  // 1. 布局触发词
  parts.push(`[LAYOUT: ${layout.triggerWord}]`);

  // 2. 画风
  parts.push(`[STYLE: ${artStyle.scene.positive}]`);

  // 3. 各个面板的内容描述
  parts.push("[PANELS:]");
  cuts.forEach((cut, index) => {
    if (index < layout.panelPositions.length) {
      const panelDesc = buildPanelDescription(cut, layout.panelPositions[index]);
      parts.push(panelDesc);
    }
  });

  // 4. 统一要求
  parts.push(`
[REQUIREMENTS]
- Each panel should be clearly separated with thin borders or gutters
- Maintain consistent character appearance across all panels
- Consistent lighting and color palette across all panels
- Professional manga/comic strip quality
- Reading order: left-to-right, top-to-bottom
- NO text, speech bubbles, or captions in any panel`);

  return {
    positive: parts.join("\n"),
    negative: artStyle.scene.negative,
    aspectRatio: layout.aspectRatio,
  };
}

/**
 * 从第一个 Cut 构建图像提示词（单图模式）
 * 优先使用 Cut 的详细信息（镜头角度、视觉描述、角色情绪等）
 * @param hasReferenceImages 是否有参考图 - 有时只写角色名+情绪，外观由参考图决定
 */
export function buildCutImagePrompt(
  cut: ParsedCut,
  artStyleId: ArtStyleId | string = "ghibli",
  hasReferenceImages: boolean = false
): { positive: string; negative: string } {
  const parts: string[] = [];

  // 获取画风配置
  const artStyle = getArtStyle(artStyleId);

  // 添加画风正向提示词
  parts.push(artStyle.scene.positive);

  // 添加镜头角度（来自 Cut）
  if (cut.cameraAngle) {
    parts.push(cut.cameraAngle);
  }

  // 添加角色信息（来自 Cut，包含外貌和情绪）
  if (cut.character) {
    const charParts: string[] = [];
    // 角色名称
    if (cut.character.name) {
      charParts.push(cut.character.name);
    }
    // 有参考图时不写外貌文字，避免与参考图冲突导致服装漂移
    if (!hasReferenceImages && cut.character.look) {
      charParts.push(cut.character.look);
    }
    // 角色情绪（不涉及外观，始终保留）
    if (cut.character.emotion) {
      charParts.push(`${cut.character.emotion} expression`);
    }
    // 镜头焦点
    if (cut.character.cameraFocus) {
      charParts.push(cut.character.cameraFocus);
    }
    if (charParts.length > 0) {
      parts.push(charParts.join(", "));
    }
  }

  // 添加视觉描述（Cut 的核心内容）
  if (cut.visualDescription) {
    parts.push(cut.visualDescription);
  }

  return {
    positive: parts.filter(Boolean).join(", "),
    negative: artStyle.scene.negative,
  };
}

/**
 * 构建完整的图像生成提示词（使用新画风配置）
 * 支持两种模式：
 * 1. 多格模式 (useMultiPanel=true): 将所有 Cuts 组合成一张分镜图
 * 2. 单图模式 (useMultiPanel=false): 只用第一个 Cut 生成单图
 */
export function buildImagePrompt(
  scene: Pick<Scene, "full_prompt" | "shot_type" | "description"> & { cuts?: ParsedCut[] },
  artStyleId: ArtStyleId | string = "ghibli",
  characters?: Character[],
  useMultiPanel: boolean = true,  // 默认使用多格模式
  hasReferenceImages: boolean = false
): { positive: string; negative: string; aspectRatio?: AspectRatio } {
  // 如果有 cuts 数组
  if (scene.cuts && scene.cuts.length > 0) {
    // 多格模式：将所有 Cuts 组合成分镜图
    if (useMultiPanel && scene.cuts.length >= 2) {
      console.log(`[ImageGenerator] 使用多格模式生成分镜图: ${scene.cuts.length} 个 Cuts`);
      return buildMultiPanelPrompt(scene.cuts, artStyleId);
    }
    // 单图模式：只用第一个 Cut
    const firstCut = scene.cuts[0];
    console.log(`[ImageGenerator] 使用单图模式生成分镜图: Cut ${firstCut.cutIndex}, 镜头: ${firstCut.cameraAngle}`);
    return buildCutImagePrompt(firstCut, artStyleId, hasReferenceImages);
  }

  // 回退到旧逻辑：使用 scene.full_prompt
  const parts: string[] = [];

  // 获取画风配置
  const artStyle = getArtStyle(artStyleId);

  // 添加画风正向提示词
  parts.push(artStyle.scene.positive);

  // 添加角色描述（提高一致性）
  if (characters && characters.length > 0) {
    const characterPrompt = buildCharacterPrompt(characters);
    if (characterPrompt) {
      parts.push(characterPrompt);
    }
  }

  // 添加场景提示词
  if (scene.full_prompt) {
    parts.push(scene.full_prompt);
  }

  // 添加镜头类型
  if (scene.shot_type && SHOT_TYPE_PROMPTS[scene.shot_type]) {
    parts.push(SHOT_TYPE_PROMPTS[scene.shot_type]);
  }

  return {
    positive: parts.filter(Boolean).join(", "),
    negative: artStyle.scene.negative,
  };
}

/**
 * 为单个场景生成预览图
 * 支持两种模式：
 * 1. 多格模式 (默认): 将所有 Cuts 组合成一张分镜图（2-6宫格）
 * 2. 单图模式: 只用第一个 Cut 生成单图
 */
export async function generateSceneImage(
  scene: Pick<Scene, "full_prompt" | "shot_type" | "description"> & { cuts?: ParsedCut[] },
  options: GenerateSceneImageOptions = {}
): Promise<string> {
  const {
    model = "gemini",
    aspectRatio: requestedAspectRatio,  // 可选，多格模式会自动选择
    artStyle,
    size,
    style,
    enhancePrompt = true,
    characters,
    referenceImages,
    characterNames,
    locationImage,
    locationName,
    useMultiPanel = true,  // 默认使用多格模式
  } = options;

  // 确定画风（新配置优先，兼容旧配置）
  let artStyleId: ArtStyleId = "ghibli";
  if (artStyle) {
    artStyleId = artStyle;
  } else if (style === "ghibli" || style === "cel") {
    artStyleId = style;
  }

  // 提前判断是否有参考图（用于提示词构建时决定是否写外貌文字）
  const willHaveReferenceImages = !!(locationImage || (referenceImages && referenceImages.length > 0));

  // 构建提示词（可能包含动态比例）
  let positivePrompt: string;
  let negativePrompt: string;
  let dynamicAspectRatio: AspectRatio | undefined;

  if (enhancePrompt) {
    const prompts = buildImagePrompt(scene, artStyleId, characters, useMultiPanel, willHaveReferenceImages);
    positivePrompt = prompts.positive;
    negativePrompt = prompts.negative;
    dynamicAspectRatio = prompts.aspectRatio;  // 多格模式返回的推荐比例
  } else {
    positivePrompt = scene.full_prompt || scene.description || "";
    negativePrompt = getArtStyle(artStyleId).scene.negative;
  }

  if (!positivePrompt) {
    throw new Error("场景缺少提示词");
  }

  // 确定最终比例：请求的比例 > 动态比例 > 默认 16:9
  const finalAspectRatio = requestedAspectRatio || dynamicAspectRatio || "16:9";

  // 确定图像尺寸
  const imageSize = size ? LEGACY_SIZES[size] : IMAGE_SIZES[finalAspectRatio];

  console.log(`[ImageGenerator] 最终比例: ${finalAspectRatio}, 尺寸: ${imageSize.width}x${imageSize.height}`);

  // 使用 Gemini 生成（支持参考图角色一致性 + 场景一致性）
  const geminiAspectRatio = finalAspectRatio as "16:9" | "9:16" | "1:1" | "3:4" | "4:3" | "21:9";

  console.log(`[ImageGenerator] 使用 Gemini 生成图片`);

  // 合并角色立绘和场景图作为参考图
  const allReferenceImages: string[] = [];
  const allReferenceLabels: string[] = [];

  // 先添加场景图（作为背景参考，放在前面）
  if (locationImage) {
    allReferenceImages.push(locationImage);
    allReferenceLabels.push(`BACKGROUND: ${locationName || "location"}`);
    console.log(`[ImageGenerator] 添加场景图作为参考: ${locationName || "未命名场景"}`);
  }

  // 再添加角色立绘
  if (referenceImages && referenceImages.length > 0) {
    allReferenceImages.push(...referenceImages);
    if (characterNames && characterNames.length > 0) {
      allReferenceLabels.push(...characterNames.map(name => `CHARACTER: ${name}`));
    }
  }

  // 在提示词末尾添加负面提示词说明
  const fullPrompt = `${positivePrompt}\n\n[NEGATIVE - AVOID THESE]\n${negativePrompt}`;

  if (allReferenceImages.length > 0) {
    // 有参考图，使用带参考图的生成
    return await geminiClient.generateImageWithReference(
      fullPrompt,
      allReferenceImages,
      allReferenceLabels,
      geminiAspectRatio,
      !!locationImage // hasLocationImage - 用于调整提示词
    );
  } else {
    // 无参考图，使用纯文字生成
    return await geminiClient.generateImage(fullPrompt, geminiAspectRatio);
  }
}

/**
 * 批量生成场景预览图
 * 如果场景有 cuts 数组，使用第一个 Cut 的信息生成
 */
export async function generateSceneImages(
  scenes: Array<Pick<Scene, "id" | "full_prompt" | "shot_type" | "description"> & { cuts?: ParsedCut[] }>,
  options: GenerateSceneImageOptions = {}
): Promise<Map<string, string>> {
  const results = new Map<string, string>();

  // 串行生成（避免 API 限流）
  for (const scene of scenes) {
    try {
      const imageUrl = await generateSceneImage(scene, options);
      results.set(scene.id, imageUrl);
    } catch (error) {
      console.error(`场景 ${scene.id} 图像生成失败:`, error);
      // 继续处理其他场景
    }
  }

  return results;
}

/**
 * 重新生成场景图像（支持用户反馈优化）
 * 如果场景有 cuts 数组，使用第一个 Cut 的信息生成
 */
export async function regenerateSceneImage(
  scene: Pick<Scene, "full_prompt" | "shot_type" | "description"> & { cuts?: ParsedCut[] },
  feedback?: string,
  options: GenerateSceneImageOptions = {}
): Promise<string> {
  let enhancedScene = scene;

  // 如果有用户反馈，将反馈融入提示词
  if (feedback && scene.full_prompt) {
    enhancedScene = {
      ...scene,
      full_prompt: `${scene.full_prompt}, ${feedback}`,
    };
  }

  return generateSceneImage(enhancedScene, options);
}
