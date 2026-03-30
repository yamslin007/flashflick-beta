-- 008_zapiwala_format.sql
-- Zapiwala 格式支持：scenes 表新增 Multi-Cut 结构和音频层字段

-- 新增 Zapiwala 音频层字段
ALTER TABLE scenes
ADD COLUMN IF NOT EXISTS bgm TEXT,
ADD COLUMN IF NOT EXISTS sfx TEXT,
ADD COLUMN IF NOT EXISTS pacing TEXT;

-- 新增 cuts 字段 (JSONB 数组，存储多个 Cut)
-- 结构: [{ cutIndex, cameraAngle, visualDescription, character?: { name, look, emotion, dialogue, cameraFocus, lipSyncAction } }]
ALTER TABLE scenes
ADD COLUMN IF NOT EXISTS cuts JSONB DEFAULT '[]'::jsonb;

-- 新增对话顺序锁字段 (字符串数组)
ALTER TABLE scenes
ADD COLUMN IF NOT EXISTS dialogue_order_lock TEXT[] DEFAULT '{}';

-- 为 characters 表添加 inline_look 字段 (简洁的外貌标签)
ALTER TABLE characters
ADD COLUMN IF NOT EXISTS inline_look TEXT;

-- 添加注释说明字段用途
COMMENT ON COLUMN scenes.bgm IS 'Zapiwala: 背景音乐描述，如 "tense violin, soft piano"';
COMMENT ON COLUMN scenes.sfx IS 'Zapiwala: 音效描述，如 "rain hitting glass, distant sirens"';
COMMENT ON COLUMN scenes.pacing IS 'Zapiwala: 节奏描述，如 "~9s, rapid cuts"';
COMMENT ON COLUMN scenes.cuts IS 'Zapiwala: Multi-Cut 结构，JSONB 数组，每个元素包含 cutIndex, cameraAngle, visualDescription, character 等';
COMMENT ON COLUMN scenes.dialogue_order_lock IS 'Zapiwala: 对话顺序锁，确保 AI 生成对话顺序正确';
COMMENT ON COLUMN characters.inline_look IS 'Zapiwala: 简洁的外貌标签，用于内联描述，如 "blue-haired girl, sailor uniform"';
