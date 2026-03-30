-- 修改 characters 表的外键约束
-- 删除项目时保留角色（project_id 设为 NULL）

-- 1. 删除原有外键约束
ALTER TABLE characters
DROP CONSTRAINT IF EXISTS characters_project_id_fkey;

-- 2. 允许 project_id 为 NULL
ALTER TABLE characters
ALTER COLUMN project_id DROP NOT NULL;

-- 3. 重新添加外键约束，使用 ON DELETE SET NULL
ALTER TABLE characters
ADD CONSTRAINT characters_project_id_fkey
FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL;

-- 添加注释
COMMENT ON COLUMN characters.project_id IS '所属项目 ID，删除项目后为 NULL（角色保留在角色库）';
