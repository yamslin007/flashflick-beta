// Veo 视频生成 API 客户端 (vectorengine.ai)
// 端点: POST /v1/video/create
// 模型: veo2 / veo2-fast / veo3 / veo3-fast / veo3-pro 等
// 异步任务模式：提交任务 → 轮询状态 → 返回视频 URL

import { uploadBase64ToOSS } from "@/lib/storage/aliyun-oss";
export type VeoModel =
  | "veo_3_1-fast"
  | "veo_3_1"
  | "veo3"
  | "veo3-fast"
  | "veo3-pro"
  | "veo2"
  | "veo2-fast";

interface VeoConfig {
  apiKey: string;
  baseUrl: string;
  model: string;
}

interface VeoCreateResponse {
  task_id?: string;
  id?: string;
  code?: number;
  message?: string;
  data?: {
    task_id?: string;
    id?: string;
  };
}

interface VeoQueryResponse {
  id?: string;
  status?: string;
  video_url?: string;
  detail?: {
    status?: string;
    video_url?: string;
    upsample_video_url?: string;
    error_message?: string;
    video_generation_error?: string;
  };
  status_update_time?: number;
}

export class VeoClient {
  private apiKey: string;
  private baseUrl: string;
  private model: string;

  constructor(config?: Partial<VeoConfig>) {
    this.apiKey = config?.apiKey || process.env.VEO_API_KEY || process.env.AI_API_KEY || "";
    const rawBase = config?.baseUrl || process.env.VEO_API_BASE_URL || process.env.AI_API_BASE_URL || "https://api.vectorengine.ai";
    this.baseUrl = rawBase.replace(/\/$/, "");
    this.model = config?.model || process.env.VEO_MODEL || "veo_3_1-fast";
  }

  /**
   * 图生视频（image-to-video）
   * 提交任务后轮询，直到完成或超时（10 分钟）
   */
  async generateImageToVideo(params: {
    model?: string;
    images: string[];      // 参考图 URL 列表
    prompt: string;
    duration?: number;
    aspect_ratio?: string; // "16:9" | "9:16"，仅 veo3 系列支持
    enhance_prompt?: boolean; // 自动将中文提示词翻译为英文
    enable_upsample?: boolean; // 超分
  }): Promise<string> {
    const model = params.model || this.model;

    console.log(`[Veo] 提交图生视频任务, 模型: ${model}`);

    const taskId = await this.submitTask(model, params);
    console.log(`[Veo] 任务已提交, task_id: ${taskId}`);

    const videoUrl = await this.pollTask(taskId);
    console.log(`[Veo] 视频生成完成: ${videoUrl.slice(0, 80)}...`);

    return videoUrl;
  }

  private async submitTask(
    model: string,
    params: {
      images: string[];
      prompt: string;
      aspect_ratio?: string;
      enhance_prompt?: boolean;
      enable_upsample?: boolean;
    }
  ): Promise<string> {
    const url = `${this.baseUrl}/v1/video/create`;

    // Veo API 只接受公开 HTTP URL，base64 需先上传到 OSS
    const resolvedImages = await Promise.all(
      params.images.map(async (img) => {
        if (img.startsWith("data:") || (!img.startsWith("http") && img.length > 200)) {
          console.log("[Veo] 检测到 base64 图片，上传到 OSS...");
          return await uploadBase64ToOSS(img, "veo-inputs");
        }
        return img;
      })
    );

    const body: Record<string, unknown> = {
      model,
      prompt: params.prompt,
      images: resolvedImages,
      enhance_prompt: params.enhance_prompt ?? true,  // 默认开启，支持中文提示词
      enable_upsample: params.enable_upsample ?? false,
    };

    // aspect_ratio 仅 veo3 系列支持
    if (params.aspect_ratio && (model.startsWith("veo3") || model.startsWith("veo_3"))) {
      body.aspect_ratio = params.aspect_ratio;
    }

    console.log(`[Veo] POST ${url}, model: ${model}, images: ${resolvedImages.length}`);
    console.log(`[Veo] 图片 URLs:`, resolvedImages.map(u => u.slice(0, 80)));
    console.log(`[Veo] 请求体:`, JSON.stringify({ ...body, images: resolvedImages.map(u => u.slice(0, 80)) }));

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "Authorization": `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(body),
    });

    const text = await response.text();
    if (!response.ok) {
      console.error(`[Veo] 提交任务失败 ${response.status}:`, text.slice(0, 300));
      throw new Error(`Veo 提交任务失败: ${response.status} - ${text.slice(0, 200)}`);
    }

    const data: VeoCreateResponse = JSON.parse(text);
    const taskId = data.task_id || data.id || data.data?.task_id || data.data?.id;
    if (!taskId) {
      throw new Error(`Veo 未返回 task_id: ${text.slice(0, 200)}`);
    }

    return taskId;
  }

  /**
   * 轮询任务状态，返回视频 URL
   * 间隔 5 秒，最多等待 10 分钟
   */
  private async pollTask(taskId: string): Promise<string> {
    const maxAttempts = 120; // 120 × 5s = 10 分钟
    const interval = 5000;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      await new Promise((r) => setTimeout(r, interval));

      let data: VeoQueryResponse;

      try {
        const response = await fetch(
          `${this.baseUrl}/v1/video/query?id=${encodeURIComponent(taskId)}`,
          {
            headers: {
              "Accept": "application/json",
              "Authorization": `Bearer ${this.apiKey}`,
            },
          }
        );
        const text = await response.text();
        if (!response.ok) {
          console.warn(`[Veo] 查询任务 ${attempt}/${maxAttempts} 失败 ${response.status}`);
          continue;
        }
        data = JSON.parse(text);
      } catch (e) {
        console.warn(`[Veo] 查询任务 ${attempt}/${maxAttempts} 网络错误:`, e);
        continue;
      }

      const state = (data.status || data.detail?.status || "").toLowerCase();
      console.log(`[Veo] 任务状态 ${attempt}/${maxAttempts}: ${state}`);

      if (state === "completed" || state === "success" || state === "done") {
        // 优先使用超分视频，回退到普通视频
        const videoUrl =
          data.video_url ||
          data.detail?.upsample_video_url ||
          data.detail?.video_url;

        if (!videoUrl) {
          throw new Error(`Veo 任务完成但未返回视频 URL: ${JSON.stringify(data).slice(0, 200)}`);
        }
        return videoUrl;
      }

      if (state === "failed" || state === "error") {
        const errMsg =
          data.detail?.video_generation_error ||
          data.detail?.error_message ||
          data.detail?.status ||
          state;
        console.error(`[Veo] 任务失败，完整响应:`, JSON.stringify(data).slice(0, 500));
        throw new Error(`Veo 任务失败: ${errMsg}`);
      }

      // pending / processing / running — 继续等待
    }

    throw new Error(`Veo 视频生成超时（10 分钟），task_id: ${taskId}`);
  }
}

export const veoClient = new VeoClient();
