# n8n工作流PostgreSQL集成实例

## 实际工作流改造示例

基于你的现有工作流 `PLlmkkc4cnMPPdJX`，这里展示如何添加PostgreSQL数据收集。

## 1. 整体架构图

```
原始工作流：
[Webhook] → [脑洞生成AI] → [返回结果]
    ↓
[Webhook] → [大纲生成AI] → [返回结果]
    ↓
[Webhook] → [小说生成AI] → [返回结果]
    ↓
[Webhook] → [脚本生成AI] → [返回结果]

改造后的工作流：
[Webhook] → [准备数据] → [脑洞生成AI] → [记录到PostgreSQL] → [返回结果]
                                              ↓
                                        [错误处理记录]
```

## 2. 具体节点配置示例

### Step 1: 修改脑洞生成部分

#### 1.1 在Webhook节点后添加"Set"节点
**节点名称**: Prepare Session Data
**节点类型**: Set
**配置**:
```json
{
  "values": {
    "string": [
      {
        "name": "session_id",
        "value": "={{ $json.session_id || $workflow.id + '_' + Date.now() }}"
      },
      {
        "name": "workflow_id",
        "value": "={{ $workflow.id }}"
      },
      {
        "name": "execution_id",
        "value": "={{ $execution.id }}"
      }
    ]
  },
  "options": {}
}
```

#### 1.2 在AI生成后添加"Function"节点
**节点名称**: Format Ideas Data
**节点类型**: Function
**代码**:
```javascript
// 提取和格式化脑洞数据
const aiResponse = items[0].json;
const sessionData = $node["Prepare Session Data"].json;

// 解析AI返回的内容
let ideas = [];
try {
  // 处理不同的响应格式
  if (typeof aiResponse.result === 'string') {
    ideas = JSON.parse(aiResponse.result);
  } else if (Array.isArray(aiResponse.result)) {
    ideas = aiResponse.result;
  } else if (aiResponse.choices && aiResponse.choices[0]) {
    const content = aiResponse.choices[0].message.content;
    ideas = JSON.parse(content);
  }
} catch (error) {
  ideas = [{ error: 'Failed to parse AI response' }];
}

// 为每个脑洞准备数据库记录
const records = ideas.map((idea, index) => ({
  session_id: sessionData.session_id,
  execution_id: sessionData.execution_id,
  workflow_id: sessionData.workflow_id,
  idea_index: index + 1,
  genre: idea.genre || idea.类型 || 'unknown',
  title: idea.title || idea.标题 || idea.name,
  content: idea.content || idea.内容 || idea.description,
  summary: idea.summary || idea.简介 || '',
  keywords: Array.isArray(idea.tags) ? idea.tags : [],
  user_input: $node["Webhook"].json.userSuggestions || null,
  generation_time_ms: $execution.resumeTime - $execution.startTime,
  model_name: 'deepseek',
  prompt_tokens: aiResponse.usage?.prompt_tokens || 0,
  completion_tokens: aiResponse.usage?.completion_tokens || 0,
  total_tokens: aiResponse.usage?.total_tokens || 0,
  estimated_cost: (aiResponse.usage?.total_tokens || 0) * 0.000001
}));

return records;
```

#### 1.3 添加PostgreSQL节点
**节点名称**: Save Ideas to DB
**节点类型**: Postgres
**操作**: Insert
**配置**:
```json
{
  "operation": "insert",
  "table": "idea_generations",
  "columns": "session_id,execution_id,idea_index,genre,title,content,summary,keywords,user_input,generation_time_ms",
  "returnFields": "id",
  "options": {
    "batchSize": 100
  }
}
```

### Step 2: 记录会话信息

#### 2.1 在工作流开始时记录会话
**节点名称**: Create Session Record
**节点类型**: Postgres
**操作**: Insert
**SQL查询**:
```sql
INSERT INTO workflow_sessions (
    session_id,
    workflow_id,
    workflow_name,
    user_ip,
    user_agent,
    referrer,
    status
) VALUES (
    $1,
    $2,
    '小说创作工作流',
    $3,
    $4,
    $5,
    'in_progress'
) ON CONFLICT (session_id) DO NOTHING
RETURNING *;
```

**参数映射**:
```javascript
[
  "={{ $json.session_id }}",
  "={{ $workflow.id }}",
  "={{ $json.ip || 'unknown' }}",
  "={{ $json.user_agent || 'unknown' }}",
  "={{ $json.referrer || 'direct' }}"
]
```

### Step 3: 记录AI模型使用情况

#### 3.1 在每次AI调用后添加记录
**节点名称**: Log AI Usage
**节点类型**: Postgres
**SQL查询**:
```sql
INSERT INTO ai_model_usage (
    session_id,
    node_name,
    model_name,
    model_version,
    prompt_tokens,
    completion_tokens,
    total_tokens,
    estimated_cost,
    response_time_ms,
    temperature,
    max_tokens
) VALUES (
    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11
);
```

### Step 4: 错误处理

#### 4.1 添加Error Trigger工作流
创建一个单独的错误处理工作流，当主工作流出错时触发：

**节点配置**:
```javascript
// Error Handler Function节点
const error = items[0].json;
const errorRecord = {
  session_id: error.session_id || 'unknown',
  execution_id: $execution.id,
  workflow_id: $workflow.id,
  node_name: error.node?.name || 'unknown',
  node_type: error.node?.type || 'unknown',
  error_message: error.message,
  error_stack: error.stack,
  error_data: JSON.stringify(error),
  timestamp: new Date().toISOString()
};

// 记录到数据库
return [errorRecord];
```

## 3. 实际n8n节点JSON配置

### 3.1 Format and Save Ideas 节点组
```json
{
  "nodes": [
    {
      "parameters": {
        "functionCode": "// 这里是上面的Function节点代码"
      },
      "name": "Format Ideas Data",
      "type": "n8n-nodes-base.function",
      "position": [850, 300]
    },
    {
      "parameters": {
        "operation": "executeQuery",
        "query": "INSERT INTO idea_generations (session_id, execution_id, idea_index, genre, title, content, summary, keywords, user_input, generation_time_ms, ai_usage_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)",
        "additionalFields": {}
      },
      "name": "Save Ideas to DB",
      "type": "n8n-nodes-base.postgres",
      "credentials": {
        "postgres": {
          "id": "your-postgres-credential-id"
        }
      },
      "position": [1050, 300],
      "continueOnFail": true
    }
  ],
  "connections": {
    "Format Ideas Data": {
      "main": [
        [
          {
            "node": "Save Ideas to DB",
            "type": "main",
            "index": 0
          }
        ]
      ]
    }
  }
}
```

## 4. 数据流转示例

### 4.1 脑洞生成完整流程
```javascript
// 1. Webhook接收数据
{
  "action": "generate",
  "session_id": "session_1234567890",
  "userSuggestions": "科幻题材，关于AI觉醒",
  "count": 5
}

// 2. AI生成后的数据
{
  "result": [
    {
      "genre": "科幻",
      "title": "最后的守护者",
      "content": "在2045年，AI系统..."
    }
  ],
  "usage": {
    "prompt_tokens": 150,
    "completion_tokens": 850,
    "total_tokens": 1000
  }
}

// 3. 格式化后准备插入数据库
{
  "session_id": "session_1234567890",
  "execution_id": "exec_abc123",
  "idea_index": 1,
  "genre": "科幻",
  "title": "最后的守护者",
  "content": "在2045年，AI系统...",
  "generation_time_ms": 2500,
  "total_tokens": 1000,
  "estimated_cost": 0.001
}
```

## 5. 实施步骤清单

### 第一步：准备PostgreSQL
```bash
# 1. 创建数据库
createdb novel_creation_db

# 2. 执行建表脚本
psql -d novel_creation_db -f enhanced-database-design.sql

# 3. 在n8n中配置PostgreSQL凭据
```

### 第二步：修改工作流
1. **备份现有工作流**
   - 导出当前工作流JSON
   - 保存为 `workflow_backup_[date].json`

2. **添加会话管理**
   - 在Webhook后添加Set节点
   - 设置session_id和其他元数据

3. **插入数据收集节点**
   - 在每个AI节点后添加Function节点格式化数据
   - 添加PostgreSQL节点保存数据
   - 设置continueOnFail为true

4. **测试新工作流**
   - 先在测试环境运行
   - 检查数据是否正确保存
   - 验证不影响主流程

### 第三步：监控和优化
```sql
-- 检查数据收集情况
SELECT 
    DATE(created_at) as date,
    COUNT(DISTINCT session_id) as sessions,
    COUNT(*) as total_ideas,
    AVG(generation_time_ms) as avg_time
FROM idea_generations
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;
```

## 6. 注意事项

### 6.1 性能优化
- 使用批量插入减少数据库连接
- 设置合理的超时时间
- 异步记录，不阻塞主流程

### 6.2 错误处理
```javascript
// 在PostgreSQL节点设置
{
  "continueOnFail": true,
  "alwaysOutputData": true
}
```

### 6.3 数据安全
- 不记录敏感用户信息
- 定期清理旧数据
- 使用只写权限的数据库用户

## 7. 验证数据收集

### 7.1 实时监控查询
```sql
-- 查看最近的生成活动
SELECT 
    ws.session_id,
    ws.started_at,
    COUNT(ig.id) as ideas_count,
    STRING_AGG(ig.title, ', ') as idea_titles
FROM workflow_sessions ws
LEFT JOIN idea_generations ig ON ig.session_id = ws.session_id
WHERE ws.created_at > NOW() - INTERVAL '1 hour'
GROUP BY ws.session_id, ws.started_at
ORDER BY ws.started_at DESC;
```

### 7.2 性能分析
```sql
-- 分析AI响应时间
SELECT 
    node_name,
    AVG(response_time_ms) as avg_response_time,
    PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY response_time_ms) as p95_time,
    COUNT(*) as call_count
FROM ai_model_usage
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY node_name;
```

## 8. 下一步行动

1. **立即可做**
   - 在n8n中配置PostgreSQL凭据
   - 导入示例节点配置
   - 在测试工作流中验证

2. **本周完成**
   - 改造所有四个生成步骤
   - 添加完整的错误处理
   - 部署到生产环境

3. **后续优化**
   - 创建数据分析仪表板
   - 设置自动报告
   - 优化查询性能