// Gemini 图片生成/编辑 API 客户端
// 默认使用 gemini-3-pro-image-preview 模型，可通过 GEMINI_IMAGE_MODEL 环境变量配置

interface GeminiConfig {
  apiKey: string;
  baseUrl: string;
  model: string; // 图片生成模型
}

interface GeminiImageEditRequest {
  image: string; // 原图 URL 或 base64
  mask: string; // mask base64 (白色=重绘区域)
  prompt: string;
}

interface GeminiResponse {
  candidates?: Array<{
    content: {
      parts: Array<{
        text?: string;
        inlineData?: {
          mimeType: string;
          data: string;
        };
      }>;
    };
  }>;
  error?: {
    message: string;
    code: number;
  };
}

export class GeminiClient {
  private apiKey: string;
  private baseUrl: string;
  private model: string;
  // URL→base64 下载缓存，避免同一张图片重复下载
  private urlCache = new Map<string, string>();

  constructor(config?: Partial<GeminiConfig>) {
    this.apiKey = config?.apiKey || process.env.GEMINI_API_KEY || process.env.AI_API_KEY || "";
    // 移除末尾的 /v1
    const rawBaseUrl = config?.baseUrl || process.env.GEMINI_API_BASE_URL || process.env.AI_API_BASE_URL || "https://api.vectorengine.ai";
    this.baseUrl = rawBaseUrl.replace(/\/v1\/?$/, "");
    // 图片生成模型，优先读 GEMINI_MODEL，其次 GEMINI_IMAGE_MODEL
    this.model = config?.model || process.env.GEMINI_MODEL || process.env.GEMINI_IMAGE_MODEL || "gemini-3-pro-image-preview";
  }

  /**
   * 提取 base64 数据（去掉 data:image/xxx;base64, 前缀）
   */
  private extractBase64(dataUrl: string): string {
    if (dataUrl.startsWith("data:")) {
      return dataUrl.split(",")[1] || dataUrl;
    }
    return dataUrl;
  }

  /**
   * 从 URL 下载图片并转为 base64
   * 自带内存缓存，同一 URL 只下载一次（批量生成时避免重复下载）
   */
  private async urlToBase64(url: string): Promise<string> {
    // 命中缓存直接返回
    const cached = this.urlCache.get(url);
    if (cached) {
      console.log(`[Gemini] 参考图缓存命中: ${url.slice(0, 60)}...`);
      return cached;
    }

    const response = await this.fetchWithRetry(url, { method: "GET" }, 3, 30000);
    if (!response.ok) {
      throw new Error(`下载参考图失败: ${url} (${response.status})`);
    }
    const buffer = await response.arrayBuffer();
    const base64 = Buffer.from(buffer).toString("base64");

    // 存入缓存
    this.urlCache.set(url, base64);
    return base64;
  }

  /**
   * 清除参考图下载缓存（批量任务完成后调用，释放内存）
   */
  clearUrlCache(): void {
    const size = this.urlCache.size;
    this.urlCache.clear();
    if (size > 0) {
      console.log(`[Gemini] 已清除 ${size} 条参考图缓存`);
    }
  }

  /**
   * 带超时和重试的 fetch
   * @param safeToRetry 是否安全重试（GET 请求为 true，POST 图片生成为 false）
   *   POST 请求的 ECONNRESET 可能意味着服务端已收到并处理，重试会重复扣费
   */
  private async fetchWithRetry(
    url: string,
    options: RequestInit,
    maxRetries = 3,
    timeout = 180000, // 3 分钟超时
    safeToRetry = true
  ): Promise<Response> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        const response = await fetch(url, {
          ...options,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);
        return response;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        const errorCause = (error as { cause?: Error })?.cause;
        const causeMessage = errorCause?.message || "";
        const causeCode = (errorCause as { code?: string })?.code || "";

        console.log(`[Gemini] 第 ${attempt}/${maxRetries} 次连接尝试失败:`, causeCode || errorMessage);

        // ECONNRESET 对非幂等请求不安全重试（服务端可能已处理并扣费）
        const isEconnReset =
          errorMessage.includes("ECONNRESET") ||
          causeMessage.includes("ECONNRESET") ||
          causeCode === "ECONNRESET";

        if (isEconnReset && !safeToRetry) {
          console.error("[Gemini] POST 请求遭遇 ECONNRESET，服务端可能已处理，不再重试以避免重复扣费");
          throw new Error("网络连接中断 (ECONNRESET)，请检查后台是否已生成图片后再决定是否重试");
        }

        // 判断是否是可重试的网络错误
        const isRetryableError =
          errorMessage.includes("fetch failed") ||
          isEconnReset ||
          errorMessage.includes("ETIMEDOUT") ||
          errorMessage.includes("ENOTFOUND") ||
          causeCode === "UND_ERR_CONNECT_TIMEOUT" ||
          causeMessage.includes("Connect Timeout");

        if (attempt === maxRetries || !isRetryableError) {
          throw error;
        }
        // 连接失败等待更长时间后重试
        const waitTime = 5000 * attempt;
        console.log(`[Gemini] 等待 ${waitTime / 1000} 秒后重试连接...`);
        await new Promise((resolve) => setTimeout(resolve, waitTime));
      }
    }
    throw new Error("请求失败，已达最大重试次数");
  }

  /**
   * 完整的图片生成请求
   * 注意：POST 图片生成是非幂等操作，ECONNRESET 不会自动重试整个请求，
   * 因为服务端可能已经处理并扣费，重试会导致重复扣费。
   * 仅对 5xx 服务器错误进行重试（服务端未处理的情况）。
   */
  private async generateImageWithFullRetry(
    url: string,
    requestBody: object,
    maxRetries = 2
  ): Promise<string> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`[Gemini] 图片生成尝试 ${attempt}/${maxRetries}`);

        // POST 请求传 safeToRetry=false，ECONNRESET 不在连接层重试
        const response = await this.fetchWithRetry(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${this.apiKey}`,
          },
          body: JSON.stringify(requestBody),
        }, 1, 180000, false); // maxRetries=1 不重试连接，3 分钟超时

        console.log("[Gemini] 响应状态:", response.status);

        // 尝试读取响应体
        let responseText: string;
        try {
          responseText = await response.text();
        } catch (readError) {
          // 响应体读取失败说明服务端已处理，不再重试以避免重复扣费
          console.error(`[Gemini] 读取响应体失败:`, readError);
          throw new Error("服务端已响应但读取失败 (ECONNRESET)，请检查后台是否已生成图片后再决定是否重试");
        }

        if (!response.ok) {
          console.error("[Gemini] 错误响应:", responseText.substring(0, 500));
          // 仅对 5xx 服务器错误重试（说明服务端没处理成功，安全重试）
          if (response.status >= 500 && attempt < maxRetries) {
            lastError = new Error(`服务器错误: ${response.status}`);
            const waitTime = 5000 * Math.pow(2, attempt - 1);
            console.log(`[Gemini] 服务器 ${response.status} 错误，等待 ${waitTime / 1000} 秒后重试...`);
            await new Promise((resolve) => setTimeout(resolve, waitTime));
            continue;
          }
          throw new Error(`Gemini API 调用失败: ${response.status} - ${responseText}`);
        }

        const data: GeminiResponse = JSON.parse(responseText);

        if (data.error) {
          throw new Error(`Gemini API 错误: ${data.error.message}`);
        }

        const candidates = data.candidates;
        if (!candidates || candidates.length === 0) {
          throw new Error("Gemini 未返回结果");
        }

        const parts = candidates[0].content.parts;
        for (const part of parts) {
          if (part.inlineData) {
            console.log(`[Gemini] 图片生成成功 (尝试 ${attempt})`);
            return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
          }
        }

        throw new Error("Gemini 未返回图片");
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        lastError = error instanceof Error ? error : new Error(errorMessage);

        // 仅对 5xx 重试，其他错误（包括 ECONNRESET）直接抛出
        if (attempt === maxRetries || !errorMessage.includes("服务器错误")) {
          throw error;
        }
      }
    }

    throw lastError || new Error("图片生成失败");
  }

  /**
   * 带参考图生成图片（用于角色一致性 + 场景一致性）
   * @param prompt 场景描述
   * @param referenceImages 参考图片（URL 或 base64），可包含场景图和角色立绘
   * @param referenceLabels 参考图标签（如 "BACKGROUND: 咖啡厅", "CHARACTER: 小明"）
   * @param aspectRatio 图片比例，默认 16:9
   * @param hasLocationImage 是否包含场景图（用于调整提示词）
   */
  async generateImageWithReference(
    prompt: string,
    referenceImages: string[],
    referenceLabels: string[],
    aspectRatio: "16:9" | "9:16" | "1:1" | "4:3" | "3:4" | "21:9" = "16:9",
    hasLocationImage: boolean = false
  ): Promise<string> {
    // 构建图片 parts
    const imageParts: Array<{ inline_data: { mime_type: string; data: string } }> = [];

    for (const img of referenceImages) {
      let imageBase64: string;
      if (img.startsWith("data:")) {
        imageBase64 = this.extractBase64(img);
      } else if (img.startsWith("http")) {
        imageBase64 = await this.urlToBase64(img);
      } else {
        imageBase64 = img;
      }
      imageParts.push({
        inline_data: {
          mime_type: "image/png",
          data: imageBase64,
        },
      });
    }

    // 分离场景图和角色标签
    const backgroundLabels = referenceLabels.filter(l => l.startsWith("BACKGROUND:"));
    const characterLabels = referenceLabels.filter(l => l.startsWith("CHARACTER:"));

    // 构建参考图说明
    let refDesc = "";
    if (backgroundLabels.length > 0) {
      const bgNames = backgroundLabels.map(l => l.replace("BACKGROUND:", "").trim());
      refDesc += `The FIRST reference image shows the BACKGROUND/LOCATION: ${bgNames.join(", ")}. `;
    }
    if (characterLabels.length > 0) {
      const charNames = characterLabels.map(l => l.replace("CHARACTER:", "").trim());
      refDesc += `The ${backgroundLabels.length > 0 ? "following" : ""} reference images are CHARACTER DESIGN SHEETS (multi-view turnaround with front/side/back views and color palette): ${charNames.join(", ")}. `;
    }

    // 角色外观锁定指令（所有模式通用）
    const characterLockInstructions = `
CHARACTER APPEARANCE LOCK (HIGHEST PRIORITY - override any conflicting scene description):
- The character reference images are DESIGN SHEETS showing the character from multiple angles
- You MUST copy the EXACT outfit from the design sheet: same garment type, same colors, same patterns, same layering
- DO NOT invent, add, remove, or modify ANY clothing item. If the design sheet shows a blue sailor uniform, the character MUST wear that exact blue sailor uniform
- Copy these attributes PIXEL-PERFECTLY from the design sheet:
  * Hair: exact style, length, color, bangs shape
  * Eyes: exact color and shape
  * Outfit: exact clothing items, fabric colors, patterns, buttons, zippers, collars, sleeves
  * Accessories: exact items (ribbons, bags, jewelry, hats) - do not add or remove any
- If the scene description mentions different clothing (e.g. "wearing a red dress"), IGNORE IT and use the design sheet outfit instead
- The design sheet is the SINGLE SOURCE OF TRUTH for character appearance`;

    // 构建完整提示词
    let fullPrompt: string;
    if (hasLocationImage) {
      // 有场景图时的提示词 - 强调使用场景作为背景
      fullPrompt = `${refDesc}

Generate a scene illustration based on these reference images with the following description:

${prompt}

CRITICAL INSTRUCTIONS:
- Use the BACKGROUND reference image as the scene environment - match its architecture, lighting, color palette, atmosphere, and details EXACTLY
- Place the characters IN this background environment naturally
- Maintain consistent lighting between characters and background (same light direction, color temperature, shadows)
- The scene should be high quality, detailed, and professional
- DO NOT change the background style or add elements not present in the background reference
${characterLockInstructions}`;
    } else {
      // 只有角色时的提示词
      fullPrompt = `${refDesc}Based on these character reference images, generate a scene illustration with the following description:

${prompt}

IMPORTANT:
- Maintain consistent art style with the reference images
- The scene should be high quality, detailed, and professional
${characterLockInstructions}`;
    }

    // 将比例转换为 Gemini API 格式
    // imageConfig.aspectRatio 直接使用原始比例字符串，如 "9:16", "16:9"
    const geminiRatio = aspectRatio;

    // 同时在提示词中明确指定比例，作为备用方案
    const ratioHintMap: Record<string, string> = {
      "16:9": "Generate a HORIZONTAL/LANDSCAPE image with 16:9 aspect ratio (width > height).",
      "9:16": "Generate a VERTICAL/PORTRAIT image with 9:16 aspect ratio (height > width).",
      "1:1": "Generate a SQUARE image with 1:1 aspect ratio.",
      "21:9": "Generate an ULTRA-WIDE CINEMATIC image with 21:9 aspect ratio.",
      "3:4": "Generate a PORTRAIT image with 3:4 aspect ratio (height > width).",
      "4:3": "Generate a LANDSCAPE image with 4:3 aspect ratio (width > height).",
    };
    const ratioHint = ratioHintMap[aspectRatio] || "";

    const finalPrompt = ratioHint ? `${ratioHint}\n\n${fullPrompt}` : fullPrompt;

    const requestBody = {
      contents: [
        {
          role: "user",
          parts: [
            { text: finalPrompt },
            ...imageParts,
          ],
        },
      ],
      generationConfig: {
        responseModalities: ["IMAGE"],
        imageConfig: {
          aspectRatio: geminiRatio,
        },
      },
    };

    const url = `${this.baseUrl}/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`;
    console.log("[Gemini] 带参考图生成请求");
    console.log("[Gemini] 参考图标签:", referenceLabels.join(", "));
    console.log("[Gemini] 包含场景图:", hasLocationImage);
    console.log("[Gemini] 比例参数:", aspectRatio, "-> Gemini格式:", geminiRatio);

    // 使用带完整重试的请求（处理 ECONNRESET 问题）
    return this.generateImageWithFullRetry(url, requestBody);
  }

  /**
   * 纯文字生成图片
   * @param prompt 图片描述
   * @param aspectRatio 图片比例，默认 16:9，支持 21:9 (CinemaScope)
   */
  async generateImage(prompt: string, aspectRatio: "16:9" | "9:16" | "1:1" | "21:9" | "3:4" | "4:3" = "16:9"): Promise<string> {
    // imageConfig.aspectRatio 直接使用原始比例字符串，如 "9:16", "16:9"
    const geminiRatio = aspectRatio;

    // 同时在提示词中明确指定比例，作为备用方案
    const ratioHintMap2: Record<string, string> = {
      "16:9": "Generate a HORIZONTAL/LANDSCAPE image with 16:9 aspect ratio (width > height).",
      "9:16": "Generate a VERTICAL/PORTRAIT image with 9:16 aspect ratio (height > width).",
      "1:1": "Generate a SQUARE image with 1:1 aspect ratio.",
      "21:9": "Generate an ULTRA-WIDE CINEMATIC image with 21:9 aspect ratio (CinemaScope format).",
      "3:4": "Generate a PORTRAIT image with 3:4 aspect ratio (height > width).",
      "4:3": "Generate a LANDSCAPE image with 4:3 aspect ratio (width > height).",
    };
    const ratioHint = ratioHintMap2[aspectRatio] || "";

    const finalPrompt = ratioHint ? `${ratioHint}\n\n${prompt}` : prompt;

    const requestBody = {
      contents: [
        {
          role: "user",
          parts: [
            {
              text: finalPrompt,
            },
          ],
        },
      ],
      generationConfig: {
        responseModalities: ["IMAGE"],
        imageConfig: {
          aspectRatio: geminiRatio,
        },
      },
    };

    const url = `${this.baseUrl}/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`;
    console.log("[Gemini] 生成图片请求，比例:", aspectRatio, "-> Gemini格式:", geminiRatio);

    // 使用带完整重试的请求（处理 ECONNRESET 问题）
    return this.generateImageWithFullRetry(url, requestBody);
  }

  /**
   * 从 data URL 中提取 MIME 类型
   */
  private getMimeType(dataUrl: string): string {
    if (dataUrl.startsWith("data:image/jpeg")) return "image/jpeg";
    if (dataUrl.startsWith("data:image/jpg")) return "image/jpeg";
    if (dataUrl.startsWith("data:image/png")) return "image/png";
    if (dataUrl.startsWith("data:image/webp")) return "image/webp";
    return "image/png"; // 默认
  }

  /**
   * 图片编辑（局部重绘 / Outpainting）
   * 使用重试机制和更长的超时时间
   */
  async editImage(request: GeminiImageEditRequest): Promise<string> {
    // 处理原图，自动检测 MIME 类型
    let imageBase64: string;
    let imageMimeType: string = "image/png";
    if (request.image.startsWith("data:")) {
      imageMimeType = this.getMimeType(request.image);
      imageBase64 = this.extractBase64(request.image);
    } else if (request.image.startsWith("http")) {
      imageBase64 = await this.urlToBase64(request.image);
    } else {
      imageBase64 = request.image;
    }

    // 处理 mask（Mask 通常是 PNG）
    let maskMimeType: string = "image/png";
    if (request.mask.startsWith("data:")) {
      maskMimeType = this.getMimeType(request.mask);
    }
    const maskBase64 = this.extractBase64(request.mask);

    console.log('[Gemini] editImage - 图片格式:', imageMimeType, '| Mask格式:', maskMimeType);

    // 构建 Gemini 请求体
    const requestBody = {
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `Edit this image. The second image is a mask where white areas indicate regions to modify. In the white masked areas, generate: ${request.prompt}. Keep all other areas unchanged. Maintain the same artistic style and quality.`,
            },
            {
              inline_data: {
                mime_type: imageMimeType,
                data: imageBase64,
              },
            },
            {
              inline_data: {
                mime_type: maskMimeType,
                data: maskBase64,
              },
            },
          ],
        },
      ],
      generationConfig: {
        responseModalities: ["IMAGE"],
      },
    };

    const url = `${this.baseUrl}/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`;
    const bodySize = JSON.stringify(requestBody).length;
    console.log('[Gemini] editImage 请求');
    console.log('[Gemini] 请求体大小:', Math.round(bodySize / 1024), 'KB');

    // 使用带完整重试的请求（处理 ECONNRESET 问题）
    return this.generateImageWithFullRetry(url, requestBody);
  }
}

// 导出单例
export const geminiClient = new GeminiClient();
