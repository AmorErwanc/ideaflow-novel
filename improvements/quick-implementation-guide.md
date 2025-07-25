# 快速实施指南 - PostgreSQL数据收集

## 🚀 10分钟快速开始

### 第1步：创建最简单的数据收集（2分钟）

在n8n中，只需要在每个AI节点后添加一个PostgreSQL节点：

```sql
-- 最简单的记录方式
INSERT INTO simple_logs (
    session_id,
    step_name,
    content,
    created_at
) VALUES (
    '{{ $node["Webhook"].json.session_id }}',
    'idea_generation',
    '{{ JSON.stringify($json) }}',
    NOW()
);
```

### 第2步：创建简化版数据表（3分钟）

```sql
-- 超级简化版 - 只需要一张表！
CREATE TABLE simple_logs (
    id SERIAL PRIMARY KEY,
    session_id VARCHAR(100),
    step_name VARCHAR(50),
    content JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 创建索引
CREATE INDEX idx_session ON simple_logs(session_id);
CREATE INDEX idx_created ON simple_logs(created_at);
```

### 第3步：在n8n中配置（5分钟）

#### 3.1 添加PostgreSQL凭据
1. n8n设置 → 凭据 → 新建
2. 选择PostgreSQL
3. 填写连接信息

#### 3.2 在工作流中添加记录节点

**在脑洞生成AI后添加：**
```
节点类型: Postgres
操作: Execute Query
查询: 
INSERT INTO simple_logs (session_id, step_name, content) 
VALUES ($1, $2, $3::jsonb)

参数:
$1 = {{ $node["Webhook"].json.session_id || 'anonymous' }}
$2 = 'ideas'
$3 = {{ JSON.stringify($json) }}

设置: Continue On Fail = ✓
```

## 📊 立即可用的查询

### 查看今天的使用情况
```sql
SELECT 
    COUNT(DISTINCT session_id) as users,
    COUNT(*) as total_operations,
    step_name,
    DATE(created_at) as date
FROM simple_logs
WHERE DATE(created_at) = CURRENT_DATE
GROUP BY step_name, DATE(created_at);
```

### 查看完整的用户流程
```sql
SELECT 
    session_id,
    step_name,
    created_at,
    content->>'title' as title
FROM simple_logs
WHERE session_id = 'your-session-id'
ORDER BY created_at;
```

### 统计生成内容
```sql
-- 查看生成的脑洞
SELECT 
    content->'result'->0->>'title' as idea_title,
    content->'result'->0->>'genre' as genre,
    created_at
FROM simple_logs
WHERE step_name = 'ideas'
ORDER BY created_at DESC
LIMIT 10;
```

## 🎯 渐进式改进

### Phase 1: 基础记录（现在就做）
- 使用simple_logs表记录所有数据
- 不影响现有流程
- 立即开始收集数据

### Phase 2: 结构化存储（下周）
- 将JSONB数据提取到专门的表
- 添加更多统计字段
- 保留原始数据作为备份

### Phase 3: 完整方案（下月）
- 实施完整的enhanced-database-design.sql
- 添加数据分析视图
- 创建监控仪表板

## ⚡ 一键部署脚本

创建文件 `quick-setup.sql`：

```sql
-- 快速部署脚本
-- 1. 创建数据库
CREATE DATABASE IF NOT EXISTS novel_analytics;

-- 2. 创建简单日志表
\c novel_analytics;

CREATE TABLE IF NOT EXISTS simple_logs (
    id SERIAL PRIMARY KEY,
    session_id VARCHAR(100),
    step_name VARCHAR(50),
    content JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 3. 创建索引
CREATE INDEX IF NOT EXISTS idx_session ON simple_logs(session_id);
CREATE INDEX IF NOT EXISTS idx_created ON simple_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_step ON simple_logs(step_name);

-- 4. 创建实用视图
CREATE OR REPLACE VIEW daily_stats AS
SELECT 
    DATE(created_at) as date,
    COUNT(DISTINCT session_id) as unique_users,
    COUNT(*) as total_operations,
    COUNT(*) FILTER (WHERE step_name = 'ideas') as idea_generations,
    COUNT(*) FILTER (WHERE step_name = 'outline') as outline_generations,
    COUNT(*) FILTER (WHERE step_name = 'novel') as novel_generations,
    COUNT(*) FILTER (WHERE step_name = 'script') as script_generations
FROM simple_logs
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- 5. 授权（可选）
GRANT INSERT ON simple_logs TO n8n_user;
GRANT SELECT ON daily_stats TO n8n_user;

-- 完成！
SELECT '✅ 快速部署完成！' as status;
```

执行：
```bash
psql -U postgres -f quick-setup.sql
```

## 🔍 故障排查

### 如果数据没有保存？

1. **检查n8n日志**
   ```
   在n8n界面查看执行历史
   查看PostgreSQL节点的错误信息
   ```

2. **验证连接**
   ```sql
   -- 在PostgreSQL节点执行
   SELECT NOW() as test_connection;
   ```

3. **检查权限**
   ```sql
   -- 确保用户有插入权限
   GRANT INSERT ON simple_logs TO your_n8n_user;
   ```

## 📈 快速成效

实施后立即可以：
- 知道每天有多少用户使用
- 了解哪个步骤最容易失败
- 统计最受欢迎的内容类型
- 分析用户完成率

## 💡 专业提示

1. **先简单后复杂** - 从simple_logs开始，逐步优化
2. **不要阻塞主流程** - 始终开启Continue On Fail
3. **定期清理** - 设置定时任务清理30天前的数据
4. **监控但不干扰** - 数据收集不应影响用户体验

---

**下一步行动：**
1. 执行quick-setup.sql创建表
2. 在n8n中添加第一个PostgreSQL节点
3. 运行测试，验证数据保存
4. 查看daily_stats视图，了解使用情况