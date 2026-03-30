// 项目类型定义

// 用户
export interface User {
  id: string;
  email: string;
  name?: string;
  credits: number;
  createdAt: Date;
}

// 项目状态
export type ProjectStatus =
  | "draft"
  | "parsing"
  | "storyboarding"
  | "storyboard_ready"
  | "user_review"
  | "generating_images"
  | "images_ready"
  | "images_partial"
  | "generating"
  | "stitching"
  | "completed"
  | "failed";

// 项目
export interface Project {
  id: string;
  userId: string;
  title: string;
  status: ProjectStatus;
  originalPrompt: string;
  parsedScript?: ParsedScript;
  styleConfig?: StyleConfig;
  totalDuration: number;
  createdAt: Date;
  updatedAt: Date;
}

// 风格配置
export interface StyleConfig {
  artStyle: "anime" | "ghibli" | "cyberpunk" | "slice_of_life";
  subStyle?: string;
  colorPalette?: string;
  referenceAnime?: string[];
  musicStyle?: string;
  mood?: string;
}

// 解析后的剧本
export interface ParsedScript {
  projectId: string;
  totalDuration: number;
  style: StyleConfig;
  characters: Character[];
  scenes: SceneScript[];
}

// 角色
export interface Character {
  id: string;
  projectId: string;
  name: string;
  description: string;
  basePrompt: string;
  referenceImages?: string[];
  createdAt: Date;
}

// 场景状态
export type SceneStatus =
  | "pending"
  | "generating_image"
  | "image_ready"
  | "user_review"
  | "generating_video"
  | "completed"
  | "failed"
  | "rejected";

// 镜头类型
export type ShotType = "close_up" | "medium_shot" | "wide_shot" | "extreme_wide";

// 镜头运动
export type CameraMovement =
  | "static"
  | "pan_left"
  | "pan_right"
  | "zoom_in"
  | "zoom_out"
  | "slow_zoom_out"
  | "tracking";

// 场景脚本 (来自 Claude 解析)
export interface SceneScript {
  sceneId: string;
  duration: number;
  shotType: ShotType;
  cameraMovement: CameraMovement;
  description: string;
  characters: string[];
  background: string;
  action: string;
  audioHint?: string;
  sfxHints?: string;
  emotion?: string;
  dialogue?: {
    text: string;
    characterVoiceId: string;
    startTime: number;
  };
}

// 场景 (数据库模型)
export interface Scene {
  id: string;
  projectId: string;
  sceneIndex: number;
  duration: number;
  shotType: ShotType;
  cameraMovement: CameraMovement;
  description: string;
  fullPrompt?: string;
  status: SceneStatus;
  previewImageUrl?: string;
  videoUrl?: string;
  userApproved: boolean;
  userFeedback?: string;
  createdAt: Date;
}

// 任务类型
export type TaskType =
  | "parse_script"
  | "generate_character_ref"
  | "generate_storyboard"
  | "generate_video"
  | "generate_bgm"
  | "generate_sfx"
  | "generate_voice"
  | "stitch_video";

// 任务状态
export type TaskStatus = "pending" | "processing" | "completed" | "failed";

// 任务
export interface Task {
  id: string;
  projectId: string;
  sceneId?: string;
  taskType: TaskType;
  status: TaskStatus;
  provider: string;
  externalTaskId?: string;
  inputParams?: Record<string, unknown>;
  outputResult?: Record<string, unknown>;
  errorMessage?: string;
  startedAt?: Date;
  completedAt?: Date;
  createdAt: Date;
}

// API 统一响应格式
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}
