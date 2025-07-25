-- AI小说创作平台数据库设计
-- 用于记录和分析生成内容

-- 1. 创作会话表（记录每次创作的完整流程）
CREATE TABLE creation_sessions (
    id SERIAL PRIMARY KEY,
    session_id VARCHAR(50) UNIQUE NOT NULL,
    user_ip VARCHAR(45),
    user_agent TEXT,
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    status VARCHAR(20) DEFAULT 'in_progress', -- in_progress, completed, abandoned
    total_duration_ms INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. 脑洞记录表
CREATE TABLE novel_ideas (
    id SERIAL PRIMARY KEY,
    session_id VARCHAR(50) REFERENCES creation_sessions(session_id),
    idea_number INTEGER,
    genre VARCHAR(100),
    title VARCHAR(200),
    content TEXT,
    tags TEXT[],
    user_suggestions TEXT,
    selected BOOLEAN DEFAULT FALSE,
    generation_time_ms INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. 大纲记录表
CREATE TABLE novel_outlines (
    id SERIAL PRIMARY KEY,
    session_id VARCHAR(50) REFERENCES creation_sessions(session_id),
    idea_id INTEGER REFERENCES novel_ideas(id),
    outline_data JSONB, -- 存储完整的起承转合结构
    synopsis TEXT,
    user_suggestions TEXT,
    generation_time_ms INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. 小说正文表
CREATE TABLE novels (
    id SERIAL PRIMARY KEY,
    session_id VARCHAR(50) REFERENCES creation_sessions(session_id),
    outline_id INTEGER REFERENCES novel_outlines(id),
    title VARCHAR(200),
    content TEXT,
    word_count INTEGER,
    chapters INTEGER,
    user_suggestions TEXT,
    generation_time_ms INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. 互动脚本表
CREATE TABLE interactive_scripts (
    id SERIAL PRIMARY KEY,
    session_id VARCHAR(50) REFERENCES creation_sessions(session_id),
    novel_id INTEGER REFERENCES novels(id),
    content TEXT,
    scene_count INTEGER,
    character_count INTEGER,
    user_suggestions TEXT,
    generation_time_ms INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6. API调用日志表（详细记录每次调用）
CREATE TABLE api_logs (
    id SERIAL PRIMARY KEY,
    session_id VARCHAR(50),
    endpoint VARCHAR(200),
    request_data JSONB,
    response_data JSONB,
    status_code INTEGER,
    error_message TEXT,
    duration_ms INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 7. 用户反馈表（可选）
CREATE TABLE user_feedback (
    id SERIAL PRIMARY KEY,
    session_id VARCHAR(50),
    feedback_type VARCHAR(50), -- like, dislike, report
    feedback_target VARCHAR(50), -- idea, outline, novel, script
    target_id INTEGER,
    comment TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 创建索引以提高查询性能
CREATE INDEX idx_sessions_status ON creation_sessions(status);
CREATE INDEX idx_sessions_created ON creation_sessions(created_at);
CREATE INDEX idx_ideas_session ON novel_ideas(session_id);
CREATE INDEX idx_ideas_selected ON novel_ideas(selected);
CREATE INDEX idx_api_logs_session ON api_logs(session_id);
CREATE INDEX idx_api_logs_created ON api_logs(created_at);

-- 实用的视图

-- 1. 创作成功率统计
CREATE VIEW creation_success_rate AS
SELECT 
    DATE(started_at) as date,
    COUNT(*) as total_sessions,
    COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
    COUNT(CASE WHEN status = 'abandoned' THEN 1 END) as abandoned,
    ROUND(COUNT(CASE WHEN status = 'completed' THEN 1 END)::numeric / COUNT(*) * 100, 2) as success_rate
FROM creation_sessions
GROUP BY DATE(started_at)
ORDER BY date DESC;

-- 2. 内容生成统计
CREATE VIEW content_statistics AS
SELECT 
    DATE(n.created_at) as date,
    COUNT(DISTINCT ni.session_id) as unique_sessions,
    COUNT(ni.id) as total_ideas,
    COUNT(no.id) as total_outlines,
    COUNT(n.id) as total_novels,
    COUNT(s.id) as total_scripts,
    AVG(n.word_count) as avg_novel_length
FROM novels n
LEFT JOIN novel_ideas ni ON ni.session_id = n.session_id
LEFT JOIN novel_outlines no ON no.session_id = n.session_id
LEFT JOIN interactive_scripts s ON s.session_id = n.session_id
GROUP BY DATE(n.created_at);

-- 3. 性能监控视图
CREATE VIEW performance_metrics AS
SELECT 
    DATE(created_at) as date,
    endpoint,
    COUNT(*) as call_count,
    AVG(duration_ms) as avg_duration,
    MIN(duration_ms) as min_duration,
    MAX(duration_ms) as max_duration,
    PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY duration_ms) as p95_duration,
    COUNT(CASE WHEN status_code != 200 THEN 1 END) as error_count
FROM api_logs
GROUP BY DATE(created_at), endpoint;

-- 4. 用户路径分析
CREATE VIEW user_journey AS
SELECT 
    session_id,
    MAX(CASE WHEN idea_generated THEN 1 ELSE 0 END) as reached_ideas,
    MAX(CASE WHEN outline_generated THEN 1 ELSE 0 END) as reached_outline,
    MAX(CASE WHEN novel_generated THEN 1 ELSE 0 END) as reached_novel,
    MAX(CASE WHEN script_generated THEN 1 ELSE 0 END) as reached_script,
    CASE 
        WHEN script_generated THEN 'completed'
        WHEN novel_generated THEN 'abandoned_at_novel'
        WHEN outline_generated THEN 'abandoned_at_outline'
        WHEN idea_generated THEN 'abandoned_at_ideas'
        ELSE 'abandoned_at_start'
    END as journey_status
FROM (
    SELECT 
        cs.session_id,
        EXISTS(SELECT 1 FROM novel_ideas WHERE session_id = cs.session_id) as idea_generated,
        EXISTS(SELECT 1 FROM novel_outlines WHERE session_id = cs.session_id) as outline_generated,
        EXISTS(SELECT 1 FROM novels WHERE session_id = cs.session_id) as novel_generated,
        EXISTS(SELECT 1 FROM interactive_scripts WHERE session_id = cs.session_id) as script_generated
    FROM creation_sessions cs
) as journey_data;

-- 实用查询示例

-- 查看今天的生成内容
/*
SELECT 
    ni.title as idea_title,
    ni.genre,
    n.title as novel_title,
    n.word_count,
    cs.total_duration_ms / 1000.0 as total_seconds
FROM creation_sessions cs
LEFT JOIN novel_ideas ni ON ni.session_id = cs.session_id AND ni.selected = true
LEFT JOIN novels n ON n.session_id = cs.session_id
WHERE DATE(cs.created_at) = CURRENT_DATE
ORDER BY cs.created_at DESC;
*/

-- 查看最受欢迎的题材
/*
SELECT 
    genre,
    COUNT(*) as count,
    COUNT(CASE WHEN selected THEN 1 END) as selected_count,
    ROUND(COUNT(CASE WHEN selected THEN 1 END)::numeric / COUNT(*) * 100, 2) as selection_rate
FROM novel_ideas
WHERE genre IS NOT NULL
GROUP BY genre
ORDER BY count DESC
LIMIT 10;
*/