# AI 动漫视频生成平台 - 技术架构设计文档

**版本**: v1.0  
**日期**: 2026年1月  
**目标**: 文字 → 60秒高质量动漫视频，纯云端架构

---

## 一、系统架构总览

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              用户界面层 (Frontend)                           │
│                         Next.js 15 + React + Tailwind                        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │
│  │  剧本输入   │  │  分镜预览   │  │  视频播放   │  │  反馈/迭代面板      │ │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              API 网关层 (API Layer)                          │
│                      Next.js API Routes / Vercel Edge Functions              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │
│  │ 用户认证    │  │ 任务提交    │  │ 状态查询    │  │  Webhook 接收       │ │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           任务编排层 (Orchestration)                         │
│                              Inngest / Trigger.dev                           │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                         工作流引擎 (Workflow Engine)                   │  │
│  │  ┌─────────┐   ┌─────────┐   ┌─────────┐   ┌─────────┐   ┌─────────┐  │  │
│  │  │剧本解析 │ → │分镜生成 │ → │图像生成 │ → │视频生成 │ → │视频拼接 │  │  │
│  │  └─────────┘   └─────────┘   └─────────┘   └─────────┘   └─────────┘  │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                    ┌─────────────────┼─────────────────┐
                    ▼                 ▼                 ▼
┌───────────────────────┐ ┌───────────────────┐ ┌───────────────────────────┐
│   LLM 服务层          │ │  图像生成层       │ │     视频生成层            │
│   (剧本/分镜)         │ │  (角色一致性)     │ │     (动画渲染)            │
│ ┌───────────────────┐ │ │ ┌───────────────┐ │ │ ┌───────────────────────┐ │
│ │ Claude API        │ │ │ │ Flux Pro      │ │ │ │ Kling AI / Runway     │ │
│ │ GPT-4o            │ │ │ │ Midjourney    │ │ │ │ Pika Labs             │ │
│ │ (分镜+Prompt优化) │ │ │ │ SDXL          │ │ │ │ CogVideoX             │ │
│ └───────────────────┘ │ │ └───────────────┘ │ │ └───────────────────────┘ │
└───────────────────────┘ └───────────────────┘ └───────────────────────────┘
                                      │
              ┌───────────────────────┼───────────────────────┐
              ▼                       ▼                       ▼
┌───────────────────────┐ ┌───────────────────┐ ┌───────────────────────────┐
│   音频生成层          │ │  音效生成层       │ │     配音生成层            │
│   (BGM)               │ │  (SFX)            │ │     (TTS/Voice)           │
│ ┌───────────────────┐ │ │ ┌───────────────┐ │ │ ┌───────────────────────┐ │
│ │ Suno AI           │ │ │ │ ElevenLabs    │ │ │ │ ElevenLabs Anime      │ │
│ │ Udio              │ │ │ │ Sound Effects │ │ │ │ GPT-4o-audio          │ │
│ │ (场景配乐)        │ │ │ │ (环境音效)    │ │ │ │ (角色对白)            │ │
│ └───────────────────┘ │ │ └───────────────┘ │ │ └───────────────────────┘ │
└───────────────────────┘ └───────────────────┘ └───────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              存储层 (Storage)                                │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────────┐  │
│  │ Supabase        │  │ Cloudflare R2   │  │ Upstash Redis               │  │
│  │ (用户/项目数据) │  │ (视频/图片存储) │  │ (缓存/实时状态)             │  │
│  └─────────────────┘  └─────────────────┘  └─────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 二、核心模块详解

### 2.1 剧本解析模块 (Script Parser)

**职责**: 将用户的自然语言输入转化为结构化的分镜脚本

```
用户输入: "一个蓝发少女在樱花树下弹吉他，镜头慢慢拉远，最后飘落的花瓣铺满整个画面"
                                    │
                                    ▼
                         ┌─────────────────────┐
                         │   Claude API        │
                         │   (剧本结构化)      │
                         └─────────────────────┘
                                    │
                                    ▼
输出 JSON:
{
  "project_id": "proj_xxx",
  "total_duration": 60,
  "style": {
    "art_style": "anime",
    "sub_style": "slice_of_life",
    "color_palette": "warm_spring",
    "reference_anime": ["你的名字", "紫罗兰永恒花园"]
  },
  "characters": [
    {
      "id": "char_001",
      "name": "蓝发少女",
      "description": "长蓝发，大眼睛，穿白色连衣裙",
      "reference_prompt": "anime girl, long blue hair, big eyes, white dress, detailed face"
    }
  ],
  "scenes": [
    {
      "scene_id": "scene_001",
      "duration": 10,
      "shot_type": "medium_shot",
      "camera_movement": "static",
      "description": "蓝发少女坐在樱花树下，手持吉他，微笑",
      "characters": ["char_001"],
      "background": "cherry blossom tree, spring afternoon, soft sunlight",
      "action": "strumming guitar gently",
      "audio_hint": "soft guitar melody"
    },
    {
      "scene_id": "scene_002",
      "duration": 15,
      "shot_type": "wide_shot",
      "camera_movement": "slow_zoom_out",
      "description": "镜头缓缓拉远，展示整棵樱花树和周围环境",
      ...
    }
  ]
}
```

### 2.2 角色一致性模块 (Character Consistency)

**核心问题**: 60秒视频中，同一角色在不同镜头必须保持外观一致

**解决方案**: 三层一致性保障

```
┌─────────────────────────────────────────────────────────────────┐
│                    角色一致性引擎                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  第一层: Reference Image (角色参考图)                           │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ • 首次生成时，为每个角色创建高质量参考图                  │   │
│  │ • 存储多角度: 正面、侧面、3/4角度                         │   │
│  │ • 使用 Flux Pro + LoRA 或 IP-Adapter 保持一致            │   │
│  └─────────────────────────────────────────────────────────┘   │
│                              │                                  │
│                              ▼                                  │
│  第二层: Prompt Engineering (提示词工程)                        │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ • 固定角色描述模板，锁定核心特征                          │   │
│  │ • 使用角色 ID 标签: "char_001_blue_hair_girl"            │   │
│  │ • 每个 Scene Prompt = Base Character Prompt + Scene Action│   │
│  └─────────────────────────────────────────────────────────┘   │
│                              │                                  │
│                              ▼                                  │
│  第三层: Post-Processing (后处理校验)                           │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ • 使用 CLIP 计算相似度分数                                │   │
│  │ • 低于阈值的帧自动重新生成                                │   │
│  │ • 可选: 用户人工确认关键帧                                │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 2.3 视频生成模块 (Video Generation)

**核心策略**: 分段生成 + 智能拼接

```
60秒视频 = 6 × 10秒片段 (或 12 × 5秒片段)

┌──────────────────────────────────────────────────────────────────┐
│                    分段生成流程                                   │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│   Scene 1 (0-10s)      Scene 2 (10-20s)     Scene 3 (20-30s)    │
│   ┌──────────┐         ┌──────────┐         ┌──────────┐        │
│   │          │         │          │         │          │        │
│   │  生成中  │ ──────► │  等待中  │ ──────► │  等待中  │        │
│   │          │         │          │         │          │        │
│   └──────────┘         └──────────┘         └──────────┘        │
│        │                    ▲                                    │
│        │                    │                                    │
│        └────────────────────┘                                    │
│           传递: 最后2秒画面 + 角色状态                            │
│                                                                  │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│   连贯性保障机制:                                                 │
│                                                                  │
│   1. 上下文传递 (Context Passing)                                │
│      • 前一段最后帧作为下一段的 init_image                       │
│      • 前一段的结束状态写入下一段 Prompt                         │
│                                                                  │
│   2. 重叠生成 (Overlap Generation)                               │
│      • 每段实际生成 12 秒，使用最后 2 秒重叠区域做平滑过渡       │
│      • 重叠区域用 Cross-Fade 混合                                │
│                                                                  │
│   3. 风格锁定 (Style Lock)                                       │
│      • 全局 Style Prompt 不变                                    │
│      • 固定 Seed 策略: base_seed + scene_index                   │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

### 2.4 视频拼接模块 (Video Stitching)

**两种方案**:

```
方案 A: 服务端拼接 (推荐用于高质量需求)
┌─────────────────────────────────────────┐
│  Cloudflare Workers + FFmpeg           │
│  • 调用 ffmpeg 合并视频段               │
│  • 添加转场效果 (fade, dissolve)        │
│  • 添加音轨                             │
│  • 输出最终 MP4                         │
└─────────────────────────────────────────┘

方案 B: 客户端拼接 (节省成本)
┌─────────────────────────────────────────┐
│  FFmpeg.wasm (浏览器端)                 │
│  • 用户浏览器内完成拼接                  │
│  • 零服务器算力消耗                      │
│  • 适合 MVP 阶段                        │
└─────────────────────────────────────────┘
```

---

## 三、技术栈选型

### 3.1 前端技术栈

| 组件 | 选型 | 理由 |
|------|------|------|
| 框架 | Next.js 15 (App Router) | 服务端渲染 + API Routes 一体化 |
| UI 库 | shadcn/ui + Tailwind CSS | 快速开发，组件质量高 |
| 状态管理 | Zustand | 轻量，适合中型项目 |
| 视频播放 | Video.js / React Player | 成熟稳定 |
| 分镜编辑 | React DnD + Framer Motion | 拖拽交互 |
| 实时更新 | Supabase Realtime | 任务状态实时推送 |

### 3.2 后端技术栈

| 组件 | 选型 | 理由 |
|------|------|------|
| API | Next.js API Routes | 与前端同部署，简化架构 |
| 任务队列 | Inngest | 专为 Serverless 设计，支持复杂工作流 |
| 数据库 | Supabase (PostgreSQL) | 免费额度高，实时订阅 |
| 缓存 | Upstash Redis | Serverless Redis，按需付费 |
| 文件存储 | Cloudflare R2 | 零出口费用，S3 兼容 |
| 认证 | Clerk / Supabase Auth | 开箱即用 |

### 3.3 AI 服务层

| 功能 | 主选 | 备选 | 说明 |
|------|------|------|------|
| 剧本解析 | Claude API | GPT-4o | Claude 更擅长结构化输出 |
| Prompt 优化 | Claude API | - | 将用户描述转为专业 Prompt |
| 图像生成 | Flux Pro (via Fal.ai) | Midjourney API | 动漫风格效果最佳 |
| 角色一致性 | IP-Adapter + Flux | LoRA Training | 零样本角色保持 |
| 视频生成 | Kling AI API | Runway Gen-3, Pika | Kling 动漫效果出色 |
| 备用(国内) | CogVideoX | 可灵 | 中文理解更好 |

### 3.4 音频服务层

| 功能 | 主选 | 备选 | 说明 |
|------|------|------|------|
| BGM 生成 | Suno AI | Udio | 根据场景氛围生成配乐 |
| 音效 (SFX) | ElevenLabs SFX | Freesound API | 环境音、动作音效 |
| 角色配音 | ElevenLabs Anime | GPT-4o-audio | 动漫风格 TTS |
| 音频混合 | FFmpeg | Web Audio API | 多轨混音 |

### 3.5 部署平台

| 组件 | 平台 | 理由 |
|------|------|------|
| 前端 + API | Vercel | Next.js 原生支持，边缘部署 |
| 任务编排 | Inngest Cloud | 托管服务，无需运维 |
| 数据库 | Supabase | 托管 PostgreSQL |
| 文件存储 | Cloudflare R2 | 全球 CDN |

---

## 四、数据库设计

### 4.1 核心表结构

```sql
-- 用户表
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255),
    credits INTEGER DEFAULT 0,  -- 用户额度
    created_at TIMESTAMP DEFAULT NOW()
);

-- 项目表
CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    title VARCHAR(255),
    status VARCHAR(50) DEFAULT 'draft',  -- draft, processing, completed, failed
    original_prompt TEXT,  -- 用户原始输入
    parsed_script JSONB,   -- 解析后的结构化剧本
    style_config JSONB,    -- 风格配置
    total_duration INTEGER DEFAULT 60,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 角色表
CREATE TABLE characters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    name VARCHAR(255),
    description TEXT,
    base_prompt TEXT,      -- 角色基础 Prompt
    reference_images JSONB, -- 参考图片 URLs
    created_at TIMESTAMP DEFAULT NOW()
);

-- 场景/分镜表
CREATE TABLE scenes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    scene_index INTEGER NOT NULL,  -- 场景顺序
    duration INTEGER DEFAULT 10,   -- 秒数
    shot_type VARCHAR(50),         -- close_up, medium, wide
    camera_movement VARCHAR(50),   -- static, pan, zoom
    description TEXT,
    full_prompt TEXT,              -- 完整生成 Prompt
    status VARCHAR(50) DEFAULT 'pending',
    -- 生成结果
    preview_image_url TEXT,
    video_url TEXT,
    -- 用户反馈
    user_approved BOOLEAN DEFAULT FALSE,
    user_feedback TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 任务表 (追踪每个 AI 调用)
CREATE TABLE tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id),
    scene_id UUID REFERENCES scenes(id),
    task_type VARCHAR(50),  -- parse_script, generate_image, generate_video, stitch
    status VARCHAR(50) DEFAULT 'pending',
    provider VARCHAR(50),   -- fal, kling, runway
    external_task_id TEXT,  -- 外部 API 返回的任务 ID
    input_params JSONB,
    output_result JSONB,
    error_message TEXT,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 索引
CREATE INDEX idx_projects_user ON projects(user_id);
CREATE INDEX idx_scenes_project ON scenes(project_id);
CREATE INDEX idx_tasks_project ON tasks(project_id);
CREATE INDEX idx_tasks_status ON tasks(status);
```

### 4.2 状态流转图

```
Project 状态:
draft → parsing → storyboarding → user_review → generating → stitching → completed
                                      ↑               │
                                      └───────────────┘
                                      (用户修改后重新生成)

Scene 状态:
pending → generating_image → image_ready → user_review → generating_video → completed
              │                                │
              └── failed                       └── rejected (回到 pending)
```

---

## 五、60秒长视频的分段生成策略

### 5.1 核心算法: 滑动窗口 + 上下文传递

```python
# 伪代码: 长视频分段生成

class LongVideoGenerator:
    def __init__(self, total_duration=60, segment_duration=10, overlap=2):
        self.total_duration = total_duration
        self.segment_duration = segment_duration
        self.overlap = overlap  # 重叠秒数，用于平滑过渡
    
    def generate(self, project: Project):
        scenes = project.scenes
        segments = []
        context = None  # 上下文信息
        
        for i, scene in enumerate(scenes):
            # 1. 构建 Prompt (融入上下文)
            prompt = self.build_prompt(scene, context)
            
            # 2. 如果有前一段，使用最后帧作为 init_image
            init_image = None
            if context and context.get('last_frame'):
                init_image = context['last_frame']
            
            # 3. 生成视频段 (实际生成时长 = segment + overlap)
            segment = self.generate_segment(
                prompt=prompt,
                init_image=init_image,
                duration=self.segment_duration + self.overlap,
                style=project.style_config
            )
            
            # 4. 更新上下文 (传递给下一段)
            context = {
                'last_frame': segment.extract_frame(at=-1),  # 最后一帧
                'last_prompt': prompt,
                'character_states': self.extract_character_states(segment),
                'scene_summary': scene.description
            }
            
            segments.append(segment)
        
        # 5. 拼接所有段落
        final_video = self.stitch_segments(segments)
        return final_video
    
    def build_prompt(self, scene, context):
        """构建完整的生成 Prompt"""
        prompt_parts = []
        
        # 全局风格
        prompt_parts.append(f"Style: {scene.project.style_config}")
        
        # 上下文衔接
        if context:
            prompt_parts.append(f"[Continuing from: {context['scene_summary']}]")
        
        # 角色描述 (保持一致性)
        for char in scene.characters:
            prompt_parts.append(f"Character {char.name}: {char.base_prompt}")
        
        # 场景描述
        prompt_parts.append(f"Scene: {scene.description}")
        prompt_parts.append(f"Camera: {scene.shot_type}, {scene.camera_movement}")
        prompt_parts.append(f"Action: {scene.action}")
        
        return "\n".join(prompt_parts)
    
    def stitch_segments(self, segments):
        """拼接视频段，处理重叠区域"""
        result = segments[0].trim(end=-self.overlap)  # 第一段去掉最后2秒
        
        for i in range(1, len(segments)):
            prev_end = segments[i-1].get_overlap_region()
            curr_start = segments[i].get_overlap_region(start=True)
            
            # Cross-fade 过渡
            transition = self.cross_fade(prev_end, curr_start, duration=self.overlap)
            
            # 拼接
            result = result.concat(transition)
            result = result.concat(segments[i].trim(start=self.overlap, end=-self.overlap))
        
        # 最后一段完整保留
        result = result.concat(segments[-1].trim(start=self.overlap))
        
        return result
```

### 5.2 Inngest 工作流定义

```typescript
// /lib/inngest/functions/generate-video.ts

import { inngest } from "@/lib/inngest/client";

export const generateVideoWorkflow = inngest.createFunction(
  { id: "generate-video" },
  { event: "video/generate.requested" },
  async ({ event, step }) => {
    const { projectId } = event.data;

    // Step 1: 解析剧本
    const parsedScript = await step.run("parse-script", async () => {
      return await parseScriptWithClaude(projectId);
    });

    // Step 2: 生成角色参考图
    const characterRefs = await step.run("generate-character-refs", async () => {
      return await generateCharacterReferences(parsedScript.characters);
    });

    // Step 3: 生成分镜预览图 (并行)
    const storyboardImages = await Promise.all(
      parsedScript.scenes.map((scene, index) =>
        step.run(`generate-storyboard-${index}`, async () => {
          return await generateStoryboardImage(scene, characterRefs);
        })
      )
    );

    // Step 4: 等待用户审核
    const approval = await step.waitForEvent("storyboard-approved", {
      event: "video/storyboard.approved",
      match: "data.projectId",
      timeout: "24h",
    });

    if (!approval) {
      throw new Error("Storyboard approval timeout");
    }

    // Step 5: 依次生成视频段 (带上下文传递)
    let context = null;
    const videoSegments = [];

    for (let i = 0; i < parsedScript.scenes.length; i++) {
      const segment = await step.run(`generate-video-segment-${i}`, async () => {
        const result = await generateVideoSegment(
          parsedScript.scenes[i],
          characterRefs,
          context
        );
        return result;
      });

      videoSegments.push(segment);
      context = {
        lastFrame: segment.lastFrameUrl,
        lastPrompt: parsedScript.scenes[i].fullPrompt,
      };
    }

    // Step 6: 拼接最终视频
    const finalVideo = await step.run("stitch-video", async () => {
      return await stitchVideoSegments(videoSegments);
    });

    // Step 7: 更新数据库
    await step.run("update-project", async () => {
      await updateProjectStatus(projectId, "completed", finalVideo.url);
    });

    return { success: true, videoUrl: finalVideo.url };
  }
);
```

---

## 六、API 接口设计

### 6.1 核心接口

```typescript
// 1. 创建项目 (提交剧本)
POST /api/projects
Body: {
  prompt: string,           // 用户原始输入
  style?: "anime" | "ghibli" | "cyberpunk",
  duration?: 30 | 60 | 120  // 目标时长
}
Response: {
  projectId: string,
  status: "parsing"
}

// 2. 获取分镜预览
GET /api/projects/:id/storyboard
Response: {
  scenes: [
    {
      id: string,
      index: number,
      description: string,
      previewImageUrl: string,
      duration: number,
      status: "pending" | "ready" | "approved"
    }
  ]
}

// 3. 用户反馈/修改分镜
PATCH /api/projects/:id/scenes/:sceneId
Body: {
  action: "approve" | "reject" | "edit",
  feedback?: string,        // 修改建议
  newDescription?: string   // 新的描述
}

// 4. 确认分镜，开始生成
POST /api/projects/:id/generate
Response: {
  status: "generating",
  estimatedTime: 300  // 预估秒数
}

// 5. 获取项目状态 (轮询或 WebSocket)
GET /api/projects/:id/status
Response: {
  status: "generating",
  progress: 45,  // 百分比
  currentStep: "Generating scene 3 of 6",
  scenes: [
    { id: "...", status: "completed", videoUrl: "..." },
    { id: "...", status: "generating", progress: 60 },
    { id: "...", status: "pending" }
  ]
}

// 6. Webhook 接收 (供 AI 服务回调)
POST /api/webhooks/fal
POST /api/webhooks/kling
```

---

## 七、用户交互流程

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              用户旅程                                        │
└─────────────────────────────────────────────────────────────────────────────┘

1. 输入阶段
   ┌─────────────────────────────────────────┐
   │  用户输入框                              │
   │  "一个蓝发少女在樱花树下弹吉他..."       │
   │                                         │
   │  [选择风格] 吉卜力 / 新海诚 / 赛博朋克   │
   │  [选择时长] 30秒 / 60秒 / 2分钟          │
   │                                         │
   │  [生成分镜] ←────── 按钮                 │
   └─────────────────────────────────────────┘
                    │
                    ▼ (等待 10-30 秒)
                    
2. 分镜预览阶段
   ┌─────────────────────────────────────────────────────────────┐
   │  分镜面板 (Storyboard)                                      │
   │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐           │
   │  │ Scene 1 │ │ Scene 2 │ │ Scene 3 │ │ Scene 4 │ ...       │
   │  │ [预览图]│ │ [预览图]│ │ [预览图]│ │ [预览图]│           │
   │  │ 10秒    │ │ 15秒    │ │ 10秒    │ │ 10秒    │           │
   │  │ ✓ 满意  │ │ ✗ 重做  │ │ ✓ 满意  │ │ ✎ 编辑  │           │
   │  └─────────┘ └─────────┘ └─────────┘ └─────────┘           │
   │                                                             │
   │  Scene 2 详情:                                              │
   │  ┌─────────────────────────────────────────────────────┐   │
   │  │ 描述: 镜头拉远，展示整棵樱花树                        │   │
   │  │ 镜头: 中景 → 远景                                    │   │
   │  │ 动作: 花瓣飘落                                       │   │
   │  │                                                      │   │
   │  │ [修改描述] "让花瓣飘得更慢一些，背景加入夕阳"       │   │
   │  │ [重新生成预览]                                       │   │
   │  └─────────────────────────────────────────────────────┘   │
   │                                                             │
   │  [全部确认，开始生成视频] ←────── 按钮                      │
   └─────────────────────────────────────────────────────────────┘
                    │
                    ▼ (等待 3-10 分钟)

3. 生成进度阶段
   ┌─────────────────────────────────────────────────────────────┐
   │  生成进度                                                   │
   │  ════════════════════════░░░░░░░░░░░░░  45%                │
   │                                                             │
   │  ✓ Scene 1: 完成                                           │
   │  ✓ Scene 2: 完成                                           │
   │  ⟳ Scene 3: 生成中 (60%)                                   │
   │  ○ Scene 4: 等待中                                         │
   │  ○ Scene 5: 等待中                                         │
   │  ○ 拼接: 等待中                                            │
   │                                                             │
   │  预计剩余时间: 3 分钟                                       │
   └─────────────────────────────────────────────────────────────┘
                    │
                    ▼

4. 预览与迭代阶段
   ┌─────────────────────────────────────────────────────────────┐
   │  视频预览                                                   │
   │  ┌─────────────────────────────────────────────────────┐   │
   │  │                                                      │   │
   │  │                  [视频播放器]                        │   │
   │  │                                                      │   │
   │  └─────────────────────────────────────────────────────┘   │
   │                                                             │
   │  场景时间轴:                                                │
   │  |--Scene1--|--Scene2--|--Scene3--|--Scene4--|--Scene5--|  │
   │  0s        10s        25s        35s        45s        60s │
   │                  ▲                                          │
   │              当前: 18秒                                     │
   │                                                             │
   │  [满意，下载视频]   [Scene 2 不满意，重新生成]              │
   └─────────────────────────────────────────────────────────────┘
```

---

## 八、开发阶段规划

### Phase 1: MVP (2-3 周)
**目标**: 跑通核心流程，验证技术可行性

- [ ] 基础 Next.js 项目搭建
- [ ] Supabase 数据库配置
- [ ] Claude API 集成 (剧本解析)
- [ ] Fal.ai / Flux 图像生成
- [ ] 单场景视频生成 (10秒)
- [ ] 简单 UI: 输入 → 输出

### Phase 2: 核心功能 (3-4 周)
**目标**: 完整的分镜工作流 + 60秒视频

- [ ] 分镜预览 UI
- [ ] 用户反馈/修改流程
- [ ] Inngest 任务编排
- [ ] 多场景视频生成
- [ ] 视频拼接 (FFmpeg)
- [ ] 角色一致性初版

### Phase 3: 体验优化 (2-3 周)
**目标**: 打磨用户体验，提高视频质量

- [ ] 实时进度显示
- [ ] 角色一致性优化 (IP-Adapter)
- [ ] 转场效果
- [ ] 音轨支持
- [ ] 用户账户系统

### Phase 4: 商业化准备 (2 周)
**目标**: 准备上线

- [ ] 支付系统
- [ ] 额度管理
- [ ] 错误处理 & 重试机制
- [ ] 性能优化
- [ ] 部署 & 监控

---

## 九、风险与应对

| 风险 | 影响 | 应对策略 |
|------|------|----------|
| API 服务不稳定 | 生成失败 | 多服务商备选 (Fal → Replicate → 直接调用) |
| 角色不一致 | 质量差 | 三层保障机制 + 人工审核关键帧 |
| 生成时间过长 | 用户流失 | 预生成 + 进度反馈 + 分段展示 |
| 成本超预期 | 亏损 | 监控 API 用量，设置用户额度上限 |
| 视频质量不稳定 | 口碑差 | A/B 测试多模型，自动评分筛选 |

---

## 十、下一步行动

1. **今天**: 确认技术栈选型，注册所需账号 (Vercel, Supabase, Fal.ai, Claude API)
2. **本周**: 完成 Phase 1 MVP，跑通单场景生成
3. **验证点**: 能否用 Flux + Kling 生成 10 秒满意的动漫视频片段

---

*文档完*

---

## 附录 A：AI 服务工厂模式实现

### A.1 服务抽象层

```typescript
// /lib/ai/types.ts

export interface ImageGenerationResult {
  imageUrl: string;
  seed?: number;
  metadata?: Record<string, any>;
}

export interface VideoGenerationResult {
  videoUrl: string;
  duration: number;
  lastFrameUrl?: string;
  metadata?: Record<string, any>;
}

export interface AudioGenerationResult {
  audioUrl: string;
  duration: number;
  metadata?: Record<string, any>;
}

// 统一的 AI 服务接口
export interface IImageGenerator {
  name: string;
  generate(prompt: string, options?: ImageGenOptions): Promise<ImageGenerationResult>;
  checkStatus(taskId: string): Promise<TaskStatus>;
}

export interface IVideoGenerator {
  name: string;
  generate(prompt: string, options?: VideoGenOptions): Promise<VideoGenerationResult>;
  checkStatus(taskId: string): Promise<TaskStatus>;
}

export interface IAudioGenerator {
  name: string;
  generateBGM(prompt: string, options?: BGMOptions): Promise<AudioGenerationResult>;
  generateSFX(description: string): Promise<AudioGenerationResult>;
  generateVoice(text: string, voiceId: string): Promise<AudioGenerationResult>;
}
```

### A.2 工厂实现

```typescript
// /lib/ai/factory.ts

import { FluxProvider } from './providers/flux';
import { KlingProvider } from './providers/kling';
import { RunwayProvider } from './providers/runway';
import { CogVideoProvider } from './providers/cogvideo';
import { SunoProvider } from './providers/suno';
import { ElevenLabsProvider } from './providers/elevenlabs';

type Region = 'global' | 'china';
type ServiceType = 'image' | 'video' | 'audio';

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
      this.instance = new AIServiceFactory(config || { region: 'global' });
    }
    return this.instance;
  }

  private registerProviders() {
    // 图像生成
    this.imageProviders.set('flux', new FluxProvider());
    this.imageProviders.set('midjourney', new MidjourneyProvider());
    
    // 视频生成
    this.videoProviders.set('kling', new KlingProvider());
    this.videoProviders.set('runway', new RunwayProvider());
    this.videoProviders.set('pika', new PikaProvider());
    this.videoProviders.set('cogvideo', new CogVideoProvider()); // 国内备选
    
    // 音频生成
    this.audioProviders.set('suno', new SunoProvider());
    this.audioProviders.set('elevenlabs', new ElevenLabsProvider());
  }

  // 智能选择最优服务商
  getImageGenerator(): IImageGenerator {
    const preferred = this.config.preferredProviders?.image;
    
    if (preferred && this.imageProviders.has(preferred)) {
      return this.imageProviders.get(preferred)!;
    }
    
    // 默认策略：全球用 Flux，国内用替代方案
    if (this.config.region === 'china') {
      return this.imageProviders.get('sdxl')!; // 或其他国内可用服务
    }
    
    return this.imageProviders.get('flux')!;
  }

  getVideoGenerator(): IVideoGenerator {
    const preferred = this.config.preferredProviders?.video;
    
    if (preferred && this.videoProviders.has(preferred)) {
      return this.videoProviders.get(preferred)!;
    }
    
    // 国内优先 CogVideoX
    if (this.config.region === 'china') {
      return this.videoProviders.get('cogvideo')!;
    }
    
    return this.videoProviders.get('kling')!;
  }

  getAudioGenerator(): IAudioGenerator {
    const preferred = this.config.preferredProviders?.audio;
    
    if (preferred && this.audioProviders.has(preferred)) {
      return this.audioProviders.get(preferred)!;
    }
    
    return this.audioProviders.get('suno')!;
  }

  // 故障转移：当主服务商失败时自动切换
  async withFallback<T>(
    serviceType: ServiceType,
    operation: (provider: any) => Promise<T>,
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

    throw lastError || new Error('All providers failed');
  }

  private getProvidersByPriority(type: ServiceType) {
    const priorityMap = {
      global: {
        image: ['flux', 'midjourney'],
        video: ['kling', 'runway', 'pika'],
        audio: ['suno', 'elevenlabs'],
      },
      china: {
        image: ['sdxl', 'flux'],
        video: ['cogvideo', 'kling'],
        audio: ['suno', 'elevenlabs'],
      },
    };

    const priorities = priorityMap[this.config.region][type];
    const providerMap = {
      image: this.imageProviders,
      video: this.videoProviders,
      audio: this.audioProviders,
    }[type];

    return priorities.map(name => providerMap.get(name)).filter(Boolean);
  }
}

export const aiFactory = AIServiceFactory.getInstance();
```

### A.3 具体服务商实现示例

```typescript
// /lib/ai/providers/kling.ts

import { IVideoGenerator, VideoGenerationResult, VideoGenOptions } from '../types';

export class KlingProvider implements IVideoGenerator {
  name = 'kling';
  private apiKey: string;
  private baseUrl = 'https://api.klingai.com/v1';

  constructor() {
    this.apiKey = process.env.KLING_API_KEY!;
  }

  async generate(prompt: string, options?: VideoGenOptions): Promise<VideoGenerationResult> {
    // 提交生成任务
    const response = await fetch(`${this.baseUrl}/videos/generate`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt,
        duration: options?.duration || 5,
        aspect_ratio: options?.aspectRatio || '16:9',
        style: 'anime', // Kling 特有的动漫风格参数
        init_image: options?.initImage,
      }),
    });

    const data = await response.json();
    return {
      videoUrl: data.video_url,
      duration: data.duration,
      lastFrameUrl: data.last_frame_url,
      metadata: { taskId: data.task_id },
    };
  }

  async checkStatus(taskId: string): Promise<TaskStatus> {
    const response = await fetch(`${this.baseUrl}/videos/${taskId}`, {
      headers: { 'Authorization': `Bearer ${this.apiKey}` },
    });
    return response.json();
  }
}
```

---

## 附录 B：局部重做功能设计

### B.1 单场景重做 API

```typescript
// /app/api/projects/[id]/scenes/[sceneId]/regenerate/route.ts

import { inngest } from '@/lib/inngest/client';

export async function POST(
  request: Request,
  { params }: { params: { id: string; sceneId: string } }
) {
  const { feedback, newDescription } = await request.json();
  const { id: projectId, sceneId } = params;

  // 更新场景描述（如果用户修改了）
  if (newDescription) {
    await db.scenes.update({
      where: { id: sceneId },
      data: {
        description: newDescription,
        status: 'pending',
        user_feedback: feedback,
      },
    });
  }

  // 触发单场景重新生成任务
  await inngest.send({
    name: 'scene/regenerate.requested',
    data: {
      projectId,
      sceneId,
      feedback,
      preserveContext: true, // 保留前后场景的上下文
    },
  });

  return Response.json({ status: 'regenerating' });
}
```

### B.2 Inngest 单场景重做工作流

```typescript
// /lib/inngest/functions/regenerate-scene.ts

export const regenerateSceneWorkflow = inngest.createFunction(
  { id: 'regenerate-scene' },
  { event: 'scene/regenerate.requested' },
  async ({ event, step }) => {
    const { projectId, sceneId, preserveContext } = event.data;

    // 1. 获取场景信息和上下文
    const sceneData = await step.run('fetch-scene-context', async () => {
      const scene = await db.scenes.findUnique({
        where: { id: sceneId },
        include: { project: true },
      });

      // 获取前一个场景的最后帧（如果有）
      const prevScene = await db.scenes.findFirst({
        where: {
          project_id: projectId,
          scene_index: scene.scene_index - 1,
        },
      });

      return {
        scene,
        prevLastFrame: prevScene?.video_url
          ? await extractLastFrame(prevScene.video_url)
          : null,
      };
    });

    // 2. 重新生成预览图
    const newPreview = await step.run('regenerate-preview', async () => {
      const factory = AIServiceFactory.getInstance();
      const imageGen = factory.getImageGenerator();
      
      return await imageGen.generate(sceneData.scene.full_prompt, {
        initImage: preserveContext ? sceneData.prevLastFrame : undefined,
      });
    });

    // 3. 更新预览图并等待用户确认
    await step.run('update-preview', async () => {
      await db.scenes.update({
        where: { id: sceneId },
        data: {
          preview_image_url: newPreview.imageUrl,
          status: 'preview_ready',
        },
      });
    });

    // 4. 等待用户确认预览
    const approval = await step.waitForEvent('wait-for-approval', {
      event: 'scene/preview.approved',
      match: 'data.sceneId',
      timeout: '1h',
    });

    if (!approval) {
      return { status: 'timeout' };
    }

    // 5. 生成视频
    const newVideo = await step.run('regenerate-video', async () => {
      const factory = AIServiceFactory.getInstance();
      
      // 使用故障转移机制
      return await factory.withFallback('video', async (provider) => {
        return await provider.generate(sceneData.scene.full_prompt, {
          duration: sceneData.scene.duration,
          initImage: preserveContext ? sceneData.prevLastFrame : undefined,
        });
      });
    });

    // 6. 更新场景
    await step.run('update-scene', async () => {
      await db.scenes.update({
        where: { id: sceneId },
        data: {
          video_url: newVideo.videoUrl,
          status: 'completed',
        },
      });
    });

    // 7. 检查是否需要重新拼接整个视频
    const needsRestitch = await step.run('check-restitch', async () => {
      const project = await db.projects.findUnique({
        where: { id: projectId },
        include: { scenes: true },
      });

      // 如果所有场景都完成了，触发重新拼接
      const allCompleted = project.scenes.every(s => s.status === 'completed');
      return allCompleted;
    });

    if (needsRestitch) {
      await inngest.send({
        name: 'video/restitch.requested',
        data: { projectId },
      });
    }

    return { status: 'completed', videoUrl: newVideo.videoUrl };
  }
);
```

### B.3 前端局部重做 UI

```tsx
// /components/SceneCard.tsx

interface SceneCardProps {
  scene: Scene;
  onRegenerate: (sceneId: string, feedback?: string) => void;
}

export function SceneCard({ scene, onRegenerate }: SceneCardProps) {
  const [feedback, setFeedback] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  return (
    <div className="border rounded-lg p-4">
      {/* 预览图 */}
      <div className="aspect-video relative">
        <img src={scene.previewImageUrl} alt={scene.description} />
        {scene.status === 'generating' && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <Spinner />
          </div>
        )}
      </div>

      {/* 场景信息 */}
      <div className="mt-3">
        <p className="text-sm text-gray-600">{scene.description}</p>
        <p className="text-xs text-gray-400">时长: {scene.duration}秒</p>
      </div>

      {/* 操作按钮 */}
      <div className="mt-4 flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsEditing(true)}
        >
          ✏️ 修改
        </Button>
        
        <Button
          variant="destructive"
          size="sm"
          onClick={() => onRegenerate(scene.id)}
        >
          🔄 重做此段
        </Button>
        
        <Button
          variant="default"
          size="sm"
          onClick={() => approveScene(scene.id)}
        >
          ✓ 满意
        </Button>
      </div>

      {/* 修改面板 */}
      {isEditing && (
        <div className="mt-4 p-3 bg-gray-50 rounded">
          <Textarea
            placeholder="描述你想要的修改..."
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
          />
          <div className="mt-2 flex gap-2">
            <Button onClick={() => {
              onRegenerate(scene.id, feedback);
              setIsEditing(false);
            }}>
              提交修改并重做
            </Button>
            <Button variant="ghost" onClick={() => setIsEditing(false)}>
              取消
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
```

---

## 附录 C：音频流水线设计

### C.1 音频生成工作流

```typescript
// /lib/inngest/functions/generate-audio.ts

export const generateAudioWorkflow = inngest.createFunction(
  { id: 'generate-audio' },
  { event: 'audio/generate.requested' },
  async ({ event, step }) => {
    const { projectId } = event.data;

    // 获取项目和场景信息
    const project = await step.run('fetch-project', async () => {
      return await db.projects.findUnique({
        where: { id: projectId },
        include: { scenes: true },
      });
    });

    // 并行生成三种音频
    const [bgm, sfx, voices] = await Promise.all([
      // 1. BGM 生成
      step.run('generate-bgm', async () => {
        const factory = AIServiceFactory.getInstance();
        const audioGen = factory.getAudioGenerator();

        // 根据整体风格生成 BGM
        const bgmPrompt = buildBGMPrompt(project);
        return await audioGen.generateBGM(bgmPrompt, {
          duration: project.total_duration,
          style: project.style_config.music_style || 'anime_ost',
        });
      }),

      // 2. 音效生成（每个场景）
      step.run('generate-sfx', async () => {
        const factory = AIServiceFactory.getInstance();
        const audioGen = factory.getAudioGenerator();

        const sfxList = [];
        for (const scene of project.scenes) {
          if (scene.sfx_hints) {
            const sfx = await audioGen.generateSFX(scene.sfx_hints);
            sfxList.push({
              sceneId: scene.id,
              startTime: calculateStartTime(scene),
              audio: sfx,
            });
          }
        }
        return sfxList;
      }),

      // 3. 角色配音（如果有对白）
      step.run('generate-voices', async () => {
        const factory = AIServiceFactory.getInstance();
        const audioGen = factory.getAudioGenerator();

        const voiceList = [];
        for (const scene of project.scenes) {
          if (scene.dialogue) {
            const voice = await audioGen.generateVoice(
              scene.dialogue.text,
              scene.dialogue.characterVoiceId
            );
            voiceList.push({
              sceneId: scene.id,
              startTime: scene.dialogue.startTime,
              audio: voice,
            });
          }
        }
        return voiceList;
      }),
    ]);

    // 4. 音频混合
    const mixedAudio = await step.run('mix-audio', async () => {
      return await mixAudioTracks({
        bgm: { audio: bgm, volume: 0.6 },
        sfx: sfx.map(s => ({ ...s, volume: 0.8 })),
        voices: voices.map(v => ({ ...v, volume: 1.0 })),
        totalDuration: project.total_duration,
      });
    });

    // 5. 保存结果
    await step.run('save-audio', async () => {
      await db.projects.update({
        where: { id: projectId },
        data: { audio_url: mixedAudio.url },
      });
    });

    return { audioUrl: mixedAudio.url };
  }
);

// BGM Prompt 构建
function buildBGMPrompt(project: Project): string {
  const style = project.style_config;
  const scenes = project.scenes;

  // 分析场景情绪变化
  const emotionCurve = scenes.map(s => s.emotion || 'neutral');

  return `
    Create an anime-style background music track.
    Overall mood: ${style.mood || 'emotional, uplifting'}
    Genre: ${style.music_style || 'orchestral, piano'}
    Duration: ${project.total_duration} seconds
    Emotion progression: ${emotionCurve.join(' → ')}
    Reference style: ${style.reference_anime?.join(', ') || 'Studio Ghibli, Makoto Shinkai films'}
  `;
}
```

### C.2 剧本解析时提取音频提示

```typescript
// /lib/ai/script-parser.ts

// 在解析剧本时，同时提取音频相关信息
const audioExtractionPrompt = `
分析以下剧本，为每个场景提取音频提示：

剧本: {userInput}

请输出 JSON，包含：
1. overall_music_style: 整体配乐风格
2. scenes: 每个场景的
   - sfx_hints: 需要的音效（如"风声"、"脚步声"）
   - emotion: 场景情绪（用于配乐节奏）
   - dialogue: 如果有角色对白，提取出来
`;
```

---

## 附录 D：完整的任务编排图

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           完整生成流程                                       │
└─────────────────────────────────────────────────────────────────────────────┘

用户提交剧本
      │
      ▼
┌─────────────┐
│ 剧本解析    │ ──────► 提取场景 + 角色 + 音频提示
└─────────────┘
      │
      ▼
┌─────────────┐
│ 角色参考图  │ ──────► 为每个角色生成多角度参考图
└─────────────┘
      │
      ├─────────────────────────────┐
      ▼                             ▼
┌─────────────┐               ┌─────────────┐
│ 分镜预览图  │               │ BGM 生成    │ (并行)
└─────────────┘               └─────────────┘
      │
      ▼
┌─────────────────────────────────────┐
│       等待用户审核分镜               │
│  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐   │
│  │ ✓   │ │ ✗   │ │ ✓   │ │ ✎   │   │
│  └─────┘ └─────┘ └─────┘ └─────┘   │
│            │           │            │
│            ▼           ▼            │
│     ┌──────────┐ ┌──────────┐      │
│     │ 重做此段 │ │ 修改描述 │      │
│     └──────────┘ └──────────┘      │
└─────────────────────────────────────┘
      │
      │ (用户确认全部分镜)
      ▼
┌─────────────────────────────────────────────────────────────────┐
│                    视频 + 音频 并行生成                          │
│                                                                 │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐     ┌─────────────────┐   │
│  │Scene 1  │→│Scene 2  │→│Scene 3  │ ... │ SFX + Voice     │   │
│  │(带上下文)│ │(带上下文)│ │(带上下文)│     │ (并行生成)      │   │
│  └─────────┘ └─────────┘ └─────────┘     └─────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
      │
      ▼
┌─────────────┐
│ 视频拼接    │ ──────► 合并所有场景 + 转场效果
└─────────────┘
      │
      ▼
┌─────────────┐
│ 音视频合成  │ ──────► 视频 + BGM + SFX + Voice
└─────────────┘
      │
      ▼
┌─────────────────────────────────────┐
│       用户预览最终视频               │
│                                     │
│  [满意 → 下载]  [不满意 → 选择重做] │
│                       │             │
│                       ▼             │
│              ┌─────────────┐        │
│              │ 局部重做    │        │
│              │ (只重新生成  │        │
│              │  选中场景)   │        │
│              └─────────────┘        │
└─────────────────────────────────────┘
```
