-- AI 动漫视频生成平台 - 初始数据库结构
-- 在 Supabase SQL Editor 中执行此脚本

-- 启用 UUID 扩展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 用户表
-- ============================================
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255),
    credits INTEGER DEFAULT 100,  -- 初始赠送 100 积分
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 项目表
-- ============================================
CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255),
    status VARCHAR(50) DEFAULT 'draft',
    -- 状态: draft, parsing, storyboarding, storyboard_ready, generating_images, images_ready, images_partial, user_review, generating, stitching, completed, failed
    original_prompt TEXT,  -- 用户原始输入
    parsed_script JSONB,   -- 解析后的结构化剧本
    style_config JSONB,    -- 风格配置
    total_duration INTEGER DEFAULT 60,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 角色表
-- ============================================
CREATE TABLE characters (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    name VARCHAR(255),
    description TEXT,
    base_prompt TEXT,      -- 角色基础 Prompt
    reference_images JSONB, -- 参考图片 URLs
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 场景/分镜表
-- ============================================
CREATE TABLE scenes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    scene_index INTEGER NOT NULL,  -- 场景顺序
    duration INTEGER DEFAULT 10,   -- 秒数
    shot_type VARCHAR(50),         -- close_up, medium_shot, wide_shot
    camera_movement VARCHAR(50),   -- static, pan, zoom
    description TEXT,
    full_prompt TEXT,              -- 完整生成 Prompt
    status VARCHAR(50) DEFAULT 'pending',
    -- 状态: pending, generating_image, image_ready, user_review, generating_video, completed, failed, rejected
    preview_image_url TEXT,
    video_url TEXT,
    user_approved BOOLEAN DEFAULT FALSE,
    user_feedback TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 任务表 (追踪每个 AI 调用)
-- ============================================
CREATE TABLE tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    scene_id UUID REFERENCES scenes(id) ON DELETE SET NULL,
    task_type VARCHAR(50) NOT NULL,
    -- 类型: parse_script, generate_character_ref, generate_storyboard, generate_video, generate_bgm, generate_sfx, generate_voice, stitch_video
    status VARCHAR(50) DEFAULT 'pending',
    -- 状态: pending, processing, completed, failed
    provider VARCHAR(50),   -- flux, kling, runway, suno, elevenlabs
    external_task_id TEXT,  -- 外部 API 返回的任务 ID
    input_params JSONB,
    output_result JSONB,
    error_message TEXT,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 索引
-- ============================================
CREATE INDEX idx_projects_user ON projects(user_id);
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_characters_project ON characters(project_id);
CREATE INDEX idx_scenes_project ON scenes(project_id);
CREATE INDEX idx_scenes_status ON scenes(status);
CREATE INDEX idx_tasks_project ON tasks(project_id);
CREATE INDEX idx_tasks_scene ON tasks(scene_id);
CREATE INDEX idx_tasks_status ON tasks(status);

-- ============================================
-- 自动更新 updated_at 触发器
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_projects_updated_at
    BEFORE UPDATE ON projects
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- RLS (行级安全) 策略
-- ============================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE characters ENABLE ROW LEVEL SECURITY;
ALTER TABLE scenes ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- 用户只能访问自己的数据
CREATE POLICY "Users can view own data" ON users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own data" ON users
    FOR UPDATE USING (auth.uid() = id);

-- 项目策略
CREATE POLICY "Users can view own projects" ON projects
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own projects" ON projects
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own projects" ON projects
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own projects" ON projects
    FOR DELETE USING (auth.uid() = user_id);

-- 角色策略 (通过 project 关联)
CREATE POLICY "Users can manage characters" ON characters
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM projects
            WHERE projects.id = characters.project_id
            AND projects.user_id = auth.uid()
        )
    );

-- 场景策略 (通过 project 关联)
CREATE POLICY "Users can manage scenes" ON scenes
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM projects
            WHERE projects.id = scenes.project_id
            AND projects.user_id = auth.uid()
        )
    );

-- 任务策略 (通过 project 关联)
CREATE POLICY "Users can view own tasks" ON tasks
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM projects
            WHERE projects.id = tasks.project_id
            AND projects.user_id = auth.uid()
        )
    );

-- Service Role 可以访问所有数据（用于后端 API）
-- 注意：使用 service_role key 时会绕过 RLS
