-- 为 scenes 表添加 character_ids 字段
-- 用于存储场景中出现的角色 ID 列表，支持角色一致性优化

-- 添加 character_ids 字段 (JSONB 数组格式，存储角色名称)
ALTER TABLE scenes
ADD COLUMN IF NOT EXISTS character_ids JSONB DEFAULT '[]'::jsonb;

-- 添加注释
COMMENT ON COLUMN scenes.character_ids IS '场景中出现的角色名称列表，用于关联角色立绘实现一致性';

-- 创建索引以支持角色查询
CREATE INDEX IF NOT EXISTS idx_scenes_character_ids ON scenes USING GIN (character_ids);
