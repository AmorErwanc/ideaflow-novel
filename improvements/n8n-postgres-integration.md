# n8n工作流与PostgreSQL集成方案

## 核心思想

在n8n工作流的每个关键节点执行后，直接将生成的数据存入PostgreSQL，实现数据收集和分析。

## 实施方案

### 1. 在n8n中配置PostgreSQL连接

在n8n中添加PostgreSQL凭据：
1. 进入n8n设置 → 凭据
2. 添加新凭据 → 选择PostgreSQL
3. 配置数据库连接信息

### 2. 修改工作流：在每个生成节点后添加数据记录

#### 示例：脑洞生成后记录数据

```
原流程：
[脑洞生成AI] → [返回结果给前端]

新流程：
[脑洞生成AI] → [PostgreSQL插入节点] → [返回结果给前端]
                        ↓
                  记录到数据库
```

### 3. PostgreSQL节点配置示例

#### 记录脑洞生成数据
```sql
INSERT INTO novel_ideas (
    session_id,
    idea_number,
    genre,
    title,
    content,
    tags,
    user_suggestions,
    generation_time_ms,
    model_used,
    prompt_tokens,
    completion_tokens,
    created_at
) VALUES (
    '{{ $json.session_id }}',
    {{ $json.idea_number }},
    '{{ $json.genre }}',
    '{{ $json.title }}',
    '{{ $json.content }}',
    ARRAY[{{ $json.tags }}],
    '{{ $json.user_suggestions }}',
    {{ $executionTime }},
    'deepseek',
    {{ $json.usage.prompt_tokens }},
    {{ $json.usage.completion_tokens }},
    NOW()
);
```

#### 记录大纲生成数据
```sql
INSERT INTO novel_outlines (
    session_id,
    idea_id,
    outline_data,
    synopsis,
    parts_count,
    user_suggestions,
    generation_time_ms,
    model_used,
    created_at
) VALUES (
    '{{ $json.session_id }}',
    {{ $json.selected_idea_id }},
    '{{ JSON.stringify($json.outline) }}'::jsonb,
    '{{ $json.synopsis }}',
    {{ $json.parts.length }},
    '{{ $json.user_suggestions }}',
    {{ $executionTime }},
    'deepseek',
    NOW()
);
```

#### 记录小说生成数据
```sql
INSERT INTO novels (
    session_id,
    outline_id,
    title,
    content,
    word_count,
    chapters,
    user_suggestions,
    generation_time_ms,
    model_used,
    estimated_cost,
    created_at
) VALUES (
    '{{ $json.session_id }}',
    {{ $json.outline_id }},
    '{{ $json.title }}',
    '{{ $json.content }}',
    {{ $json.content.length }},
    {{ $json.chapters }},
    '{{ $json.user_suggestions }}',
    {{ $executionTime }},
    'openai-gpt4',
    {{ $json.usage.total_tokens * 0.00003 }}, -- 计算成本
    NOW()
);
```

### 4. 在n8n工作流中的具体实现

#### Step 1: 添加Set节点准备数据
在AI生成后，添加Set节点整理要记录的数据：

```javascript
// Set节点配置
{
  "session_id": "{{ $('Webhook').item.json.session_id }}",
  "generation_time_ms": "{{ $executionTime }}",
  "content": "{{ $json.choices[0].message.content }}",
  "model_used": "{{ $json.model }}",
  "usage": {
    "prompt_tokens": "{{ $json.usage.prompt_tokens }}",
    "completion_tokens": "{{ $json.usage.completion_tokens }}",
    "total_tokens": "{{ $json.usage.total_tokens }}"
  }
}
```

#### Step 2: 添加PostgreSQL节点执行插入
选择操作类型为"Insert"，配置表名和列映射。

#### Step 3: 错误处理
添加Error Trigger节点，记录失败的请求：

```sql
INSERT INTO api_logs (
    session_id,
    endpoint,
    status_code,
    error_message,
    request_data,
    created_at
) VALUES (
    '{{ $json.session_id }}',
    '{{ $node.name }}',
    500,
    '{{ $json.error.message }}',
    '{{ JSON.stringify($json) }}'::jsonb,
    NOW()
);
```

### 5. 实用的数据收集点

#### 必须记录的数据
1. **生成内容**
   - 完整的生成文本
   - 字数统计
   - 生成时间

2. **性能指标**
   - API响应时间
   - Token使用量
   - 估算成本

3. **用户行为**
   - 选择了哪个脑洞
   - 是否使用优化建议
   - 完成到哪一步

4. **系统信息**
   - 使用的AI模型
   - 工作流版本
   - 错误信息

### 6. 数据分析查询

#### 查看今日生成统计
```sql
SELECT 
    COUNT(DISTINCT session_id) as unique_users,
    COUNT(CASE WHEN idea_id IS NOT NULL THEN 1 END) as total_ideas,
    COUNT(CASE WHEN outline_id IS NOT NULL THEN 1 END) as total_outlines,
    COUNT(CASE WHEN novel_id IS NOT NULL THEN 1 END) as total_novels,
    SUM(estimated_cost) as total_cost,
    AVG(generation_time_ms) as avg_generation_time
FROM creation_sessions
WHERE DATE(created_at) = CURRENT_DATE;
```

#### 分析用户流失
```sql
SELECT 
    COUNT(CASE WHEN ideas_generated AND NOT outline_generated THEN 1 END) as lost_after_ideas,
    COUNT(CASE WHEN outline_generated AND NOT novel_generated THEN 1 END) as lost_after_outline,
    COUNT(CASE WHEN novel_generated AND NOT script_generated THEN 1 END) as lost_after_novel
FROM (
    SELECT 
        session_id,
        EXISTS(SELECT 1 FROM novel_ideas WHERE session_id = cs.session_id) as ideas_generated,
        EXISTS(SELECT 1 FROM novel_outlines WHERE session_id = cs.session_id) as outline_generated,
        EXISTS(SELECT 1 FROM novels WHERE session_id = cs.session_id) as novel_generated,
        EXISTS(SELECT 1 FROM interactive_scripts WHERE session_id = cs.session_id) as script_generated
    FROM creation_sessions cs
) as user_progress;
```

#### 成本分析
```sql
SELECT 
    DATE(created_at) as date,
    SUM(CASE WHEN model_used = 'deepseek' THEN estimated_cost END) as deepseek_cost,
    SUM(CASE WHEN model_used = 'openai-gpt4' THEN estimated_cost END) as gpt4_cost,
    SUM(estimated_cost) as total_cost,
    COUNT(*) as requests_count
FROM novels
GROUP BY DATE(created_at)
ORDER BY date DESC;
```

### 7. 实施步骤

1. **创建数据库表**
   - 执行 `database-design.sql` 创建所需表结构

2. **修改n8n工作流**
   - 在每个AI节点后添加PostgreSQL节点
   - 配置数据映射

3. **添加session_id传递**
   - 前端生成session_id
   - 通过webhook传递给n8n
   - 在整个流程中保持传递

4. **测试数据记录**
   - 运行完整流程
   - 检查数据库记录
   - 验证数据完整性

### 8. 优势

1. **零前端改动**：不需要修改任何前端代码
2. **实时记录**：数据在生成时立即保存
3. **完整数据**：可以记录所有中间数据
4. **成本追踪**：精确计算API使用成本
5. **性能分析**：准确的生成时间统计

### 9. 注意事项

1. **数据库性能**
   - 使用批量插入减少开销
   - 定期清理旧数据
   - 创建必要的索引

2. **错误处理**
   - PostgreSQL插入失败不应影响主流程
   - 使用Continue On Fail选项

3. **数据隐私**
   - 考虑是否需要脱敏处理
   - 遵守数据保护法规

4. **成本考虑**
   - 记录操作会略微增加执行时间
   - 需要额外的数据库存储空间