-- 新增场景地点管理表
-- 在 Supabase SQL Editor 中执行此脚本

-- ============================================
-- 场景地点表 (Locations)
-- ============================================
CREATE TABLE locations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,              -- 场景名称，如"东京屋顶·黄昏"
    description TEXT,                         -- 场景详细描述（中文）
    base_prompt TEXT,                         -- 用于生成场景图的英文 Prompt
    time_of_day VARCHAR(50),                  -- 时间：morning, noon, afternoon, evening, night
    weather VARCHAR(50),                      -- 天气：clear, cloudy, rainy, snowy
    mood VARCHAR(50),                         -- 氛围：peaceful, tense, romantic, mysterious 等
    reference_image_url TEXT,                 -- 空景参考图 URL (base64 或 URL)
    location_index INTEGER NOT NULL DEFAULT 0, -- 场景顺序
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 为 scenes 表添加 location_id 字段
-- ============================================
ALTER TABLE scenes
ADD COLUMN IF NOT EXISTS location_id UUID REFERENCES locations(id) ON DELETE SET NULL;

-- ============================================
-- 索引
-- ============================================
CREATE INDEX idx_locations_project ON locations(project_id);
CREATE INDEX idx_locations_index ON locations(project_id, location_index);
CREATE INDEX idx_scenes_location ON scenes(location_id);

-- ============================================
-- 自动更新 updated_at 触发器
-- ============================================
CREATE TRIGGER update_locations_updated_at
    BEFORE UPDATE ON locations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- RLS (行级安全) 策略
-- ============================================
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;

-- 场景地点策略 (通过 project 关联)
CREATE POLICY "Users can manage locations" ON locations
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM projects
            WHERE projects.id = locations.project_id
            AND projects.user_id = auth.uid()
        )
    );

-- ============================================
-- 添加注释
-- ============================================
COMMENT ON TABLE locations IS '场景地点表，存储视频中出现的不同环境/地点';
COMMENT ON COLUMN locations.name IS '场景名称，用于显示';
COMMENT ON COLUMN locations.description IS '场景的详细描述（中文）';
COMMENT ON COLUMN locations.base_prompt IS '用于生成场景图的英文 Prompt（纯环境，无人物）';
COMMENT ON COLUMN locations.time_of_day IS '时间：morning, noon, afternoon, evening, night';
COMMENT ON COLUMN locations.weather IS '天气：clear, cloudy, rainy, snowy';
COMMENT ON COLUMN locations.mood IS '氛围：peaceful, tense, romantic, mysterious 等';
COMMENT ON COLUMN locations.reference_image_url IS '空景参考图（无人物，纯环境）';
COMMENT ON COLUMN locations.location_index IS '场景在项目中的顺序';
COMMENT ON COLUMN scenes.location_id IS '关联的场景地点 ID';
