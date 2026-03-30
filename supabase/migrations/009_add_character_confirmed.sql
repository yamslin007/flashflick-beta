-- 009: 添加角色确认状态字段
-- 只有用户确认后的角色才会显示在角色库中

-- 添加 confirmed 字段，默认为 false
ALTER TABLE characters ADD COLUMN IF NOT EXISTS confirmed BOOLEAN DEFAULT FALSE;

-- 将现有角色设为已确认（向后兼容）
UPDATE characters SET confirmed = TRUE WHERE confirmed IS NULL OR confirmed = FALSE;

-- 添加注释
COMMENT ON COLUMN characters.confirmed IS '角色是否已被用户确认，只有确认后才显示在角色库';
