-- 011: 自定义画风表
-- 用户可以创建自己的画风，预设画风（ghibli, cel）保留在代码中不变
-- 简化设计：用户只需填写一组通用画风提示词，系统根据用途自动补充后缀

-- 先删除旧表（如果存在）以确保干净的状态
DROP TABLE IF EXISTS custom_art_styles CASCADE;

-- 创建自定义画风表
CREATE TABLE custom_art_styles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- 基础信息
    name VARCHAR(100) NOT NULL,              -- 画风名称（中文）
    name_en VARCHAR(100),                    -- 画风名称（英文，可选）
    description TEXT,                        -- 画风描述

    -- 基于的预设画风（可选，用于快速创建）
    base_preset VARCHAR(50),                 -- 'ghibli' | 'cel' | null

    -- 通用画风提示词（用户只需填这两个）
    positive_prompt TEXT NOT NULL,           -- 正向提示词（画风特征）
    negative_prompt TEXT NOT NULL,           -- 负向提示词（需要避免的元素）

    -- 预览图（可选，用于展示画风效果）
    preview_image_url TEXT,

    -- 元数据
    is_public BOOLEAN DEFAULT FALSE,         -- 是否公开（未来可支持社区分享）
    usage_count INTEGER DEFAULT 0,           -- 使用次数统计

    -- 时间戳
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_custom_art_styles_created_at ON custom_art_styles(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_custom_art_styles_is_public ON custom_art_styles(is_public) WHERE is_public = TRUE;
CREATE INDEX IF NOT EXISTS idx_custom_art_styles_base_preset ON custom_art_styles(base_preset);

-- 自动更新 updated_at
CREATE OR REPLACE FUNCTION update_custom_art_styles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_custom_art_styles_updated_at
    BEFORE UPDATE ON custom_art_styles
    FOR EACH ROW
    EXECUTE FUNCTION update_custom_art_styles_updated_at();

-- 添加注释
COMMENT ON TABLE custom_art_styles IS '用户自定义画风配置表';
COMMENT ON COLUMN custom_art_styles.base_preset IS '基于的预设画风ID，用于快速复制预设作为起点';
COMMENT ON COLUMN custom_art_styles.positive_prompt IS '画风正向提示词，描述画风特征';
COMMENT ON COLUMN custom_art_styles.negative_prompt IS '画风负向提示词，需要避免的元素';
