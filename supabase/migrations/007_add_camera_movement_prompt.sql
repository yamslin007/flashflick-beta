-- 007: 添加 camera_movement_prompt 字段到 scenes 表
-- 用于存储专业运镜描述，供 AI 视频生成时使用

-- 添加 camera_movement_prompt 字段
ALTER TABLE scenes
ADD COLUMN IF NOT EXISTS camera_movement_prompt TEXT;

-- 添加注释
COMMENT ON COLUMN scenes.camera_movement_prompt IS '用于 AI 视频生成的英文运镜描述，如 "Camera slowly pushes in toward subject"';
