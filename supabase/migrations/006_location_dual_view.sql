-- 场景双机位系统
-- 为 locations 表添加主视角和反向视角字段，支持 32:9 全景拼接

-- ============================================
-- 添加双视角字段
-- ============================================
ALTER TABLE locations
ADD COLUMN IF NOT EXISTS view_main_url TEXT,        -- 主视角图片 (16:9)
ADD COLUMN IF NOT EXISTS view_reverse_url TEXT,     -- 反向视角图片 (16:9)
ADD COLUMN IF NOT EXISTS panorama_url TEXT;         -- 拼接后的全景图 (32:9)

-- ============================================
-- 添加注释
-- ============================================
COMMENT ON COLUMN locations.view_main_url IS '主视角空景图 (16:9)，从正面拍摄的场景';
COMMENT ON COLUMN locations.view_reverse_url IS '反向视角空景图 (16:9)，从反方向拍摄的场景';
COMMENT ON COLUMN locations.panorama_url IS '拼接后的全景图 (32:9)，由两个视角横向拼接而成';
