-- 005_character_multi_view_assets.sql
-- 角色多视角立绘系统 - 新增 assets JSONB 字段

-- ============================================
-- 1. characters 表新增 assets 字段
-- ============================================

-- 添加 assets 字段存储多视角立绘
-- 结构示例:
-- {
--   "sheet_url": "https://...",           -- 原始 3:1 三视图完整图
--   "front": "https://...",               -- 正面视角 (1:1 裁切)
--   "side": "https://...",                -- 侧面视角 (面向右)
--   "back": "https://...",                -- 背面视角
--   "generated_at": "2026-01-20T...",     -- 生成时间
--   "legacy": false                        -- 是否为旧版单图
-- }
ALTER TABLE characters ADD COLUMN IF NOT EXISTS assets JSONB DEFAULT '{}';

-- 创建索引以支持 JSONB 查询
CREATE INDEX IF NOT EXISTS idx_characters_assets ON characters USING GIN (assets);

-- ============================================
-- 2. 迁移现有数据
-- ============================================

-- 将现有的 reference_images 迁移到 assets.front
-- 标记为 legacy 以便后续提示用户重新生成三视图
UPDATE characters
SET assets = jsonb_build_object(
  'front', COALESCE(reference_images->0, null),
  'legacy', true,
  'migrated_at', NOW()
)
WHERE reference_images IS NOT NULL
  AND jsonb_array_length(reference_images) > 0
  AND (assets IS NULL OR assets = '{}');

-- ============================================
-- 3. 注释文档
-- ============================================

COMMENT ON COLUMN characters.assets IS '角色多视角立绘资源，包含正面(front)、侧面(side)、背面(back)三个视角的图片URL';
