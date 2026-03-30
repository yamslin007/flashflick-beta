// Claude API 客户端
// 用于剧本解析和 Prompt 优化

interface ClaudeMessage {
  role: "user" | "assistant";
  content: string;
}

interface ClaudeResponse {
  id: string;
  type: string;
  role: string;
  content: Array<{
    type: string;
    text: string;
  }>;
  model: string;
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
}

interface ClaudeClientConfig {
  baseUrl: string;
  apiKey: string;
  model: string;
}

export class ClaudeClient {
  private baseUrl: string;
  private apiKey: string;
  private model: string;

  constructor(config?: Partial<ClaudeClientConfig>) {
    this.baseUrl = config?.baseUrl || process.env.CLAUDE_API_BASE_URL || "https://api.vectorengine.ai/v1";
    this.apiKey = config?.apiKey || process.env.CLAUDE_API_KEY || "";
    this.model = config?.model || process.env.CLAUDE_MODEL || "claude-sonnet-4-5-20250929";
  }

  async chat(
    messages: ClaudeMessage[],
    options?: {
      maxTokens?: number;
      temperature?: number;
      system?: string;
    }
  ): Promise<string> {
    const response = await fetch(`${this.baseUrl}/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": this.apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: options?.maxTokens || 4096,
        temperature: options?.temperature || 0.7,
        system: options?.system,
        messages,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Claude API 调用失败: ${response.status} - ${error}`);
    }

    const data: ClaudeResponse = await response.json();

    // 提取文本内容
    const textContent = data.content.find((c) => c.type === "text");
    if (!textContent) {
      throw new Error("Claude 返回内容为空");
    }

    return textContent.text;
  }

  // 便捷方法：单轮对话
  async complete(
    prompt: string,
    options?: {
      maxTokens?: number;
      temperature?: number;
      system?: string;
    }
  ): Promise<string> {
    return this.chat([{ role: "user", content: prompt }], options);
  }

  // 便捷方法：生成 JSON
  async generateJson<T>(
    prompt: string,
    options?: {
      maxTokens?: number;
      system?: string;
    }
  ): Promise<T> {
    const response = await this.complete(prompt, {
      ...options,
      temperature: 0.3, // 低温度确保输出稳定
    });

    // 提取 JSON 内容（支持 markdown 代码块格式）
    let jsonStr = response;

    // 尝试从 markdown 代码块中提取
    const jsonMatch = response.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1].trim();
    }

    try {
      return JSON.parse(jsonStr) as T;
    } catch (error) {
      throw new Error(`JSON 解析失败: ${error}. 原始响应: ${response.slice(0, 500)}`);
    }
  }
}

// 导出单例
export const claudeClient = new ClaudeClient();
