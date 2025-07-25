-- 增强版数据库设计 - 专门用于n8n工作流数据收集
-- 记录每个节点的详细执行数据和AI生成内容

-- 1. 会话追踪表（增强版）
CREATE TABLE workflow_sessions (
    id SERIAL PRIMARY KEY,
    session_id VARCHAR(50) UNIQUE NOT NULL,
    workflow_id VARCHAR(100), -- n8n工作流ID
    workflow_name VARCHAR(200), -- 工作流名称
    workflow_version INTEGER, -- 工作流版本
    user_ip VARCHAR(45),
    user_agent TEXT,
    referrer TEXT,
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    status VARCHAR(20) DEFAULT 'in_progress',
    total_duration_ms INTEGER,
    total_cost DECIMAL(10, 6), -- 总成本
    error_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. AI模型使用记录表
CREATE TABLE ai_model_usage (
    id SERIAL PRIMARY KEY,
    session_id VARCHAR(50) REFERENCES workflow_sessions(session_id),
    node_name VARCHAR(100), -- n8n节点名称
    model_name VARCHAR(50), -- 使用的模型
    model_version VARCHAR(20),
    prompt_tokens INTEGER,
    completion_tokens INTEGER,
    total_tokens INTEGER,
    estimated_cost DECIMAL(10, 6),
    response_time_ms INTEGER,
    temperature DECIMAL(3, 2),
    max_tokens INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. 脑洞生成详细记录
CREATE TABLE idea_generations (
    id SERIAL PRIMARY KEY,
    session_id VARCHAR(50) REFERENCES workflow_sessions(session_id),
    execution_id VARCHAR(100), -- n8n执行ID
    idea_index INTEGER,
    genre VARCHAR(100),
    title VARCHAR(500),
    content TEXT, -- 完整的脑洞内容
    summary TEXT, -- 简短描述
    keywords TEXT[], -- 关键词数组
    creativity_score DECIMAL(3, 2), -- AI创意评分
    user_input TEXT, -- 用户原始输入
    user_suggestions TEXT, -- 用户优化建议
    is_selected BOOLEAN DEFAULT FALSE,
    generation_time_ms INTEGER,
    ai_usage_id INTEGER REFERENCES ai_model_usage(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. 大纲生成详细记录
CREATE TABLE outline_generations (
    id SERIAL PRIMARY KEY,
    session_id VARCHAR(50) REFERENCES workflow_sessions(session_id),
    execution_id VARCHAR(100),
    selected_idea_id INTEGER REFERENCES idea_generations(id),
    synopsis TEXT, -- 故事梗概
    outline_structure JSONB, -- 完整的大纲结构
    chapter_count INTEGER,
    estimated_word_count INTEGER,
    
    -- 起承转合详情
    introduction_summary TEXT,
    development_summary TEXT,
    climax_summary TEXT,
    conclusion_summary TEXT,
    
    user_suggestions TEXT,
    generation_time_ms INTEGER,
    ai_usage_id INTEGER REFERENCES ai_model_usage(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. 小说生成详细记录
CREATE TABLE novel_generations (
    id SERIAL PRIMARY KEY,
    session_id VARCHAR(50) REFERENCES workflow_sessions(session_id),
    execution_id VARCHAR(100),
    outline_id INTEGER REFERENCES outline_generations(id),
    
    -- 小说基本信息
    title VARCHAR(500),
    subtitle VARCHAR(500),
    author_note TEXT,
    
    -- 内容
    full_content TEXT, -- 完整小说内容
    word_count INTEGER,
    character_count INTEGER,
    paragraph_count INTEGER,
    
    -- 章节信息
    chapters JSONB, -- 章节详细信息
    chapter_count INTEGER,
    
    -- 质量指标
    readability_score DECIMAL(3, 2),
    sentiment_score DECIMAL(3, 2),
    
    user_suggestions TEXT,
    generation_time_ms INTEGER,
    ai_usage_id INTEGER REFERENCES ai_model_usage(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6. 互动脚本生成详细记录
CREATE TABLE script_generations (
    id SERIAL PRIMARY KEY,
    session_id VARCHAR(50) REFERENCES workflow_sessions(session_id),
    execution_id VARCHAR(100),
    novel_id INTEGER REFERENCES novel_generations(id),
    
    -- 脚本内容
    full_script TEXT,
    format_type VARCHAR(50), -- 脚本格式类型
    
    -- 统计信息
    scene_count INTEGER,
    dialogue_count INTEGER,
    character_count INTEGER,
    stage_direction_count INTEGER,
    
    -- 角色信息
    characters JSONB, -- 角色列表和描述
    main_characters TEXT[],
    
    -- 场景信息
    scenes JSONB, -- 场景列表和描述
    locations TEXT[],
    
    user_suggestions TEXT,
    generation_time_ms INTEGER,
    ai_usage_id INTEGER REFERENCES ai_model_usage(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 7. 节点执行日志（详细记录每个n8n节点的执行）
CREATE TABLE node_execution_logs (
    id SERIAL PRIMARY KEY,
    session_id VARCHAR(50),
    execution_id VARCHAR(100),
    workflow_id VARCHAR(100),
    node_id VARCHAR(100),
    node_name VARCHAR(200),
    node_type VARCHAR(100),
    
    -- 执行信息
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    duration_ms INTEGER,
    status VARCHAR(20), -- success, error, skipped
    
    -- 输入输出
    input_data JSONB,
    output_data JSONB,
    error_data JSONB,
    
    -- 性能指标
    memory_used_mb INTEGER,
    items_processed INTEGER,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 8. 用户反馈和评分
CREATE TABLE user_ratings (
    id SERIAL PRIMARY KEY,
    session_id VARCHAR(50),
    target_type VARCHAR(50), -- idea, outline, novel, script
    target_id INTEGER,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    feedback TEXT,
    is_favorite BOOLEAN DEFAULT FALSE,
    would_recommend BOOLEAN,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 9. 创建索引以提高查询性能
CREATE INDEX idx_sessions_created ON workflow_sessions(created_at);
CREATE INDEX idx_sessions_status ON workflow_sessions(status);
CREATE INDEX idx_ideas_session ON idea_generations(session_id);
CREATE INDEX idx_ideas_selected ON idea_generations(is_selected);
CREATE INDEX idx_outlines_session ON outline_generations(session_id);
CREATE INDEX idx_novels_session ON novel_generations(session_id);
CREATE INDEX idx_scripts_session ON script_generations(session_id);
CREATE INDEX idx_model_usage_session ON ai_model_usage(session_id);
CREATE INDEX idx_model_usage_model ON ai_model_usage(model_name);
CREATE INDEX idx_node_logs_session ON node_execution_logs(session_id);
CREATE INDEX idx_node_logs_execution ON node_execution_logs(execution_id);

-- 10. 实用视图

-- 完整的用户旅程视图
CREATE VIEW user_journey_detailed AS
SELECT 
    ws.session_id,
    ws.started_at,
    ws.completed_at,
    ws.total_duration_ms,
    ws.total_cost,
    
    -- 各阶段完成情况
    COUNT(DISTINCT ig.id) as ideas_generated,
    COUNT(DISTINCT ig.id) FILTER (WHERE ig.is_selected) as ideas_selected,
    COUNT(DISTINCT og.id) as outlines_generated,
    COUNT(DISTINCT ng.id) as novels_generated,
    COUNT(DISTINCT sg.id) as scripts_generated,
    
    -- 内容统计
    MAX(ng.word_count) as novel_word_count,
    MAX(sg.scene_count) as script_scene_count,
    
    -- 性能指标
    SUM(amu.response_time_ms) as total_ai_time_ms,
    SUM(amu.total_tokens) as total_tokens_used,
    
    -- 完成状态
    CASE 
        WHEN COUNT(sg.id) > 0 THEN 'completed'
        WHEN COUNT(ng.id) > 0 THEN 'stopped_at_novel'
        WHEN COUNT(og.id) > 0 THEN 'stopped_at_outline'
        WHEN COUNT(ig.id) > 0 THEN 'stopped_at_ideas'
        ELSE 'no_content_generated'
    END as journey_status
    
FROM workflow_sessions ws
LEFT JOIN idea_generations ig ON ig.session_id = ws.session_id
LEFT JOIN outline_generations og ON og.session_id = ws.session_id
LEFT JOIN novel_generations ng ON ng.session_id = ws.session_id
LEFT JOIN script_generations sg ON sg.session_id = ws.session_id
LEFT JOIN ai_model_usage amu ON amu.session_id = ws.session_id
GROUP BY ws.session_id, ws.started_at, ws.completed_at, ws.total_duration_ms, ws.total_cost;

-- AI模型成本分析视图
CREATE VIEW ai_cost_analysis AS
SELECT 
    DATE(created_at) as date,
    model_name,
    COUNT(*) as api_calls,
    SUM(prompt_tokens) as total_prompt_tokens,
    SUM(completion_tokens) as total_completion_tokens,
    SUM(total_tokens) as total_tokens,
    SUM(estimated_cost) as total_cost,
    AVG(response_time_ms) as avg_response_time,
    PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY response_time_ms) as p95_response_time
FROM ai_model_usage
GROUP BY DATE(created_at), model_name;

-- 内容质量分析视图
CREATE VIEW content_quality_metrics AS
SELECT 
    DATE(ng.created_at) as date,
    COUNT(DISTINCT ng.id) as novels_generated,
    AVG(ng.word_count) as avg_word_count,
    AVG(ng.readability_score) as avg_readability,
    AVG(ng.generation_time_ms) as avg_generation_time,
    COUNT(DISTINCT ur.id) FILTER (WHERE ur.rating >= 4) as high_ratings,
    COUNT(DISTINCT ur.id) FILTER (WHERE ur.rating <= 2) as low_ratings,
    AVG(ur.rating) as avg_rating
FROM novel_generations ng
LEFT JOIN user_ratings ur ON ur.target_id = ng.id AND ur.target_type = 'novel'
GROUP BY DATE(ng.created_at);

-- 常用查询函数

-- 获取会话的完整时间线
CREATE OR REPLACE FUNCTION get_session_timeline(p_session_id VARCHAR)
RETURNS TABLE (
    event_time TIMESTAMP,
    event_type VARCHAR,
    event_description TEXT,
    duration_ms INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT created_at, 'idea_generated', title, generation_time_ms
    FROM idea_generations WHERE session_id = p_session_id
    UNION ALL
    SELECT created_at, 'outline_generated', synopsis, generation_time_ms
    FROM outline_generations WHERE session_id = p_session_id
    UNION ALL
    SELECT created_at, 'novel_generated', title, generation_time_ms
    FROM novel_generations WHERE session_id = p_session_id
    UNION ALL
    SELECT created_at, 'script_generated', format_type, generation_time_ms
    FROM script_generations WHERE session_id = p_session_id
    ORDER BY event_time;
END;
$$ LANGUAGE plpgsql;

-- 计算每日统计报表
CREATE OR REPLACE FUNCTION daily_stats_report(p_date DATE)
RETURNS TABLE (
    metric_name VARCHAR,
    metric_value NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 'total_sessions'::VARCHAR, COUNT(*)::NUMERIC
    FROM workflow_sessions WHERE DATE(created_at) = p_date
    UNION ALL
    SELECT 'completed_sessions', COUNT(*)::NUMERIC
    FROM workflow_sessions WHERE DATE(created_at) = p_date AND status = 'completed'
    UNION ALL
    SELECT 'total_cost', COALESCE(SUM(total_cost), 0)::NUMERIC
    FROM workflow_sessions WHERE DATE(created_at) = p_date
    UNION ALL
    SELECT 'avg_word_count', COALESCE(AVG(word_count), 0)::NUMERIC
    FROM novel_generations WHERE DATE(created_at) = p_date
    UNION ALL
    SELECT 'total_api_calls', COUNT(*)::NUMERIC
    FROM ai_model_usage WHERE DATE(created_at) = p_date;
END;
$$ LANGUAGE plpgsql;