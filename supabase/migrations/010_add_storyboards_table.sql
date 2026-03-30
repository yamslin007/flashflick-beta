-- 010: 添加分镜图库表
-- 用于存储和复用已确认的分镜图资产

-- 创建分镜图库表
CREATE TABLE storyboards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES projects(id) ON DELETE SET NULL,  -- 项目删除后保留
    scene_id UUID REFERENCES scenes(id) ON DELETE SET NULL,      -- 原场景删除后保留
    name VARCHAR(255),                    -- 分镜名称（如 "咖啡厅相遇"）
    description TEXT,                     -- 分镜描述
    image_url TEXT NOT NULL,              -- 分镜图 URL
    prompt TEXT,                          -- 生成此图的提示词
    shot_type VARCHAR(50),                -- 镜头类型
    camera_movement VARCHAR(50),          -- 镜头运动
    art_style VARCHAR(50),                -- 画风
    aspect_ratio VARCHAR(10),             -- 比例 (16:9 / 9:16)
    tags TEXT[],                          -- 标签（用于搜索）
    confirmed BOOLEAN DEFAULT FALSE,      -- 是否已确认（只有确认后才显示在库中）
    metadata JSONB,                       -- 其他元数据（如角色ID列表、场景地点等）
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建索引
CREATE INDEX idx_storyboards_project ON storyboards(project_id);
CREATE INDEX idx_storyboards_scene ON storyboards(scene_id);
CREATE INDEX idx_storyboards_confirmed ON storyboards(confirmed);
CREATE INDEX idx_storyboards_art_style ON storyboards(art_style);

-- 添加更新时间触发器
CREATE TRIGGER update_storyboards_updated_at
    BEFORE UPDATE ON storyboards
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 启用 RLS
ALTER TABLE storyboards ENABLE ROW LEVEL SECURITY;

-- 分镜图策略 (通过 project 关联，或独立分镜可被所有人访问)
CREATE POLICY "Users can manage storyboards" ON storyboards
    FOR ALL USING (
        project_id IS NULL OR  -- 独立分镜（项目已删除）
        EXISTS (
            SELECT 1 FROM projects
            WHERE projects.id = storyboards.project_id
            AND projects.user_id = auth.uid()
        )
    );

-- 添加注释
COMMENT ON TABLE storyboards IS '分镜图库 - 存储已确认的分镜图资产，支持跨项目复用';
COMMENT ON COLUMN storyboards.confirmed IS '是否已被用户确认，只有确认后才显示在分镜库';
COMMENT ON COLUMN storyboards.metadata IS '元数据，如 {"character_ids": [...], "location_id": "..."}';
