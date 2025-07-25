# n8n工作流改造可视化指南

## 节点连接示意图

### 1. 脑洞生成模块改造

```
改造前：
┌─────────┐     ┌──────────┐     ┌────────────┐
│ Webhook ├────►│ AI生成   ├────►│ 返回结果   │
└─────────┘     └──────────┘     └────────────┘

改造后：
┌─────────┐     ┌──────────────┐     ┌──────────┐     ┌─────────────┐
│ Webhook ├────►│ 准备Session  ├────►│ AI生成   ├────►│ 格式化数据  │
└─────────┘     └──────────────┘     └──────────┘     └──────┬──────┘
                      │                                        │
                      ▼                                        ▼
              ┌──────────────┐                        ┌──────────────┐
              │ 创建会话记录  │                        │ 保存到DB    │
              └──────────────┘                        └──────┬───────┘
                                                             │
                                                             ▼
                                                      ┌──────────────┐
                                                      │ 返回结果     │
                                                      └──────────────┘
```

### 2. 完整工作流数据收集点

```
用户请求
   │
   ▼
[会话开始] ──────► PostgreSQL: 创建 workflow_sessions 记录
   │
   ▼
[脑洞生成]
   ├─► AI调用 ────► PostgreSQL: 记录 ai_model_usage
   └─► 生成结果 ──► PostgreSQL: 插入 idea_generations
   │
   ▼
[大纲生成]
   ├─► AI调用 ────► PostgreSQL: 记录 ai_model_usage
   └─► 生成结果 ──► PostgreSQL: 插入 outline_generations
   │
   ▼
[小说生成]
   ├─► AI调用 ────► PostgreSQL: 记录 ai_model_usage
   └─► 生成结果 ──► PostgreSQL: 插入 novel_generations
   │
   ▼
[脚本生成]
   ├─► AI调用 ────► PostgreSQL: 记录 ai_model_usage
   └─► 生成结果 ──► PostgreSQL: 插入 script_generations
   │
   ▼
[会话结束] ──────► PostgreSQL: 更新 workflow_sessions.status
```

## 具体节点类型和设置

### 1. Set节点 - 准备Session数据
```javascript
节点类型: Set
节点名称: Prepare Session
输出字段:
- session_id: {{ $json.session_id || $workflow.id + '_' + Date.now() }}
- workflow_id: {{ $workflow.id }}
- execution_id: {{ $execution.id }}
- timestamp: {{ new Date().toISOString() }}
- user_ip: {{ $json.headers['x-forwarded-for'] || 'unknown' }}
```

### 2. Function节点 - 格式化数据
```javascript
节点类型: Function
节点名称: Format AI Response
功能: 解析AI响应并准备数据库记录
输入: AI节点的输出
输出: 格式化的数据数组
```

### 3. Postgres节点 - 保存数据
```javascript
节点类型: Postgres
节点名称: Save to Database
操作: Insert
表名: [对应的表]
选项:
- Continue On Fail: ✓ (必须勾选)
- Batch Size: 100
```

### 4. Merge节点 - 合并数据流
```javascript
节点类型: Merge
节点名称: Merge DB Result
模式: Merge By Index
作用: 合并数据库结果和原始数据，继续工作流
```

## 错误处理流程

```
主工作流
   │
   ├─[正常执行]─────────────────────────┐
   │                                    │
   └─[发生错误]─┐                      │
                │                       │
                ▼                       ▼
         ┌─────────────┐         ┌──────────┐
         │ Error节点   │         │ 继续流程 │
         └──────┬──────┘         └──────────┘
                │
                ▼
         ┌─────────────┐
         │ 记录错误    │
         │ 到PostgreSQL│
         └─────────────┘
```

## 实际操作步骤截图说明

### Step 1: 添加PostgreSQL凭据
1. 进入n8n设置
2. 点击"Credentials"
3. 添加新凭据，选择"Postgres"
4. 填写数据库连接信息：
   - Host: your-db-host
   - Database: novel_creation_db
   - User: n8n_writer
   - Password: ****
   - Port: 5432
   - SSL: 根据需要配置

### Step 2: 在工作流中添加节点
1. 打开你的工作流
2. 在AI节点后点击"+"
3. 搜索"Function"添加格式化节点
4. 再次点击"+"，搜索"Postgres"添加数据库节点
5. 连接节点确保数据流向正确

### Step 3: 配置PostgreSQL节点
1. 选择操作类型："Insert"
2. 选择表名（从下拉列表）
3. 映射字段：
   - 点击"Add Field"
   - 选择列名
   - 设置值（使用表达式）
4. 在"Settings"中勾选"Continue On Fail"

## 测试和验证

### 1. 单节点测试
```bash
# 在n8n中使用"Execute Node"功能
# 提供测试数据，验证节点工作正常
```

### 2. 完整流程测试
```bash
# 触发webhook，运行完整流程
# 检查PostgreSQL中的数据
```

### 3. 验证查询
```sql
-- 检查最新的会话
SELECT * FROM workflow_sessions 
ORDER BY created_at DESC 
LIMIT 5;

-- 检查AI调用记录
SELECT * FROM ai_model_usage 
WHERE session_id = 'your-test-session-id';

-- 检查生成的内容
SELECT * FROM idea_generations 
WHERE session_id = 'your-test-session-id';
```

## 常见问题解决

### 1. PostgreSQL连接失败
- 检查凭据配置
- 验证数据库网络可达
- 确认用户权限

### 2. 数据没有保存
- 检查"Continue On Fail"是否开启
- 查看n8n执行日志
- 验证表结构匹配

### 3. 性能问题
- 使用批量插入
- 添加适当的索引
- 考虑异步处理

## 优化建议

### 1. 使用事务
在Function节点中准备多条记录，使用事务一次性插入

### 2. 添加重试机制
使用n8n的重试功能，确保数据不丢失

### 3. 监控告警
设置数据库插入失败的告警通知