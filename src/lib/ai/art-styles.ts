// 画风配置文件
// 集中管理所有画风的 Positive/Negative Prompts

export type ArtStyleId = "ghibli" | "cel";

export interface ArtStyleConfig {
  id: ArtStyleId;
  name: string;
  nameEn: string;
  description: string;
  previewImage: string | null; // 预览图路径（可选）
  previewGradient: string; // 渐变色占位（CSS gradient）

  // 角色立绘专用
  character: {
    positive: string;
    negative: string;
  };

  // 分镜图专用
  scene: {
    positive: string;
    negative: string;
  };

  // 场景空景专用
  background: {
    positive: string;
    negative: string;
  };
}

/**
 * 吉卜力风格
 * 温暖治愈的手绘感，水彩纹理，怀旧温馨氛围
 */
export const GHIBLI_STYLE: ArtStyleConfig = {
  id: "ghibli",
  name: "吉卜力",
  nameEn: "Ghibli",
  description: "温暖治愈的手绘风格，柔和水彩质感，怀旧温馨氛围",
  previewImage: "/styles/ghibli.png",
  previewGradient: "linear-gradient(135deg, #a8e6cf 0%, #88d8b0 25%, #ffeaa7 50%, #fdcb6e 75%, #fab1a0 100%)",

  character: {
    positive: [
      "warm and peaceful hand-drawn animation style illustration",
      "soft natural lighting",
      "pastel and muted color palette",
      "painterly and watercolor texture",
      "gentle atmosphere with a sense of nostalgia",
      "cozy and magical realism feeling",
      "highly detailed 2D animation background",
      "cinematic composition",
      "full body standing pose",
      "front facing view",
      "simple clean background",
      "character design sheet style",
    ].join(", "),
    negative: [
      "photorealistic",
      "ultra-realistic",
      "3D render",
      "cinematic realism",
      "sharp digital texture",
      "hyper detailed skin",
      "AI-generated look",
      "text",
      "watermark",
      "signature",
      "bad anatomy",
      "distorted",
      "messy lines",
      "label",
      "multiple views",
      "multiple angles",
    ].join(", "),
  },

  scene: {
    positive: [
      "warm and peaceful hand-drawn animation style illustration",
      "soft natural lighting",
      "pastel and muted color palette",
      "painterly and watercolor texture",
      "gentle atmosphere with a sense of nostalgia",
      "cozy and magical realism feeling",
      "highly detailed 2D animation background",
      "cinematic composition",
    ].join(", "),
    negative: [
      "photorealistic",
      "ultra-realistic",
      "3D render",
      "cinematic realism",
      "sharp digital texture",
      "hyper detailed skin",
      "AI-generated look",
      "text",
      "watermark",
      "signature",
      "bad anatomy",
      "distorted",
      "messy lines",
    ].join(", "),
  },

  background: {
    positive: [
      "warm and peaceful hand-drawn animation style illustration",
      "soft natural lighting",
      "pastel and muted color palette",
      "painterly and watercolor texture",
      "gentle atmosphere with a sense of nostalgia",
      "cozy and magical realism feeling",
      "highly detailed 2D animation background",
      "cinematic composition",
      "no characters",
      "empty scene",
      "environment only",
      "wide establishing shot",
    ].join(", "),
    negative: [
      "photorealistic",
      "ultra-realistic",
      "3D render",
      "cinematic realism",
      "sharp digital texture",
      "AI-generated look",
      "text",
      "watermark",
      "signature",
      "bad anatomy",
      "distorted",
      "messy lines",
      "people",
      "characters",
      "figures",
    ].join(", "),
  },
};

/**
 * 赛璐璐风格
 * 80年代剧场版动画质感，手绘线条，平涂硬边阴影
 */
export const CEL_STYLE: ArtStyleConfig = {
  id: "cel",
  name: "赛璐璐",
  nameEn: "Cel Animation",
  description: "经典手绘赛璐璐动画风格，80年代剧场版质感",
  previewImage: "/styles/Cel Animation.png",
  previewGradient: "linear-gradient(135deg, #2c3e50 0%, #4a5568 25%, #718096 50%, #a0aec0 75%, #e2e8f0 100%)",

  character: {
    positive: [
      "classic hand-painted cel animation style",
      "vintage Japanese animated feature film aesthetic",
      "1980s theatrical animation look",
      "traditional ink line art",
      "flat cel colors with subtle uneven fills",
      "limited and muted color palette",
      "hard cel shadows, no soft gradients",
      "cinematic composition and framing",
      "rich background art with traditional painting feel",
      "full body standing pose",
      "front facing view",
      "simple clean background",
      "character design sheet style",
    ].join(", "),
    negative: [
      "modern anime style",
      "digital cel shading",
      "clean vector lines",
      "soft gradient shading",
      "3D render",
      "photorealistic",
      "high saturation",
      "watercolor",
      "AI-generated look",
      "text",
      "watermark",
      "signature",
      "film grain",
      "noise",
      "dirt",
      "analog artifacts",
      "label",
      "multiple views",
      "multiple angles",
    ].join(", "),
  },

  scene: {
    positive: [
      "classic hand-painted cel animation style",
      "vintage Japanese animated feature film aesthetic",
      "1980s theatrical animation look",
      "traditional ink line art",
      "flat cel colors with subtle uneven fills",
      "limited and muted color palette",
      "hard cel shadows, no soft gradients",
      "cinematic composition and framing",
      "rich background art with traditional painting feel",
    ].join(", "),
    negative: [
      "modern anime style",
      "digital cel shading",
      "clean vector lines",
      "soft gradient shading",
      "3D render",
      "photorealistic",
      "high saturation",
      "watercolor",
      "AI-generated look",
      "text",
      "watermark",
      "signature",
      "film grain",
      "noise",
      "dirt",
      "analog artifacts",
    ].join(", "),
  },

  background: {
    positive: [
      "classic hand-painted cel animation style",
      "vintage Japanese animated feature film aesthetic",
      "1980s theatrical animation look",
      "traditional ink line art",
      "flat cel colors with subtle uneven fills",
      "limited and muted color palette",
      "hard cel shadows, no soft gradients",
      "cinematic composition and framing",
      "rich background art with traditional painting feel",
      "no characters",
      "empty scene",
      "environment only",
      "wide establishing shot",
    ].join(", "),
    negative: [
      "modern anime style",
      "digital cel shading",
      "clean vector lines",
      "soft gradient shading",
      "3D render",
      "photorealistic",
      "high saturation",
      "watercolor",
      "AI-generated look",
      "text",
      "watermark",
      "signature",
      "film grain",
      "noise",
      "dirt",
      "analog artifacts",
      "people",
      "characters",
      "figures",
    ].join(", "),
  },
};

// 所有可用画风
export const ART_STYLES: Record<ArtStyleId, ArtStyleConfig> = {
  ghibli: GHIBLI_STYLE,
  cel: CEL_STYLE,
};

// 默认画风
export const DEFAULT_ART_STYLE: ArtStyleId = "ghibli";

/**
 * 获取画风配置
 */
export function getArtStyle(styleId: ArtStyleId | string): ArtStyleConfig {
  const style = ART_STYLES[styleId as ArtStyleId];
  if (!style) {
    console.warn(`未知画风 "${styleId}"，使用默认画风 "${DEFAULT_ART_STYLE}"`);
    return ART_STYLES[DEFAULT_ART_STYLE];
  }
  return style;
}

/**
 * 获取所有画风选项（用于 UI 下拉框）
 */
export function getArtStyleOptions(): Array<{
  value: ArtStyleId;
  label: string;
  description: string;
  previewImage: string | null;
  previewGradient: string;
}> {
  return Object.values(ART_STYLES).map((style) => ({
    value: style.id,
    label: style.name,
    description: style.description,
    previewImage: style.previewImage,
    previewGradient: style.previewGradient,
  }));
}

/**
 * 构建角色立绘完整提示词
 * @param characterDescription 角色描述（英文）
 * @param styleId 画风 ID
 */
export function buildCharacterPrompt(
  characterDescription: string,
  styleId: ArtStyleId | string = DEFAULT_ART_STYLE
): { positive: string; negative: string } {
  const style = getArtStyle(styleId);

  return {
    positive: `${characterDescription}, ${style.character.positive}`,
    negative: style.character.negative,
  };
}

/**
 * 构建分镜图完整提示词
 * @param sceneDescription 场景描述（英文）
 * @param styleId 画风 ID
 */
export function buildSceneImagePrompt(
  sceneDescription: string,
  styleId: ArtStyleId | string = DEFAULT_ART_STYLE
): { positive: string; negative: string } {
  const style = getArtStyle(styleId);

  return {
    positive: `${sceneDescription}, ${style.scene.positive}`,
    negative: style.scene.negative,
  };
}

/**
 * 构建场景空景完整提示词
 * @param backgroundDescription 背景描述（英文）
 * @param styleId 画风 ID
 */
export function buildBackgroundPrompt(
  backgroundDescription: string,
  styleId: ArtStyleId | string = DEFAULT_ART_STYLE
): { positive: string; negative: string } {
  const style = getArtStyle(styleId);

  return {
    positive: `${backgroundDescription}, ${style.background.positive}`,
    negative: style.background.negative,
  };
}

// ========================================
// 自定义画风支持
// ========================================

/**
 * 用途后缀 - 系统根据用途自动补充的提示词
 * 用户只需填写通用画风描述，这些后缀会自动追加
 */
export const USAGE_SUFFIXES = {
  // 角色立绘后缀
  character: {
    positive: [
      "full body standing pose",
      "front facing view",
      "simple clean background",
      "character design sheet style",
    ].join(", "),
    negative: [
      "text",
      "watermark",
      "signature",
      "label",
      "multiple views",
      "multiple angles",
    ].join(", "),
  },

  // 分镜图后缀
  scene: {
    positive: [
      "cinematic composition",
      "dynamic scene",
    ].join(", "),
    negative: [
      "text",
      "watermark",
      "signature",
    ].join(", "),
  },

  // 场景空景后缀
  background: {
    positive: [
      "no characters",
      "empty scene",
      "environment only",
      "wide establishing shot",
    ].join(", "),
    negative: [
      "text",
      "watermark",
      "signature",
      "people",
      "characters",
      "figures",
    ].join(", "),
  },
};

/**
 * 自定义画风配置接口（简化版，只有通用提示词）
 */
export interface CustomArtStyleConfig {
  id: string;
  name: string;
  nameEn?: string;
  description?: string;
  positivePrompt: string;
  negativePrompt: string;
}

/**
 * 使用自定义画风构建角色立绘提示词
 */
export function buildCustomCharacterPrompt(
  characterDescription: string,
  customStyle: CustomArtStyleConfig
): { positive: string; negative: string } {
  return {
    positive: `${characterDescription}, ${customStyle.positivePrompt}, ${USAGE_SUFFIXES.character.positive}`,
    negative: `${customStyle.negativePrompt}, ${USAGE_SUFFIXES.character.negative}`,
  };
}

/**
 * 使用自定义画风构建分镜图提示词
 */
export function buildCustomScenePrompt(
  sceneDescription: string,
  customStyle: CustomArtStyleConfig
): { positive: string; negative: string } {
  return {
    positive: `${sceneDescription}, ${customStyle.positivePrompt}, ${USAGE_SUFFIXES.scene.positive}`,
    negative: `${customStyle.negativePrompt}, ${USAGE_SUFFIXES.scene.negative}`,
  };
}

/**
 * 使用自定义画风构建场景空景提示词
 */
export function buildCustomBackgroundPrompt(
  backgroundDescription: string,
  customStyle: CustomArtStyleConfig
): { positive: string; negative: string } {
  return {
    positive: `${backgroundDescription}, ${customStyle.positivePrompt}, ${USAGE_SUFFIXES.background.positive}`,
    negative: `${customStyle.negativePrompt}, ${USAGE_SUFFIXES.background.negative}`,
  };
}
