-- 迁移脚本：为 projects 表添加 target_chain 字段
-- 如果字段已存在，此脚本会安全地跳过

-- 检查并添加 target_chain 字段 后期可以复用 到其他表的其他字段
DO $$
BEGIN
    -- 检查字段是否已存在
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'projects' 
        AND column_name = 'target_chain'
    ) THEN
        -- 添加 target_chain 字段
        ALTER TABLE projects 
        ADD COLUMN target_chain JSONB NOT NULL DEFAULT '[]'::jsonb;
        
        RAISE NOTICE 'Successfully added target_chain column to projects table';
    ELSE
        RAISE NOTICE 'target_chain column already exists, skipping';
    END IF;
END $$;

-- windows 下使用powershell 执行命令：
-- Get-Content alter-table.sql | docker exec -i datamix-postgres psql -U postgres -d datamix

