// 视频生成服务 - Zapiwala 格式支持
// 基于图像生成视频片段
// 当前使用: Veo

import { veoClient } from "./providers/veo";
import type { Scene } from "@/lib/db/supabase/types";
import type { ParsedCut } from "./script-parser";
import { getPanelLayout } from "./image-generator";
import { getCameraDescription } from "./camera-movements";

// 默认视频配置
const DEFAULT_VIDEO_CONFIG = {
  aspectRatio: "16:9" as const,
  enhancePrompt: true,
};

export interface GenerateSceneVideoOptions {
  duration?: number; // 视频时长（秒）
  model?: string; // 视频生成模型
  onProgress?: (progress: number) => void; // 进度回调
}

/**
 * 获取专业运镜描述 — 使用统一运镜词典
 */
function getProfessionalMovement(cameraAngle: string): string {
  return getCameraDescription(cameraAngle);
}

/**
 * 构建分镜图布局描述
 */
function buildPanelLayoutDescription(cuts: ParsedCut[]): string {
  if (!cuts || cuts.length < 2) {
    return "";
  }

  const layout = getPanelLayout(cuts.length);
  const lines: string[] = [];

  lines.push(`[INPUT IMAGE STRUCTURE]`);
  lines.push(`This is a ${layout.name} storyboard image with ${cuts.length} panels arranged as: ${layout.triggerWord}`);
  lines.push(`Panel positions (reading order: left-to-right, top-to-bottom):`);

  cuts.forEach((cut, index) => {
    if (index < layout.panelPositions.length) {
      const position = layout.panelPositions[index];
      const cutDesc: string[] = [];

      if (cut.cameraAngle) {
        cutDesc.push(cut.cameraAngle);
      }

      if (cut.character) {
        if (cut.character.name) cutDesc.push(cut.character.name);
        if (cut.character.emotion) cutDesc.push(`${cut.character.emotion} expression`);
      }

      if (cut.visualDescription) {
        const shortDesc = cut.visualDescription.length > 50
          ? cut.visualDescription.slice(0, 50) + "..."
          : cut.visualDescription;
        cutDesc.push(shortDesc);
      }

      lines.push(`- ${position}: Cut ${index + 1} - ${cutDesc.join(", ")}`);
    }
  });

  lines.push("");
  lines.push(`[VIDEO DIRECTION]`);
  lines.push(`Animate the content shown in these panels with smooth cinematic transitions:`);

  return lines.join("\n");
}

/**
 * 构建视频生成的运动提示词（Zapiwala 格式）
 */
export function buildVideoPrompt(
  scene: Pick<Scene, "description" | "camera_movement" | "camera_movement_prompt" | "cuts" | "bgm" | "sfx" | "pacing">,
  additionalPrompt?: string
): string {
  const parts: string[] = [];

  // 添加场景描述
  if (scene.description) {
    parts.push(scene.description);
  }

  // 添加 Zapiwala 音频层（如果存在）
  if (scene.bgm || scene.sfx || scene.pacing) {
    const audioParts: string[] = [];
    if (scene.bgm) audioParts.push(`BGM: ${scene.bgm}`);
    if (scene.sfx) audioParts.push(`SFX: ${scene.sfx}`);
    if (scene.pacing) audioParts.push(`Pacing: ${scene.pacing}`);
    parts.push(`[AUDIO] ${audioParts.join(", ")}`);
  }

  // 添加运镜描述
  const cuts = scene.cuts as unknown as ParsedCut[] | null;
  if (cuts && cuts.length > 0) {
    // 使用 Zapiwala cuts 构建运镜
    const cameraInstructions: string[] = [];

    cuts.forEach((cut, index) => {
      const cameraAngle = cut.cameraAngle || "medium shot";
      const movement = getProfessionalMovement(cameraAngle);
      // 加入 visualDescription 让提示词更具体
      const visualDesc = cut.visualDescription ? ` — ${cut.visualDescription}` : "";
      cameraInstructions.push(`Cut ${index + 1} (${cameraAngle}): ${movement}${visualDesc}`);

      // 如果有角色对话，添加对话信息
      if (cut.character && cut.character.dialogue) {
        cameraInstructions.push(`  - Dialogue: "${cut.character.dialogue}"`);
        if (cut.character.emotion) {
          cameraInstructions.push(`  - Emotion: ${cut.character.emotion}`);
        }
      }
    });

    parts.push(`[CAMERA MOVEMENT]\n${cameraInstructions.join("\n")}`);
  } else if (scene.camera_movement_prompt) {
    // 回退到旧的 camera_movement_prompt
    parts.push(`[CAMERA] ${scene.camera_movement_prompt}`);
  } else if (scene.camera_movement) {
    // 回退到 camera_movement 字段
    const movement = getProfessionalMovement(scene.camera_movement);
    parts.push(`[CAMERA] ${movement}`);
  }

  // 添加多格布局描述（如果有多个 cuts）
  if (cuts && cuts.length >= 2) {
    parts.push(buildPanelLayoutDescription(cuts));
  }

  // 添加额外提示词
  if (additionalPrompt) {
    parts.push(additionalPrompt);
  }

  // 添加质量提示词
  parts.push("anime style motion, smooth animation, high quality");

  return parts.filter(Boolean).join("\n");
}

/**
 * 为单个场景生成视频
 * 使用 Veo API
 */
export async function generateSceneVideo(
  scene: Pick<Scene, "preview_image_url" | "description" | "camera_movement" | "camera_movement_prompt" | "duration" | "cuts" | "bgm" | "sfx" | "pacing">,
  options: GenerateSceneVideoOptions = {}
): Promise<string> {
  // 验证场景有预览图
  if (!scene.preview_image_url) {
    throw new Error("场景缺少预览图，请先生成预览图");
  }

  // 构建运动提示词（支持 Zapiwala 格式）
  const prompt = buildVideoPrompt(scene);

  // 确定视频模型
  const videoModel = options.model || "veo_3_1-fast";

  console.log(`[VideoGenerator] 使用 Veo 生成视频, 模型: ${videoModel}`);

  // 使用 Veo 生成视频
  const videoUrl = await veoClient.generateImageToVideo({
    model: videoModel,
    images: [scene.preview_image_url],
    prompt: prompt,
    aspect_ratio: DEFAULT_VIDEO_CONFIG.aspectRatio,
    enhance_prompt: true,
  });

  return videoUrl;
}

/**
 * 批量生成场景视频
 */
export async function generateSceneVideos(
  scenes: Array<
    Pick<Scene, "id" | "preview_image_url" | "description" | "camera_movement" | "camera_movement_prompt" | "duration" | "cuts" | "bgm" | "sfx" | "pacing">
  >,
  options: GenerateSceneVideoOptions & {
    onSceneProgress?: (sceneId: string, progress: number) => void;
    onSceneComplete?: (sceneId: string, videoUrl: string) => void;
    onSceneError?: (sceneId: string, error: Error) => void;
  } = {}
): Promise<Map<string, string>> {
  const results = new Map<string, string>();

  // 串行生成（避免 API 限流）
  for (const scene of scenes) {
    try {
      const videoUrl = await generateSceneVideo(scene, {
        duration: options.duration,
        model: options.model,
      });
      results.set(scene.id, videoUrl);
      options.onSceneComplete?.(scene.id, videoUrl);
    } catch (error) {
      console.error(`场景 ${scene.id} 视频生成失败:`, error);
      options.onSceneError?.(scene.id, error as Error);
    }
  }

  return results;
}

/**
 * 重新生成场景视频（支持用户反馈优化）
 */
export async function regenerateSceneVideo(
  scene: Pick<Scene, "preview_image_url" | "description" | "camera_movement" | "camera_movement_prompt" | "duration" | "cuts" | "bgm" | "sfx" | "pacing">,
  feedback?: string,
  options: GenerateSceneVideoOptions = {}
): Promise<string> {
  let enhancedScene = scene;

  // 如果有用户反馈，将反馈融入提示词
  if (feedback) {
    console.log(`[VideoGenerator] 用户反馈: ${feedback}`);
    // TODO: 将反馈融入视频提示词
  }

  return generateSceneVideo(enhancedScene, options);
}
