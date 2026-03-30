# AI 动漫视频生成平台

## 项目概述

这是一个 AI 驱动的动漫视频生成平台，用户输入文字描述，系统自动生成 60 秒的高质量动漫视频。

**核心流程**: 用户输入 → AI 生成分镜 → 用户审核/调整 → 生成视频 → 用户反馈迭代

## 技术栈

### 前端
- Next.js 16 (App Router)
- React 19
- Tailwind CSS + shadcn/ui
- Zustand (状态管理) - 待集成

### 后端
- Next.js API Routes
- Inngest (任务编排)
- Supabase (PostgreSQL 数据库 + Auth)
- Cloudflare R2 (文件存储)

### AI 服务 (通过中转站 API)
- Claude API: 剧本解析、Prompt 优化
- Flux Pro: 图像生成 (分镜预览图，使用第一个 Cut 信息)
- Gemini 3 Pro: 图像生成 + 角色一致性 + 局部重绘 (Inpainting)
- Veo 3.1: 视频生成
- Suno: BGM 生成 (待集成)
- ElevenLabs: 音效和配音 (待集成)

## 项目结构

```
flashflick-beta/
├── src/
│   ├── app/                          # Next.js App Router
│   │   ├── (auth)/                   # 认证相关页面
│   │   │   ├── login/page.tsx
│   │   │   └── layout.tsx
│   │   ├── (dashboard)/              # 主应用页面
│   │   │   ├── projects/
│   │   │   │   ├── page.tsx          # 项目列表
│   │   │   │   └── [id]/
│   │   │   │       ├── page.tsx      # 项目详情/分镜预览
│   │   │   │       ├── script/page.tsx      # 剧本预览/编辑页面
│   │   │   │       ├── locations/page.tsx   # 场景地点确认页面
│   │   │   │       └── characters/page.tsx  # 角色确认页面
│   │   │   ├── characters/page.tsx   # 全局角色库
│   │   │   ├── storyboards/page.tsx  # 分镜图库
│   │   │   ├── create/page.tsx       # 创建新视频
│   │   │   └── layout.tsx
│   │   ├── api/                      # API 路由
│   │   │   ├── projects/             # 项目 CRUD
│   │   │   ├── scenes/               # 场景操作
│   │   │   ├── characters/           # 角色 CRUD + 局部重绘
│   │   │   ├── locations/            # 场景地点 CRUD + 空景生成
│   │   │   ├── storyboards/          # 分镜图库 CRUD
│   │   │   ├── webhooks/             # AI 服务回调
│   │   │   └── inngest/              # Inngest 端点
│   │   ├── layout.tsx
│   │   ├── page.tsx                  # 首页 Landing
│   │   └── globals.css
│   ├── components/                   # React 组件
│   │   ├── ui/                       # shadcn/ui 组件
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   ├── input.tsx
│   │   │   ├── textarea.tsx
│   │   │   ├── label.tsx
│   │   │   ├── badge.tsx
│   │   │   ├── progress.tsx
│   │   │   ├── skeleton.tsx
│   │   │   ├── select.tsx
│   │   │   └── index.ts
│   │   ├── layout/
│   │   │   └── header.tsx            # 顶部导航栏
│   │   ├── project/
│   │   │   ├── project-card.tsx      # 项目卡片
│   │   │   ├── scene-card.tsx        # 分镜卡片
│   │   │   └── trim-dialog.tsx       # 视频裁剪弹窗
│   │   └── editor/                   # 分镜编辑器组件 (待开发)
│   ├── lib/                          # 核心逻辑
│   │   ├── ai/                       # AI 服务层
│   │   │   ├── providers/
│   │   │   │   ├── claude.ts         # Claude API 客户端
│   │   │   │   ├── flux.ts           # Flux Pro API 客户端
│   │   │   │   ├── veo.ts            # Veo 3.1 API 客户端 (视频生成)
│   │   │   │   ├── sora.ts           # Sora-2 API 客户端 (VectorEngine)
│   │   │   │   ├── toapis-sora.ts    # Sora-2 API 客户端 (ToApis)
│   │   │   │   ├── toapis-gemini.ts  # Gemini 图片生成 API 客户端 (ToApis)
│   │   │   │   ├── kling.ts          # Kling API 客户端 (备用)
│   │   │   │   └── gemini.ts         # Gemini API 客户端 (图片局部重绘)
│   │   │   ├── script-parser.ts      # 剧本解析服务
│   │   │   ├── image-generator.ts    # 图像生成服务
│   │   │   ├── image-stitcher.ts     # 图片拼接服务 (Sharp, 32:9 全景)
│   │   │   ├── video-generator.ts    # 视频生成服务
│   │   │   ├── video-stitcher.ts     # 视频拼接服务 (FFmpeg)
│   │   │   ├── character-sheet-generator.ts  # 角色三视图生成服务
│   │   │   ├── art-styles.ts         # 画风配置 (吉卜力/赛璐璐)
│   │   │   ├── factory.ts            # 服务工厂
│   │   │   └── types.ts              # 类型定义
│   │   ├── inngest/                  # Inngest 工作流
│   │   │   ├── client.ts
│   │   │   └── functions/            # 工作流函数 (待开发)
│   │   ├── db/                       # 数据库操作
│   │   │   ├── supabase/
│   │   │   │   ├── client.ts         # 浏览器客户端
│   │   │   │   ├── server.ts         # 服务端客户端
│   │   │   │   ├── types.ts          # 数据库类型定义
│   │   │   │   └── index.ts
│   │   │   ├── projects.ts           # 项目 CRUD
│   │   │   ├── scenes.ts             # 场景 CRUD
│   │   │   ├── characters.ts         # 角色 CRUD
│   │   │   ├── locations.ts          # 场景地点 CRUD
│   │   │   ├── storyboards.ts        # 分镜图库 CRUD
│   │   │   ├── tasks.ts              # 任务 CRUD
│   │   │   └── index.ts
│   │   └── utils.ts                  # 工具函数 (cn)
│   └── types/
│       └── index.ts                  # TypeScript 类型
├── supabase/
│   └── migrations/
│       └── 001_initial_schema.sql    # 数据库迁移脚本
├── public/                           # 静态资源
├── docs/
│   └── ai-anime-platform-architecture.md
├── CLAUDE.md                         # 本文件
├── .env.example                      # 环境变量模板
├── .env.local                        # 环境变量 (不提交)
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── next.config.ts
└── components.json                   # shadcn/ui 配置
```

## 数据库表结构

### users
- id, email, name, credits, created_at

### projects
- id, user_id, title, status, original_prompt, parsed_script, style_config, total_duration, final_video_url

### characters
- id, project_id, name, description, base_prompt, reference_images

### locations (场景地点表)
- id, project_id, name, description, base_prompt, time_of_day, weather, mood, reference_image_url, view_main_url, view_reverse_url, panorama_url, location_index, created_at, updated_at

### scenes
- id, project_id, scene_index, duration, shot_type, camera_movement, description, full_prompt, status, preview_image_url, video_url, user_approved, user_feedback, character_ids, location_id

### tasks
- id, project_id, scene_id, task_type, status, provider, external_task_id, input_params, output_result, error_message

### storyboards (分镜图库)
- id, project_id, scene_id, name, description, image_url, prompt, shot_type, camera_movement, art_style, aspect_ratio, tags, confirmed, metadata, created_at, updated_at

## 开发规范

### 代码风格
- 使用 TypeScript，严格类型检查
- 组件使用函数式组件 + Hooks
- 代码注释使用中文
- 文件命名使用 kebab-case

### Git 提交规范
- feat: 新功能
- fix: 修复
- docs: 文档
- refactor: 重构
- style: 样式调整

### API 规范
- RESTful 风格
- 统一返回格式: `{ success: boolean, data?: any, error?: string }`
- 错误处理使用 try-catch

## 环境变量

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# AI 服务 (中转站 - vectorengine.ai)
AI_API_BASE_URL=https://api.vectorengine.ai/v1
AI_API_KEY=                # 中转站 API Key
CLAUDE_MODEL=claude-sonnet-4-5-20250929  # Claude 模型
FLUX_MODEL=flux-pro-max    # Flux 模型
# Veo 3.1 视频生成使用中转站 API (veo3.1-fast)，无需额外配置

# MiniMax 官方 API (海螺视频生成)
MINIMAX_API_KEY=           # MiniMax 官方 API Key (https://platform.minimaxi.com/)

# ToApis (Sora2 视频生成备用)
TOAPIS_API_KEY=            # ToApis API Key (https://toapis.com)
TOAPIS_API_BASE_URL=https://toapis.com/v1

# Inngest
INNGEST_EVENT_KEY=
INNGEST_SIGNING_KEY=

# Cloudflare R2
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=
```

## 当前开发阶段

### Phase 1: MVP ✅ 已完成
目标: 跑通核心流程

- [x] 项目初始化 ✅ (2026-01-17)
  - Next.js 16 + React 19 + TypeScript
  - Tailwind CSS + shadcn/ui 组件库
  - 项目目录结构搭建完成

- [x] Supabase 数据库配置 ✅ (2026-01-17)
  - 数据库表结构设计 (5张表: users, projects, characters, scenes, tasks)
  - SQL 迁移脚本 (`supabase/migrations/001_initial_schema.sql`)
  - Supabase 客户端配置 (浏览器端 + 服务端)
  - 数据库操作层 CRUD 函数

- [x] 基础 UI 搭建 ✅ (2026-01-17)
  - 首页 Landing Page
  - 创建视频页面 (输入描述、选择风格/时长)
  - 项目列表页面 (项目卡片展示)
  - 项目详情页面 (分镜预览、审批、进度展示)
  - 通用组件 (Button, Card, Badge, Progress, Skeleton 等)

- [x] Claude API 集成 (剧本解析) ✅ (2026-01-17)
  - `lib/ai/providers/claude.ts` - Claude API 客户端
  - `lib/ai/script-parser.ts` - 剧本解析服务
  - 将用户输入转化为结构化分镜脚本 (ParsedScript)
  - 提取角色 (ParsedCharacter)、场景 (ParsedScene)、镜头信息
  - 支持 4 种风格: anime, ghibli, cyberpunk, slice_of_life

- [x] 单场景图像生成 ✅ (2026-01-17)
  - `lib/ai/providers/flux.ts` - Flux Pro API 客户端
  - `lib/ai/image-generator.ts` - 图像生成服务
  - `api/scenes/[sceneId]/generate-image` - 单场景图像生成
  - `api/projects/[id]/generate-images` - 批量生成项目预览图 (并行优化)
  - `api/scenes/[sceneId]/regenerate` - 根据反馈重新生成
  - 前端"生成预览图"按钮和加载状态

- [x] 单场景视频生成 ✅ (2026-01-17 ~ 2026-01-18)
  - `lib/ai/providers/veo.ts` - Veo 3.1 API 客户端 (主用)
  - `lib/ai/providers/sora.ts` - Sora-2 API 客户端 (备用)
  - `lib/ai/providers/kling.ts` - Kling API 客户端 (备用)
  - `lib/ai/video-generator.ts` - 视频生成服务
  - `api/scenes/[sceneId]/generate-video` - 单场景视频生成 API
  - 图生视频 (image-to-video) 功能，支持运动提示词
  - 前端"生成视频"按钮和加载状态
  - 视频播放器集成 (点击播放、自动隐藏时长标签)

- [x] 场景状态管理完善 ✅ (2026-01-18)
  - `api/scenes/[sceneId]/route.ts` - 场景 PATCH/DELETE API 实现
  - 支持 approve (确认)、reject (拒绝)、edit (编辑)、reset (重置) 操作
  - 视频生成失败状态 (video_failed) 处理和重试功能
  - 卡住状态 (generating_video) 的重置按钮
  - 数据库状态持久化

### Phase 2: 完整工作流 ✅ 已完成 (2026-01-18)

- [x] 完整的分镜编辑器 ✅
  - 场景描述编辑 (大文本框)
  - 镜头类型选择 (特写/中景/全景/远景)
  - 镜头运动选择 (静止/平移/推拉/跟随等)
  - 时长调整 (1-15秒)
  - 编辑弹窗模式 (点击描述或"修改"按钮打开)
  - 可选自动重新生成预览图
  - "清空"按钮快速重置表单

- [x] 场景管理功能 ✅
  - 场景插入 (卡片左右侧"+"按钮，悬停显示)
  - 场景删除 (卡片底部删除图标)
  - `api/scenes/route.ts` - POST 创建场景 API
  - 场景索引自动重排

- [x] 多场景批量生成 ✅
  - 批量生成预览图 (并行优化，大幅提升速度)
  - 批量生成视频 API (`api/projects/[id]/generate-videos`)
  - 进度查询 API (`api/projects/[id]/generate-videos/status`)
  - 前端进度追踪 (轮询 + 进度条)
  - 场景队列位置显示

- [x] 视频拼接 (FFmpeg) ✅
  - `lib/ai/video-stitcher.ts` - 视频拼接服务
  - `api/projects/[id]/stitch/route.ts` - 拼接 API (POST 启动, GET 状态)
  - FFmpeg concat demuxer 无损拼接
  - 最终视频保存到 `public/videos/`
  - 项目详情页最终视频播放器 + 下载按钮
  - 全屏播放 (原生 Fullscreen API)
  - 数据库 `final_video_url` 字段

- [x] 视频裁剪功能 ✅
  - `components/project/trim-dialog.tsx` - 裁剪弹窗组件
  - `api/scenes/[sceneId]/trim/route.ts` - 裁剪 API
  - 视频播放器 + 进度条拖动定位
  - 倍速选择 (0.1x/0.25x/0.5x/1x)
  - 标记起点/终点
  - 预览选中片段
  - 快捷键支持 (空格播放/暂停, ← → 微调0.1秒)
  - FFmpeg `-c copy` 快速裁剪

- [x] 项目管理优化 ✅
  - 项目删除功能 (列表页)
  - 项目卡片简化 (删除 + 查看详情)

### Phase 3: 角色管理与体验优化 ✅ 已完成 (2026-01-18 ~ 2026-01-19)

- [x] 角色生成与管理 ✅ (2026-01-18)
  - 角色确认页面 (`projects/[id]/characters`)
  - 角色立绘生成 (**Gemini 3 Pro**, 更符合描述)
  - 角色下载功能
  - 角色重新生成功能
  - 角色局部重绘 (Gemini 3 Pro Inpainting)
    - Canvas 画笔绘制 mask
    - 自定义重绘提示词
    - 实时预览和更新

- [x] 全局角色库 ✅ (2026-01-18)
  - `/characters` 角色库页面
  - 项目筛选下拉框
  - 角色卡片 (立绘、名称、描述、所属项目)
  - 角色复用功能 (复制到其他项目)
  - 角色删除功能
  - 角色预览查看 (大图弹窗)
  - 角色信息编辑 (名称、描述)
  - 顶部导航入口
  - **删除项目后角色保留** (project_id 设为 NULL，显示"独立角色")
  - 数据库迁移: `003_keep_characters_on_project_delete.sql`

- [x] 角色一致性优化 ✅ (2026-01-18 ~ 2026-01-19)
  - scenes 表新增 `character_ids` 字段 (存储场景关联的角色名称)
  - Claude 解析分镜时自动提取每个场景的角色列表
  - 图片生成时注入角色立绘作为参考图
  - Flux API 支持 `reference_images` 参数
  - **Gemini 带参考图生成** (`generateImageWithReference`)
    - 自动注入角色立绘作为参考图
    - 保持角色外观一致性（发型、发色、服装等）
  - 单场景/批量/重新生成均支持参考图注入
  - 数据库迁移脚本: `002_add_character_ids_to_scenes.sql`

- [x] 从角色库导入角色 ✅ (2026-01-19)
  - 角色确认页面新增"从角色库添加"入口
  - 角色库选择弹窗 (多选、预览、来源项目显示)
  - 角色列表分组显示:
    - **已有立绘的角色** (绿色标记) - 从角色库导入或已生成
    - **需要生成立绘的角色** (橙色标记) - AI 新提取的角色
  - 同名角色检测 (已存在的角色不可重复导入)
  - 支持复制立绘到新项目

- [x] 图像生成增强 ✅ (2026-01-19)
  - 模型选择下拉框: **Flux Pro** / **Banana (Gemini)**
  - 比例选择下拉框: **16:9** (横版) / **9:16** (竖版)
  - Gemini 模型自动使用角色立绘作为参考图
  - 单场景/批量生成 API 均支持 model 和 aspectRatio 参数
  - **默认模型改为 Gemini**（角色一致性更好）
  - **修复 Gemini 比例参数**：使用枚举值格式 `LANDSCAPE_16_9` / `PORTRAIT_9_16`
  - 提示词中同时添加比例说明作为备用保障

- [x] 角色匹配优化 ✅ (2026-01-19)
  - **修复角色名称模糊匹配问题**
    - 场景 `character_ids` 存储简称（如 "美咲"）
    - 角色库存储全名（如 "舞台女星·美咲"）
    - 改用包含关系匹配：`name.includes(sceneName) || sceneName.includes(name)`
  - 批量生成、单场景生成、重新生成 API 均已修复
  - 添加调试日志输出角色匹配信息

- [x] 分镜图预览功能 ✅ (2026-01-19)
  - 点击预览图打开大图弹窗
  - 悬停时显示放大图标提示
  - 下载按钮（支持 base64 图片）
  - 底部信息栏（场景序号、描述、时长）
  - 关闭按钮

- [x] Bug 修复 ✅ (2026-01-19)
  - **修复重试按钮一直转圈问题**
    - `handleRegenerateScene` 函数现在正确处理 API 响应
    - 成功时更新预览图和状态
    - 失败时更新状态为 `image_failed`

- [x] 角色立绘优化 ✅ (2026-01-19)
  - **修复立绘图片上有乱码文字的问题**
    - 优化 AI 提示词，明确禁止生成任何文字、水印、签名、标签
    - 提示词添加 `DO NOT add ANY text, words, letters, numbers, watermarks, signatures, or labels`
  - **前端渲染角色名称标签**（避免 AI 生成的乱码）
    - 角色确认页面：角色卡片立绘底部显示名称
    - 全局角色库：角色卡片立绘底部显示名称
    - 角色库选择弹窗：角色卡片立绘底部显示名称
    - 使用 CSS 渐变遮罩 + 白色文字，效果美观
  - 角色立绘使用竖版 9:16 比例

### Phase 4: 场景地点与视频生成增强 ✅ 已完成 (2026-01-20)

- [x] 场景地点管理功能 (Locations) ✅
  - **新增 `locations` 表**，独立存储场景/地点信息
  - Claude 解析时自动提取场景地点 (`ParsedLocation`)
  - 场景确认页面 (`/projects/[id]/locations`)
    - 场景卡片：左侧空景预览，右侧编辑表单
    - 编辑字段：名称、描述、时间、天气、氛围
    - 生成空景参考图按钮 (Gemini, 16:9)
    - 预览弹窗、下载功能
  - 项目详情页**按场景分组显示镜头**
    - 分组视图开关
    - 场景标题 + 空景缩略图 + 下属镜头
    - 未分配场景的镜头单独显示
  - 镜头编辑弹窗支持**选择所属场景**
    - 场景下拉选择框
    - 选中场景时显示空景预览
  - 新项目流程: `parsing → script_pending → locations_pending → characters_pending → storyboard_ready`
  - 数据库迁移: `004_add_locations_table.sql`
  - API 路由:
    - `GET/POST /api/locations` - 场景列表/创建
    - `GET/PATCH/DELETE /api/locations/[id]` - 单个场景 CRUD
    - `POST /api/locations/[id]/generate-background` - 生成场景图
    - `GET /api/projects/[id]/locations` - 获取项目的场景列表

- [x] 视频生成增强 ✅
  - **视频模型选择下拉框**
    - Veo 3.1 Fast (默认，快速)
    - Veo 3.1 (高质量)
    - Sora 2
    - Kling
    - 海螺 (中转站 API)
    - MiniMax 海螺 2.3 (官方 API)
    - MiniMax 海螺 2.3 Fast (官方 API)
  - **UI 布局优化**：图片生成和视频生成按钮分成两行
    - 图片生成行：模型选择、比例选择、生成预览图按钮
    - 视频生成行：模型选择、批量生成视频按钮、合成完整视频按钮
  - **单场景视频重新生成按钮**
    - 在"视频已生成"旁显示刷新按钮
    - 可重新生成不满意的视频

- [x] Bug 修复与优化 ✅
  - **修复轮询状态回退问题**
    - 已有视频的场景强制保持 `completed` 状态
    - 防止网络延迟导致状态错误回退到 `generating_video`
  - **修复项目重复创建问题**
    - 添加 ref 锁防止双重提交
    - 即使 React StrictMode 导致双重渲染也不会重复调用 API
  - **修正创建成功后跳转路径**
    - 从 `/characters` 改为 `/locations`（场景确认页）

### Phase 4.5: 角色与场景一致性系统 ✅ 已完成 (2026-01-20 ~ 2026-01-21)

- [x] 角色设计稿系统 ✅
  - **数据库**
    - `005_character_multi_view_assets.sql` - characters 表新增 `assets` JSONB 字段
    - 存储结构: `{ sheet_url, front, generated_at }`
  - **角色设计稿生成服务** (`lib/ai/character-sheet-generator.ts`)
    - 使用 Gemini 生成完整角色设计稿（16:9）
    - **四视图**: 正面 (FRONT)、左侧 (LEFT PROFILE)、背面 (BACK)、右侧 (RIGHT PROFILE)
    - **色板**: 6-8 个颜色方块，从参考图提取（发色、肤色、眼色、服装色等）
    - **细节放大**: 面部/眼睛、头发、上衣、裤子/裙子、鞋子、配饰
    - 全英文标注，禁止中日韩文字
  - **API 路由**
    - `POST /api/characters/[id]/generate-sheet` - 生成角色设计稿
    - `PATCH /api/characters/[id]` - 支持更新 assets 字段
  - **前端更新**
    - 角色确认页面支持设计稿生成/预览/下载
    - 重新生成前确认提示（"重新生成将覆盖当前的设计稿，确定继续吗？"）
    - 删除立绘功能（仅删除图片，保留角色信息）

- [x] 角色卡片 UI 优化 ✅
  - **布局调整**: 左侧表单（名称、描述），右侧立绘框
  - **呼吸灯动画** (`globals.css`)
    - 黑白呼吸边框 (`animate-breathing-border`)
    - 光晕背景 (`animate-breathing-glow`)
    - 图标呼吸 (`animate-breathing-icon`)
    - 浮动小星星 (`animate-sparkle-float-1/2/3/4`)
    - 彩色手指图标浮动 (`animate-finger-float`)
  - **交互优化**
    - 悬停时边框变实线，背景变色
    - 已填写描述才启用生成按钮
    - 生成中显示加载状态
  - **操作按钮**: 重新生成、局部重绘、下载、删除立绘

- [x] 场景卡片 UI 优化 ✅
  - **布局调整**: 上下结构（上方表单，下方场景图）
  - **场景图**: 21:9 CinemaScope 比例 (`aspect-[21/9]`)
  - **呼吸灯动画**: 与角色卡片一致的动画效果
  - **操作按钮**: 重新生成、下载、删除场景图
  - **删除场景图功能**: 仅删除图片，保留场景信息
  - **简化视角切换**: 移除多视角按钮，只显示单张 21:9 全景图

- [x] 空景生成系统 ✅ (2026-01-20 ~ 2026-01-21)
  - locations 表新增 `view_main_url`, `view_reverse_url`, `panorama_url` 字段
  - 数据库迁移: `006_location_dual_view.sql`
  - **21:9 CinemaScope 单次直出方案** (彻底解决光照不一致):
    - 使用 Gemini/Imagen 3 的 21:9 宽幅比例 (`CINEMATIC_21_9`)
    - Master Plate Panorama 提示词格式
    - 单次生成确保全局光照一致（阴影方向、色温统一）
    - 足够宽，支持 Pan (平移) 运镜
  - 图片处理服务: `lib/ai/image-stitcher.ts` (Sharp 库，备用)
  - **设计决策**: 放弃 Outpainting 的原因：
    - Outpainting 无法保证左右两边的全局光照一致
    - 即使 Prompt 继承所有环境变量、使用 Bleed Trick，AI 仍会"脑补"不同光照
    - 单次生成永远优于分次修补
  - 向后兼容: 保留 `reference_image_url` 字段

- [x] Gemini 客户端 ECONNRESET 重试机制 ✅ (2026-01-21)
  - 问题: 响应状态 200 但读取响应体时连接被重置
  - 解决方案: `generateImageWithFullRetry()` 方法
    - 捕获 ECONNRESET / terminated 错误
    - 自动重试整个请求（最多 3 次）
    - 重试间隔递增 (3s, 6s, 9s)
  - 影响范围: `generateImage()`, `generateImageWithReference()`

- [x] 分镜图生成带场景图参考 ✅ (2026-01-21)
  - **问题**: 分镜图生成时只传角色立绘，没有传场景空景图
  - **解决方案**: 修改图像生成服务和 API，获取并传递场景图
  - **修改文件**:
    - `lib/ai/image-generator.ts` - 新增 `locationImage` 和 `locationName` 参数
    - `lib/ai/providers/gemini.ts` - `generateImageWithReference` 支持场景图标签 (`BACKGROUND:`)
    - `api/scenes/[sceneId]/generate-image/route.ts` - 获取 scene.location_id 关联的空景图
    - `api/projects/[id]/generate-images/route.ts` - 批量生成时获取所有 location 并构建映射
    - `api/scenes/[sceneId]/regenerate/route.ts` - 重新生成时也带上场景图
  - **提示词优化**:
    - 场景图放在参考图列表最前面，标签为 `BACKGROUND: 场景名`
    - 角色立绘标签为 `CHARACTER: 角色名`
    - 有场景图时强调使用场景图作为背景环境，保持光照一致
  - **优先级**: panorama_url > view_main_url > reference_image_url

- [ ] 2.5D 合成系统 (待开发)
  - 深度层级计算（前景/中景/背景）
  - Mask 生成
  - Flux Fill 合成

### Phase 4.6: Zapiwala 剧本格式 ✅ 已完成 (2026-01-24)

- [x] Zapiwala 格式实现 ✅
  - **核心改动**: 完全替换旧的剧本解析格式，采用 Zapiwala 标准
  - **Multi-Cut 结构**: 一个场景包含 3-5 个镜头 (Cuts)，不再是 1:1 对应
  - **Inline Character Descriptions**: 每次角色出场/说话都内联外貌+情绪描述
  - **Audio Layering**: 每个场景必须包含 BGM、SFX、Pacing
  - **Dialogue Order Lock**: 对话顺序锁，防止 AI 生成乱序
  - **数据库迁移**: `008_zapiwala_format.sql`
    - scenes 表新增: `bgm`, `sfx`, `pacing`, `cuts` (JSONB), `dialogue_order_lock`
    - characters 表新增: `inline_look` (简洁外貌标签)
  - **类型定义更新**:
    - `ParsedCut`: 单个镜头结构
    - `ParsedScene`: 包含 cuts 数组和音频层
    - `ParsedCharacter`: 新增 `inlineLook` 字段
  - **Claude System Prompt**: 全新 Zapiwala 格式指导
  - **Prompt 构建函数**:
    - `buildCutImagePrompt()`: 为单个 Cut 生成图像提示词
    - `buildSceneVideoPrompt()`: 为整个场景生成 Zapiwala 格式视频提示词
    - `buildCutVideoPrompt()`: 为单个 Cut 生成视频运镜提示词
    - `generateZapiwalaPrompt()`: 生成完整 Zapiwala 格式文本（调试/导出用）

- [x] Zapiwala 格式数据结构 ✅
  ```typescript
  // 单个镜头 Cut
  interface ParsedCut {
    cutIndex: number;
    cameraAngle: string;        // Close-up, Medium shot, Wide shot, etc.
    visualDescription: string;  // 英文视觉描述
    character?: {
      name: string;
      look: string;             // 外貌标签: "rugged, black jacket"
      emotion: string;          // 情绪: angry, sad, happy
      dialogue: string;         // 对白
      cameraFocus: string;      // 镜头焦点
      lipSyncAction: string;    // 口型动作
    };
  }

  // 场景（Zapiwala 格式）
  interface ParsedScene {
    sceneIndex: number;
    locationId: string;
    bgm: string;                // 背景音乐描述
    sfx: string;                // 音效描述
    pacing: string;             // 节奏: "~9s, rapid cuts"
    cuts: ParsedCut[];          // 3-5 个镜头
    dialogueOrderLock: string[]; // 对话顺序锁
    duration: number;           // 从 pacing 解析
    description: string;        // 中文场景概述
    characterIds: string[];     // 出场角色
  }
  ```

- [x] 前端 Zapiwala 展示 ✅
  - 场景卡片显示 cuts 数量（如 "3 个镜头"）
  - 音频图标提示: 🎵 (BGM)、🔊 (SFX)、💬 (对话锁)
  - 悬停显示完整音频描述

### Phase 4.7: 画风系统重构 ✅ 已完成 (2026-01-25)

- [x] 集中式画风配置 ✅
  - **新建 `lib/ai/art-styles.ts`** - 集中管理所有画风的 Positive/Negative Prompts
  - **仅保留两种精心打磨的画风**:
    - **吉卜力 (Ghibli)**: 温暖治愈的手绘动画风格，柔和自然光线，粉彩色调，水彩质感，怀旧氛围
    - **赛璐璐 (Cel Animation)**: 经典 80 年代剧场版动画质感，手绘线条，平涂硬边阴影，限制色彩，胶片颗粒感
  - **类型定义**:
    ```typescript
    export type ArtStyleId = "ghibli" | "cel";

    export interface ArtStyleConfig {
      id: ArtStyleId;
      name: string;         // 中文名
      nameEn: string;       // 英文名
      description: string;  // 描述
      character: { positive: string; negative: string; };  // 角色立绘
      scene: { positive: string; negative: string; };      // 分镜图
      background: { positive: string; negative: string; }; // 场景空景
    }
    ```
  - **辅助函数**:
    - `getArtStyle(styleId)`: 获取画风配置
    - `getArtStyleOptions()`: 获取 UI 下拉框选项
    - `buildCharacterPrompt()`: 构建角色立绘提示词
    - `buildSceneImagePrompt()`: 构建分镜图提示词
    - `buildBackgroundPrompt()`: 构建空景图提示词

- [x] 所有图像生成 API 统一使用新画风配置 ✅
  - **角色立绘生成** (`api/characters/[id]/generate-portrait/route.ts`)
    - 使用 `artStyle.character.positive/negative`
    - 移除旧的 `STYLE_ENHANCERS` 常量
  - **角色设计稿生成** (`lib/ai/character-sheet-generator.ts`)
    - 使用 `artStyle.character.positive/negative`
    - 参数改为 `styleId: ArtStyleId | string`
  - **分镜图生成** (`lib/ai/image-generator.ts`)
    - 使用 `artStyle.scene.positive/negative`
    - `buildImagePrompt()` 返回 `{ positive, negative }` 对象
    - 移除旧的 `QUALITY_PROMPT`, `NEGATIVE_PROMPT`
  - **场景空景生成** (`api/locations/[id]/generate-background/route.ts`)
    - 使用 `artStyle.background.positive/negative`
    - 移除旧的 `STYLE_ENHANCERS`

- [x] 创建项目页面 UI 更新 ✅
  - **风格选项简化**: 从 4 种减少到 2 种 (吉卜力 / 赛璐璐)
  - **默认风格**: 从 `anime` 改为 `ghibli`
  - **动态获取选项**: 使用 `getArtStyleOptions()` 而非硬编码
  - **显示描述**: 下拉框选项显示画风描述 (如 "吉卜力 - 温暖治愈的手绘风格...")

### Phase 4.8: 分镜图库 (Storyboard Library) ✅ 已完成 (2026-01-25)

- [x] 分镜图库功能 ✅
  - **参考角色库模式**，创建独立的分镜图资产库
  - 分镜图可独立于项目/场景存在（删除后保留）
  - 支持跨项目复用
  - **数据库迁移**: `010_add_storyboards_table.sql`
    - `storyboards` 表结构：id, project_id, scene_id, name, description, image_url, prompt, shot_type, camera_movement, art_style, aspect_ratio, tags, confirmed, metadata
    - `ON DELETE SET NULL` 保留分镜图
    - 索引优化 (project_id, confirmed, created_at)
    - 自动更新 updated_at 触发器
  - **数据库操作层**: `src/lib/db/storyboards.ts`
    - `createStoryboard()` - 创建分镜图
    - `getStoryboard()` - 获取单个分镜图
    - `getAllStoryboards(projectId?, onlyConfirmed?)` - 获取分镜图列表
    - `updateStoryboard()` - 更新分镜图
    - `deleteStoryboard()` - 删除分镜图
    - `confirmStoryboard()` - 确认分镜图
    - `isSceneInStoryboardLibrary()` - 检查场景是否已存入库
    - `saveSceneToStoryboard()` - 保存场景到分镜库
  - **API 路由**:
    - `GET /api/storyboards` - 获取分镜图列表（支持 projectId 筛选）
    - `POST /api/storyboards` - 创建分镜图（支持从场景保存）
    - `GET /api/storyboards/[id]` - 获取单个分镜图
    - `PATCH /api/storyboards/[id]` - 更新分镜图
    - `DELETE /api/storyboards/[id]` - 删除分镜图

- [x] 分镜图库页面 ✅
  - **页面路径**: `/storyboards`
  - 网格展示分镜图卡片（响应式布局）
  - 项目筛选下拉框
  - 空状态提示
  - **分镜图卡片功能**:
    - 预览图 + 名称 + 描述
    - 来源项目标签（或"独立分镜"）
    - 悬停显示操作按钮
  - **预览弹窗**:
    - 大图展示
    - 详细信息（名称、描述、镜头类型、运镜、画风、比例）
    - 提示词展示
    - 标签显示
  - **操作功能**:
    - 下载分镜图（支持 base64 图片）
    - 删除分镜图（带确认提示）
    - 复用到其他项目（待扩展）

- [x] 项目详情页集成 ✅
  - **场景卡片新增"保存到分镜库"按钮** (FolderPlus 图标)
  - 仅有预览图的场景可保存
  - 保存时自动填充：名称、描述、镜头类型、运镜、比例、元数据
  - 保存成功提示

- [x] 导航入口 ✅
  - 顶部导航栏新增"分镜库"入口 (LayoutGrid 图标)
  - 导航顺序：创建 → 我的项目 → 角色库 → 分镜库

### Phase 4.9: 稳定性与体验优化 ✅ 已完成 (2026-02-02)

- [x] 剧本预览页优化 ✅
  - **简化场景地点编辑**: 移除时间、天气、氛围字段，只保留名称和描述
  - **角色描述纯中文**: 修复角色描述显示英文问题，不再拼接 appearance 字段

- [x] Gemini API 超时与重试机制优化 ✅
  - **API 路由超时配置**: 所有图片生成相关 API 添加 `maxDuration = 300`（5 分钟）
    - `characters/[id]/generate-portrait` - 角色立绘生成
    - `characters/[id]/generate-sheet` - 角色设计稿生成
    - `characters/[id]/inpaint` - 角色局部重绘
    - `locations/[id]/generate-background` - 场景空景生成
    - `scenes/[sceneId]/generate-image` - 单场景分镜图生成
    - `scenes/[sceneId]/regenerate` - 分镜图重新生成
    - `projects/[id]/generate-images` - 批量生成分镜图
  - **Gemini 客户端重试机制**:
    - `generateImageWithFullRetry()`: 响应体读取重试，最大 2 次
    - `fetchWithRetry()`: 连接重试，最大 3 次，支持 ECONNRESET/ConnectTimeout 错误
    - 单次请求超时: 3 分钟
    - 重试间隔: 指数退避 (5s, 10s, 15s)
  - **统一重试机制**: `editImage()` 方法也改用 `generateImageWithFullRetry()`

- [x] 布局居中优化 ✅
  - **Dashboard 布局**: 添加 `mx-auto px-4` 使内容居中
  - **Header 导航**: 添加 `mx-auto px-4` 使 Logo 和导航与内容对齐

### Phase 4.10: 多路线 API 集成 ✅ 已完成 (2026-02-03)

- [x] 三条 API 路线架构 ✅
  - **路线1 (VectorEngine)**: 主中转站，支持 Gemini 图片、Veo/Sora/Kling/海螺视频
  - **路线2 (SillyDream/NewAPI)**: 备用中转站，支持 Gemini 图片、Sora 视频
  - **路线3 (ToApis)**: 第三方 API，支持 Gemini 图片、Sora 视频
  - **自动容灾**: 一条路线失败可切换其他路线

- [x] ToApis Sora 视频生成 ✅
  - **客户端**: `lib/ai/providers/toapis-sora.ts`
  - **模型**: `sora-2`, `sora-2-pro`, `sora-2-vip`
  - **API 端点**: `POST /v1/videos/generations`, `GET /v1/videos/generations/{id}`
  - **特点**: 不支持 base64 图片，需要先上传到 OSS

- [x] SillyDream Sora 视频生成 ✅
  - **客户端**: `lib/ai/providers/sillydream-sora.ts`
  - **模型**: `sora-2`, `sora-2-pro`
  - **API 端点**: 兼容 OpenAI 格式

- [x] SillyDream Gemini 图片生成 ✅
  - **客户端**: `lib/ai/providers/sillydream-gemini.ts`
  - **模型**: `gemini-2.0-flash-exp-image-generation`
  - **支持**: 纯文字生成、带参考图生成

- [x] ToApis Gemini 图片生成 ✅
  - **客户端**: `lib/ai/providers/toapis-gemini.ts`
  - **模型**: `gemini-3-pro-image-preview` (Nano banana2)
  - **API 端点**: `POST /v1/images/generations`, `GET /v1/images/generations/{id}`
  - **支持比例**: 1:1, 2:3, 3:2, 3:4, 4:3, 4:5, 5:4, 9:16, 16:9, 21:9
  - **特点**: 异步任务，需轮询；不支持 base64，需 OSS 上传

- [x] 阿里云 OSS 图片存储 ✅
  - **客户端**: `lib/storage/aliyun-oss.ts`
  - **功能**: 将 base64 图片上传到 OSS，获取公开访问 URL
  - **用途**: ToApis API 不支持 base64，需要先上传获取 URL
  - **实现**: 使用 REST API + HMAC-SHA1 签名，无额外依赖
  - **环境变量**: `ALIYUN_OSS_REGION`, `ALIYUN_OSS_ACCESS_KEY_ID`, `ALIYUN_OSS_ACCESS_KEY_SECRET`, `ALIYUN_OSS_BUCKET`

- [x] 前端模型选择 UI ✅
  - **图像模型下拉框**:
    - 路线1 Gemini (VectorEngine)
    - 路线2 Gemini (SillyDream)
    - 路线3 Gemini (ToApis)
  - **视频模型下拉框**:
    - 路线1: Veo 3.1 Fast, Veo 3.1, Sora 2, Kling, 海螺, MiniMax 海螺
    - 路线2: Sora 2, Sora 2 Pro (SillyDream)
    - 路线3: Sora 2, Sora 2 Pro, Sora 2 VIP (ToApis)

- [x] 视频生成服务统一 ✅
  - **文件**: `lib/ai/video-generator.ts`
  - **自动判断**: 根据 videoModel 参数选择对应的客户端
  - **Base64 处理**: ToApis 路线自动上传到 OSS
  - **统一接口**: `generateSceneVideo()`, `regenerateSceneVideo()`

- [x] 图像生成服务统一 ✅
  - **文件**: `lib/ai/image-generator.ts`
  - **模型类型**: `flux`, `gemini`, `sillydream-gemini`, `toapis-gemini`
  - **参考图处理**: ToApis 路线自动上传 base64 到 OSS
  - **统一接口**: `generateSceneImage()`, `regenerateSceneImage()`

### Phase 4.11: 流程重构与 API 配置优化 ✅ 已完成 (2026-03-29)

- [x] 用户流程简化：locations 后台化 ✅
  - **改前流程**: `script → locations → characters → 分镜页`（4步）
  - **改后流程**: `script → characters → 分镜页`（3步）
  - **locations 后台异步生成**：`generate-title-characters` API 返回响应后，用 `Promise.resolve().then()` 在后台静默生成 locations，不阻塞用户
  - **状态机变化**:
    - 改前: `title_characters_pending → locations_pending → characters_pending → storyboard_ready`
    - 改后: `title_characters_pending → characters_pending → storyboard_ready`
  - **修改文件**:
    - `script/page.tsx` - 跳转目标从 `/locations` 改为 `/characters`，状态改为 `characters_pending`
    - `generate-title-characters/route.ts` - 生成角色后后台异步触发 locations 生成
    - `generate-locations/route.ts` - 放宽状态检查，移除成功后自动更新状态
    - `characters/page.tsx` - `handleConfirmAndContinue` 改为调用 `generate-scenes` API 再跳转
    - `generate-scenes/route.ts` - 放宽状态检查，允许从 `characters_pending` 触发
    - `projects/[id]/page.tsx` - 移除 `locations_pending` 跳转，保留 `characters_pending` 跳转
    - `step-indicator.tsx` - 更新为 3 步流程：标题与角色 → 角色立绘 → 分镜预览

- [x] Gemini API 认证方式修复 ✅
  - **问题**: 中转站使用 `Authorization: Bearer` header，但代码只传 `?key=` query 参数导致 401
  - **修复**: 同时传 `Authorization: Bearer ${apiKey}` header 和 `?key=` query 参数（两者均为必需）
  - **环境变量独立化**: Gemini 客户端新增专用环境变量，优先级高于通用 AI_API_KEY
    - `GEMINI_API_BASE_URL` - Gemini API 基础地址
    - `GEMINI_API_KEY` - Gemini API Key
    - `GEMINI_MODEL` - Gemini 模型名称（默认 `gemini-3-pro-image-preview`）
  - **向后兼容**: 未配置专用变量时回退到 `AI_API_KEY` / `AI_API_BASE_URL`

### Phase 4.12: UI/UX 体验优化 ✅ 已完成 (2026-03-30)

- [x] 角色页面中英文描述分离 ✅
  - **问题**: 角色描述直接显示英文，对中文用户不友好
  - **方案**: 中文描述与英文生图提示词职责分离
    - 中文描述（用户可读）锁定显示，点击"修改"弹窗编辑
    - 确认后自动调用 Claude 生成英文 base_prompt
    - 英文外观描述可折叠展示，支持弹窗编辑
  - **新增 API**: `POST /api/characters/[id]/regenerate-prompt` - 中文描述转英文生图提示词
  - **弹窗交互**: 修改/取消/确认三态，防止误操作

- [x] 步骤指示器统一 ✅
  - **问题**: script、characters、project detail 三页进度条不统一
  - **方案**: 统一使用 `StepIndicator` 组件，固定 3 步流程
    - 步骤1: 标题与角色（script 页固定显示）
    - 步骤2: 角色立绘（characters 页固定显示）
    - 步骤3: 分镜预览（project detail 页）
  - 已完成步骤支持点击跳转（href 属性）
  - script 页当前步骤固定为 `title_characters_pending`，不随项目状态变化

- [x] 交互细节优化 ✅
  - 移除"保存成功"打断式 alert 提示
  - 移除 script 页"跳过，直接到场景设定"按钮
  - 修复文本溢出边框问题（`break-words overflow-hidden min-w-0`）
  - 角色描述/外观描述弹窗均加入"取消"按钮

- [x] 场景管理完整 CRUD ✅
  - 分镜页"场景管理"弹窗支持新增/编辑/删除场景地点
  - `LocationEditCard` 组件支持删除按钮
  - 场景地点变更后分镜图可重新生成

### Phase 4.13: 运镜词典与视频提示词增强 ✅ 已完成 (2026-03-30)

- [x] 专业运镜词典 ✅
  - **新建 `lib/ai/camera-movements.ts`** - 集中管理运镜语言体系
  - **词典分类**:
    - 方向运动: Pan Left/Right, Tilt Up/Down, Roll
    - 动态推拉: Push In, Pull Out, Zoom In/Out
    - 情绪镜头: Whip Pan, Crash Zoom, Dutch Angle
    - 特殊场景: Aerial, Underwater, Handheld, Steadicam
    - 景别: Extreme Close-up, Close-up, Medium, Wide, Extreme Wide
    - 技法: Rack Focus, Split Diopter, Lens Flare
    - 角度: Low Angle, High Angle, Bird's Eye, Worm's Eye, POV
  - **辅助函数**:
    - `getCameraDescription(cameraAngle)`: 统一查找运镜描述
    - `generateCameraReferenceForClaude()`: 生成精简 prompt 参考供 Claude 使用
    - `generateCameraMovementPromptReference()`: 生成完整运镜参考文档
  - **集成**: `script-parser.ts` system prompt 引用运镜参考，`video-generator.ts` 使用统一查找函数

- [x] 视频提示词优化 ✅
  - `buildVideoPrompt()` 支持 Zapiwala cuts 结构
  - 每个 Cut 的 `visualDescription` 注入视频提示词
  - 多格分镜图时添加布局描述（`buildPanelLayoutDescription`）
  - 回退链: cuts → camera_movement_prompt → camera_movement

### Phase 4.14: 角色服装一致性修复 ✅ 已完成 (2026-03-30)

- [x] 分镜图生成服装漂移问题修复 ✅
  - **根因**: `buildCutImagePrompt()` 在有参考图时仍将 `cut.character.look`（外貌文字）注入提示词，与参考图竞争导致服装变化
  - **修复**:
    - `image-generator.ts` 的 `buildCutImagePrompt()` 新增 `hasReferenceImages` 参数
    - 有参考图时只写角色名 + 情绪，外观完全由参考图决定
    - `buildImagePrompt()` 透传 `hasReferenceImages` 标志
    - `generateSceneImage()` 提前判断 `willHaveReferenceImages`，在构建提示词前传入
    - `script-parser.ts` 的 `buildCutImagePrompt()` / `buildScenePrompt()` 同步修复
  - **效果**: Gemini 的 `CHARACTER APPEARANCE LOCK` 指令不再被文字描述干扰，服装一致性显著提升

### Phase 4.15: Veo 视频生成集成 ✅ 已完成 (2026-03-30)

- [x] Veo API 客户端实现 ✅
  - **文件**: `lib/ai/providers/veo.ts`（替换原空壳 `vidu.ts`）
  - **端点**:
    - 提交: `POST /v1/video/create`
    - 查询: `GET /v1/video/query?id={task_id}`
  - **请求参数**: `model`, `prompt`, `images`(URL数组), `enhance_prompt`, `enable_upsample`, `aspect_ratio`
  - **轮询机制**: 5 秒间隔，最多 10 分钟，支持状态: `prompt_enhancement_checking → image_downloading → video_generating → completed/failed`
  - **响应解析**: 优先取顶层 `video_url`（超分后），回退 `detail.upsample_video_url` → `detail.video_url`
  - **错误信息**: 从 `detail.video_generation_error` / `detail.error_message` 读取
  - **环境变量**:
    - `VEO_API_BASE_URL` - API 基础地址（默认 `https://api.vectorengine.ai`）
    - `VEO_API_KEY` - API Key（回退到 `AI_API_KEY`）
    - `VEO_MODEL` - 模型名称（默认 `veo_3_1-fast`）

- [x] Base64 → OSS 自动转换 ✅
  - **问题**: Veo API 只接受公开 HTTP URL，Gemini 生成的分镜图是 base64
  - **方案**: `veo.ts` 的 `submitTask()` 自动检测 base64，上传到阿里云 OSS 后再传 URL
  - **OSS 客户端**: `lib/storage/aliyun-oss.ts`（REST API + HMAC-SHA1 签名，无额外依赖）
  - **上传目录**: `veo-inputs/`

- [x] 视频生成服务简化 ✅
  - `video-generator.ts` 统一使用 `veoClient`，移除多提供商切换逻辑
  - 前端视频模型下拉框简化为单一选项 `Veo 3.1 Fast (veo_3_1-fast)`
  - `aspect_ratio` 自动判断：`veo3*` 或 `veo_3*` 前缀的模型才传此参数

### Phase 5: 高级功能 (下一步)

**优先级高：**
- [ ] 用户认证 (Supabase Auth)
  - 登录/注册页面
  - 用户会话管理
  - 路由保护
  - 用户数据隔离

- [ ] 音频生成
  - BGM 生成 (Suno API)
  - 音效生成
  - 配音/旁白 (ElevenLabs)
  - 音视频合成

**优先级中：**
- [ ] 实时进度显示 (Supabase Realtime)
  - 视频生成进度实时推送
  - 无需轮询

- [ ] Inngest 任务编排
  - 异步任务队列
  - 任务状态追踪
  - 失败自动重试
  - 任务优先级管理

- [ ] 用户额度管理
  - 积分系统
  - API 调用计费
  - 充值功能

**优先级低：**
- [ ] 项目历史记录
- [ ] 多语言支持
- [ ] 分享功能

## 重要注意事项

1. **三路线 API 架构**: 支持多个 API 提供商，实现高可用性和容灾
   - **路线1 (VectorEngine)**: 主中转站 vectorengine.ai
     - 图片: Gemini (`gemini`)
     - 视频: Veo 3.1, Sora 2, Kling, 海螺
     - 环境变量: `AI_API_BASE_URL`, `AI_API_KEY`
   - **路线2 (SillyDream/NewAPI)**: 备用中转站 api.sillydream.com
     - 图片: Gemini (`sillydream-gemini`)
     - 视频: Sora 2 (`sillydream-sora-2`, `sillydream-sora-2-pro`)
     - 环境变量: `SILLYDREAM_API_KEY`, `SILLYDREAM_API_BASE_URL`
   - **路线3 (ToApis)**: 第三方 API toapis.com
     - 图片: Gemini (`toapis-gemini`)
     - 视频: Sora 2 (`toapis-sora-2`, `toapis-sora-2-pro`, `toapis-sora-2-vip`)
     - 环境变量: `TOAPIS_API_KEY`, `TOAPIS_API_BASE_URL`
     - **注意**: 不支持 base64 图片，需要先上传到阿里云 OSS
   - **阿里云 OSS**: 用于 ToApis 等不支持 base64 的 API
     - 环境变量: `ALIYUN_OSS_REGION`, `ALIYUN_OSS_ACCESS_KEY_ID`, `ALIYUN_OSS_ACCESS_KEY_SECRET`, `ALIYUN_OSS_BUCKET`

2. **视频生成**: 当前使用 Veo API (vectorengine.ai 中转站)
   - **当前模型**: `veo_3_1-fast`（默认，唯一选项）
   - **端点**: `POST /v1/video/create` 提交，`GET /v1/video/query?id=` 轮询
   - **环境变量**:
     - `VEO_API_BASE_URL` - API 基础地址（默认 `https://api.vectorengine.ai`）
     - `VEO_API_KEY` - API Key（回退到 `AI_API_KEY`）
     - `VEO_MODEL` - 模型名称（默认 `veo_3_1-fast`）
   - **Base64 处理**: 分镜图是 base64，自动上传到阿里云 OSS 后再传 URL 给 Veo
   - **轮询状态**: `prompt_enhancement_checking → image_downloading → video_generating → completed/failed`
   - **状态轮询间隔**: 5 秒，超时 10 分钟
   - **注意**: 中转站偶发 429 限流（`当前分组上游负载已饱和`），稍等几分钟重试即可

3. **图片生成**: 支持多路线 Gemini
   - **路线1**: `gemini` - VectorEngine Gemini 3 Pro
   - **路线2**: `sillydream-gemini` - SillyDream Gemini 2.0 Flash
   - **路线3**: `toapis-gemini` - ToApis Gemini 3 Pro (Nano banana2)
   - ToApis 特点: 异步任务需轮询，不支持 base64 需 OSS 上传

4. **Gemini 图片生成/编辑详解**: 使用 Gemini 3 Pro 进行图片生成和局部重绘
   - API: `POST /v1beta/models/gemini-3-pro-image-preview:generateContent`
   - **纯文字生成** (`generateImage`): 文字提示词 → 图片
   - **带参考图生成** (`generateImageWithReference`):
     - 输入: 文字提示词 + 参考图列表 (角色立绘 + 场景空景图) + 比例 + hasLocationImage
     - 参考图标签: `BACKGROUND: 场景名` (场景图) / `CHARACTER: 角色名` (角色立绘)
     - 场景图放在参考图列表最前面，用于保持背景一致性
     - 角色立绘用于保持角色外观一致性
     - 有场景图时提示词强调使用场景作为背景、保持光照一致
   - **局部重绘** (`editImage`): 原图 + mask (白色=重绘区域) + 提示词
   - 输出: base64 格式图片 (data:image/png;base64,...)
   - **重试机制**: `generateImageWithFullRetry()` 处理 ECONNRESET
     - 捕获响应体读取失败错误
     - 自动重试整个请求（最多 2 次）
     - 连接重试（最多 3 次），支持 ConnectTimeout 错误
     - 单次请求超时 3 分钟，API 路由超时 5 分钟
   - **比例参数格式** (generationConfig.aspectRatio):
     - `16:9` → `LANDSCAPE_16_9`
     - `9:16` → `PORTRAIT_9_16`
     - `1:1` → `SQUARE_1_1`
     - `21:9` → `CINEMATIC_21_9` (场景空景图使用)
     - `3:4` → `PORTRAIT_3_4`
     - `4:3` → `LANDSCAPE_4_3`
   - 提示词中也会添加比例说明作为备用保障
5. **FFmpeg 配置**: 视频拼接和裁剪依赖本地 FFmpeg
   - 默认路径: `D:\GeneralSoftware\ffmpeg\ffmpeg-8.0.1-essentials_build\bin\ffmpeg.exe`
   - 可通过环境变量 `FFMPEG_PATH` 和 `FFPROBE_PATH` 自定义
6. **异步任务**: 视频生成耗时约 2-5 分钟，后续需使用 Inngest 异步处理
7. **角色一致性**: 已实现多种方案
   - scenes 表的 `character_ids` 存储场景关联的角色名称列表
   - **角色名称模糊匹配**: 支持简称与全名的包含关系匹配
     - 例如: "美咲" 可匹配 "舞台女星·美咲"
   - **Flux 方案**: 生成图片时注入 `reference_images` 参数
   - **Gemini 方案** (推荐，已设为默认): 使用 `generateImageWithReference`
     - 将角色立绘作为参考图输入
     - 提示词明确要求保持角色外观一致
     - 效果更好，角色特征保持更准确
   - 项目详情页可选择图像模型: 路线1/2/3 Gemini
8. **成本控制**: 每次 API 调用需记录，方便后续计费
9. **项目创建流程**:
   - `parsing` → `title_characters_pending` → `characters_pending` → `storyboard_ready` → `generating` → `completed`
   - 创建项目后先跳转到剧本预览页 (`/script`)
   - 剧本确认后跳转到角色确认页 (`/characters`)，**locations 在后台异步生成，不阻塞用户**
   - 角色确认后触发 `generate-scenes`，跳转到分镜预览页
   - `/locations` 页面仍可访问（用于手动调整场景地点），但不再是必经步骤
10. **场景地点管理**:
    - 独立的 `locations` 表存储场景信息（如"咖啡厅内景"、"街道"等）
    - 每个场景可生成"空景参考图"（无人物，纯环境）
    - 项目详情页支持按场景分组显示镜头
    - 镜头编辑时可选择所属场景
    - **空景生成采用 16:9 横版比例**：
      - 使用 Gemini/Imagen 3 的 `16:9` 比例
      - 单次生成确保全局光照一致
      - 与视频输出比例一致
11. **角色设计稿系统**:
    - 先生成正面立绘 → 用户确认满意 → 生成完整设计稿
    - 设计稿内容：四视图（正/左/背/右）+ 色板 + 细节放大
    - 色板必须从参考图提取，不能随机生成
    - 细节放大包括：面部、头发、上衣、裤子、鞋子、配饰
    - 全英文标注，避免 AI 生成乱码文字
    - 重新生成会覆盖当前设计稿，需要用户确认
12. **运镜词典** (`lib/ai/camera-movements.ts`):
    - 集中管理专业运镜语言，供 Claude 生成分镜和视频提示词使用
    - `getCameraDescription(cameraAngle)`: 统一查找运镜描述
    - `generateCameraReferenceForClaude()`: 生成精简参考供 Claude system prompt 使用
    - 运镜信息包含在每个 Cut 的 `cameraAngle` 中，视频生成时通过词典映射为专业描述

13. **Zapiwala 剧本格式** (新增):
    - **核心理念**: Multi-Cut + Inline Character Descriptions + Audio Layering + Dialogue Lock
    - **文件位置**: `lib/ai/script-parser.ts`
    - **场景结构**: 一个 ParsedScene 包含 3-5 个 ParsedCut
    - **音频层**: 每个场景必须有 bgm、sfx、pacing
    - **角色一致性规则**:
      - 每次角色出现必须内联外貌标签 (inlineLook)
      - 格式: `Name (look; emotion): "Dialogue" (camera focus; lip-sync)`
      - 例如: `美咲 (blue-haired girl, sailor uniform; peaceful): "你好" (camera on face; soft sync)`
    - **对话顺序锁**: `dialogueOrderLock` 数组确保 AI 按正确顺序生成对话
    - **Prompt 构建**:
      - 图像: `buildCutImagePrompt()` 或 `buildScenePrompt()`
      - 视频: `buildVideoPrompt()` 自动检测 cuts 结构，生成 Zapiwala 格式
    - **向后兼容**: 无 cuts 的旧数据仍可使用 camera_movement 字段

14. **画风系统** (2026-01-25 重构):
    - **配置文件**: `lib/ai/art-styles.ts`
    - **仅支持两种画风**:
      - `ghibli` (吉卜力): 温暖治愈手绘风，水彩质感，怀旧氛围
      - `cel` (赛璐璐): 80年代剧场版动画风，平涂硬边阴影，胶片颗粒感
    - **每种画风分三套提示词**:
      - `character`: 角色立绘和设计稿
      - `scene`: 分镜图
      - `background`: 场景空景图
    - **API 调用方式**:
      ```typescript
      import { getArtStyle, type ArtStyleId } from "@/lib/ai/art-styles";

      const artStyle = getArtStyle("ghibli");
      // 使用 artStyle.character.positive / artStyle.character.negative
      // 使用 artStyle.scene.positive / artStyle.scene.negative
      // 使用 artStyle.background.positive / artStyle.background.negative
      ```
    - **项目创建时选择画风**: 存储在 `projects.style_config.artStyle`
    - **图像生成时获取画风**: 优先使用请求参数 `style`，否则从项目配置读取

15. **分镜图库** (2026-01-25 新增):
    - **参考角色库模式**: 独立的 `storyboards` 表存储分镜图资产
    - **数据持久化**: project_id 和 scene_id 均为 `ON DELETE SET NULL`，项目/场景删除后分镜图保留
    - **保存到分镜库**: 在项目详情页的场景卡片上点击 FolderPlus 图标
    - **分镜库页面**: `/storyboards`，支持按项目筛选、预览大图、下载、删除
    - **跨项目复用**: 已保存的分镜图可用于其他项目参考（待扩展完整复用功能）
    - **API 路由**:
      - `GET/POST /api/storyboards` - 列表/创建
      - `GET/PATCH/DELETE /api/storyboards/[id]` - 单个分镜图 CRUD

## 数据库迁移脚本

按顺序执行：
1. `001_initial_schema.sql` - 初始表结构 (users, projects, characters, scenes, tasks)
2. `002_add_character_ids_to_scenes.sql` - scenes 表添加 character_ids 字段 (角色一致性)
3. `003_keep_characters_on_project_delete.sql` - 删除项目时保留角色 (ON DELETE SET NULL)
4. `004_add_locations_table.sql` - 新增 locations 表 + scenes 表添加 location_id 字段
5. `005_character_multi_view_assets.sql` - characters 表添加 assets 字段 (多视角立绘)
6. `006_location_dual_view.sql` - locations 表添加双视角字段 (view_main_url, view_reverse_url, panorama_url)
7. `007_add_camera_movement_prompt.sql` - scenes 表添加 camera_movement_prompt 字段 (专业运镜描述)
8. `008_zapiwala_format.sql` - Zapiwala 格式支持 (scenes: bgm, sfx, pacing, cuts, dialogue_order_lock; characters: inline_look)
9. `009_add_character_confirmed.sql` - characters 表添加 confirmed 字段 (角色库筛选)
10. `010_add_storyboards_table.sql` - 新增 storyboards 表 (分镜图库)

## 已知问题

1. 中转站 API 偶尔会出现负载过高的情况（429），稍等几分钟重试即可
2. Gemini 客户端会自动重试 3 次（ECONNRESET / ConnectTimeout）
3. Veo 视频生成失败后需要手动点击重试按钮
4. 图片批量生成已优化为并行，但 API 可能有并发限制
5. Gemini 图片生成偶尔出现 ECONNRESET（响应 200 但读取 body 时断开），已添加完整重试机制
6. Gemini/Imagen 3 支持的比例: 1:1, 3:4, 4:3, 9:16, 16:9, 21:9
7. Veo 生成的分镜图（base64）会自动上传到阿里云 OSS 后再传给 Veo API

## 待优化项

1. **场景与分镜时间一致性** (暂缓)
   - 问题: Location 设置"中午"，但分镜描述里可能写"夕阳西下"
   - 方案 A (推荐): 分镜图生成时，从所属 Location 读取 time_of_day/weather/mood 覆盖
   - 方案 B: 用 AI 重写分镜描述
   - 方案 C: 脚本解析时不在分镜里写时间天气

2. **Veo 429 限流自动重试** (待实现)
   - 当前遇到限流直接报错，需要用户手动重试
   - 方案: submitTask 检测到 429 后等待 30 秒自动重试一次
