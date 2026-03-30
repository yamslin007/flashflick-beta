// AI 服务工厂
// TODO: 实现服务商注册和智能选择逻辑

import type { IImageGenerator, IVideoGenerator, IAudioGenerator } from "./types";

type Region = "global" | "china";
type ServiceType = "image" | "video" | "audio";

interface ProviderConfig {
  region: Region;
  preferredProviders?: {
    image?: string;
    video?: string;
    audio?: string;
  };
}

class AIServiceFactory {
  private static instance: AIServiceFactory;
  private config: ProviderConfig;

  // 服务商注册表
  private imageProviders = new Map<string, IImageGenerator>();
  private videoProviders = new Map<string, IVideoGenerator>();
  private audioProviders = new Map<string, IAudioGenerator>();

  private constructor(config: ProviderConfig) {
    this.config = config;
    this.registerProviders();
  }

  static getInstance(config?: ProviderConfig): AIServiceFactory {
    if (!this.instance) {
      this.instance = new AIServiceFactory(config || { region: "global" });
    }
    return this.instance;
  }

  private registerProviders() {
    // TODO: 注册具体的服务商实现
    // this.imageProviders.set('gemini', new GeminiProvider());
    // this.videoProviders.set('veo', new VeoProvider());
    // this.audioProviders.set('suno', new SunoProvider());
  }

  getImageGenerator(): IImageGenerator | undefined {
    const preferred = this.config.preferredProviders?.image;
    if (preferred && this.imageProviders.has(preferred)) {
      return this.imageProviders.get(preferred);
    }
    return this.imageProviders.get("gemini");
  }

  getVideoGenerator(): IVideoGenerator | undefined {
    const preferred = this.config.preferredProviders?.video;
    if (preferred && this.videoProviders.has(preferred)) {
      return this.videoProviders.get(preferred);
    }
    return this.videoProviders.get("veo");
  }

  getAudioGenerator(): IAudioGenerator | undefined {
    const preferred = this.config.preferredProviders?.audio;
    if (preferred && this.audioProviders.has(preferred)) {
      return this.audioProviders.get(preferred);
    }
    return this.audioProviders.get("suno");
  }

  // 故障转移：当主服务商失败时自动切换
  async withFallback<T>(
    serviceType: ServiceType,
    operation: (provider: IImageGenerator | IVideoGenerator | IAudioGenerator) => Promise<T>,
    maxRetries = 2
  ): Promise<T> {
    const providers = this.getProvidersByPriority(serviceType);
    let lastError: Error | null = null;

    for (const provider of providers.slice(0, maxRetries + 1)) {
      try {
        return await operation(provider);
      } catch (error) {
        lastError = error as Error;
        console.warn(`Provider ${provider.name} failed, trying next...`);
      }
    }

    throw lastError || new Error("All providers failed");
  }

  private getProvidersByPriority(
    type: ServiceType
  ): (IImageGenerator | IVideoGenerator | IAudioGenerator)[] {
    const priorityMap = {
      global: {
        image: ["gemini"],
        video: ["veo"],
        audio: ["suno", "elevenlabs"],
      },
      china: {
        image: ["gemini"],
        video: ["veo"],
        audio: ["suno", "elevenlabs"],
      },
    };

    const priorities = priorityMap[this.config.region][type];
    const providerMap = {
      image: this.imageProviders,
      video: this.videoProviders,
      audio: this.audioProviders,
    }[type];

    return priorities
      .map((name) => providerMap.get(name))
      .filter((p): p is NonNullable<typeof p> => p !== undefined);
  }
}

export const aiFactory = AIServiceFactory.getInstance();
