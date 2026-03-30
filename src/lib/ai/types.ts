// AI 服务类型定义

export interface ImageGenerationResult {
  imageUrl: string;
  seed?: number;
  metadata?: Record<string, unknown>;
}

export interface VideoGenerationResult {
  videoUrl: string;
  duration: number;
  lastFrameUrl?: string;
  metadata?: Record<string, unknown>;
}

export interface AudioGenerationResult {
  audioUrl: string;
  duration: number;
  metadata?: Record<string, unknown>;
}

export interface TaskStatus {
  status: "pending" | "processing" | "completed" | "failed";
  progress?: number;
  result?: unknown;
  error?: string;
}

export interface ImageGenOptions {
  initImage?: string;
  seed?: number;
  aspectRatio?: string;
  style?: string;
}

export interface VideoGenOptions {
  duration?: number;
  aspectRatio?: string;
  initImage?: string;
  style?: string;
}

export interface BGMOptions {
  duration: number;
  style?: string;
}

// 统一的 AI 服务接口
export interface IImageGenerator {
  name: string;
  generate(
    prompt: string,
    options?: ImageGenOptions
  ): Promise<ImageGenerationResult>;
  checkStatus(taskId: string): Promise<TaskStatus>;
}

export interface IVideoGenerator {
  name: string;
  generate(
    prompt: string,
    options?: VideoGenOptions
  ): Promise<VideoGenerationResult>;
  checkStatus(taskId: string): Promise<TaskStatus>;
}

export interface IAudioGenerator {
  name: string;
  generateBGM(prompt: string, options?: BGMOptions): Promise<AudioGenerationResult>;
  generateSFX(description: string): Promise<AudioGenerationResult>;
  generateVoice(text: string, voiceId: string): Promise<AudioGenerationResult>;
}
