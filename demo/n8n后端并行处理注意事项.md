# n8n后端并行处理注意事项

## 1. 核心挑战

### 1.1 当前n8n的限制
- **无状态**：每次调用都是独立的，无法记住之前的内容
- **无会话管理**：不能区分不同用户或不同线路
- **链式依赖**：大纲需要脑洞，小说需要大纲，剧本需要小说

### 1.2 并行处理的需求
- 需要**区分3条线路**的请求
- 需要**保持每条线路的上下文**
- 需要**防止数据混淆**

## 2. 解决方案

### 2.1 请求参数设计

#### 方案A：完整上下文传递（推荐）✅
每次请求都带上完整的上下文信息：

```javascript
// 生成大纲时
POST /webhook/generate-outline
{
    "line_id": "line_1",  // 线路标识
    "session_id": "user_123_session_456",  // 会话ID
    
    // 完整传递脑洞内容（重要！）
    "idea": {
        "id": "b1-3",
        "title": "时间旅行者的悖论",
        "content": "在2157年，时间旅行已经成为现实..."
    },
    
    // 用户偏好（可选）
    "preferences": {
        "style": "科幻",
        "length": "中篇"
    }
}

// 生成小说时
POST /webhook/generate-novel
{
    "line_id": "line_1",
    "session_id": "user_123_session_456",
    
    // 必须包含之前的所有内容
    "idea": {
        "id": "b1-3",
        "title": "时间旅行者的悖论",
        "content": "..."
    },
    
    // 完整传递大纲内容
    "outline": {
        "part1": "起：主人公发现时间循环...",
        "part2": "承：每次改变都导致更糟...",
        "part3": "转：发现打破循环的方法...",
        "part4": "合：付出代价获得解脱..."
    }
}
```

#### 方案B：轻量标识方案
如果上下文太大，可以只传关键信息：

```javascript
{
    "line_id": "line_1",
    "context_summary": "科幻时间循环故事，主角陷入悖论",  // 简短总结
    "previous_step": "outline",  // 上一步是什么
    "key_elements": ["时间旅行", "循环", "悖论", "代价"]  // 关键元素
}
```

### 2.2 n8n工作流调整

#### 2.2.1 提示词模板优化

在n8n的AI节点中，需要明确告诉AI这是哪条线路的内容：

```markdown
## 生成大纲提示词模板

你正在为一个小说创作系统工作，当前是第{{line_id}}号创作线路。

基于以下脑洞生成大纲：
标题：{{idea.title}}
内容：{{idea.content}}

注意：
1. 这是独立的创作线路，不要与其他线路混淆
2. 保持与脑洞内容的一致性
3. 使用起承转合的结构

输出格式：
<outline>
  <part1>起：[内容]</part1>
  <part2>承：[内容]</part2>
  <part3>转：[内容]</part3>
  <part4>合：[内容]</part4>
</outline>
```

#### 2.2.2 防止混淆策略

```javascript
// 在n8n的Function节点中添加验证
const lineId = $json.line_id;
const sessionId = $json.session_id;

// 验证必要参数
if (!lineId || !sessionId) {
    throw new Error('Missing line_id or session_id');
}

// 为AI添加明确的上下文标记
const context = {
    system_prompt: `你正在处理线路${lineId}的内容，请勿混淆。`,
    line_identifier: lineId,
    timestamp: new Date().toISOString()
};

return { ...items[0].json, context };
```

### 2.3 并发处理注意事项

#### 2.3.1 请求隔离
```javascript
// 前端确保请求间隔
class RequestQueue {
    constructor() {
        this.queue = [];
        this.processing = false;
        this.minInterval = 1000; // 最小间隔1秒
    }
    
    async add(request) {
        this.queue.push(request);
        if (!this.processing) {
            this.process();
        }
    }
    
    async process() {
        this.processing = true;
        while (this.queue.length > 0) {
            const request = this.queue.shift();
            await this.execute(request);
            await this.delay(this.minInterval);
        }
        this.processing = false;
    }
    
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
```

#### 2.3.2 n8n端负载考虑
- **限流**：避免同时发送3个请求
- **错误重试**：单个线路失败不影响其他
- **超时处理**：设置合理的超时时间

### 2.4 数据一致性保证

#### 2.4.1 请求验证
```javascript
// n8n Function节点中的验证逻辑
function validateRequest(json) {
    // 检查线路ID格式
    if (!json.line_id || !json.line_id.match(/^line_[1-3]$/)) {
        throw new Error('Invalid line_id format');
    }
    
    // 检查必要的上下文
    if (json.step === 'outline' && !json.idea) {
        throw new Error('Missing idea context for outline generation');
    }
    
    if (json.step === 'novel' && (!json.idea || !json.outline)) {
        throw new Error('Missing context for novel generation');
    }
    
    return true;
}
```

#### 2.4.2 响应标记
```javascript
// n8n响应中包含线路标识
{
    "status": "success",
    "line_id": "line_1",  // 原样返回
    "session_id": "user_123_session_456",  // 原样返回
    "step": "outline",
    "data": {
        // 实际生成的内容
    },
    "metadata": {
        "generated_at": "2024-01-20T10:30:00",
        "model_used": "gpt-4",
        "prompt_tokens": 500,
        "completion_tokens": 1000
    }
}
```

## 3. 具体实施建议

### 3.1 n8n工作流结构

```
[Webhook节点] 
    ↓
[验证节点 - Function]  // 验证请求参数
    ↓
[构建提示词 - Function]  // 根据line_id构建特定提示词
    ↓
[AI生成节点]  // 调用AI模型
    ↓
[格式化输出 - Function]  // 添加line_id等标识
    ↓
[响应节点]
```

### 3.2 提示词优化示例

#### 为不同线路定制提示词风格
```javascript
// n8n Function节点
const lineStyles = {
    'line_1': '请用严谨的科幻风格创作',
    'line_2': '请用温暖治愈的风格创作',
    'line_3': '请用悬疑惊悚的风格创作'
};

const style = lineStyles[lineId] || '请自由创作';

const prompt = `
${style}

当前处理的是第${lineId.replace('line_', '')}号创作线路。

基于以下内容创作：
${JSON.stringify(context)}
`;
```

### 3.3 错误处理

#### 3.3.1 n8n端错误处理
```javascript
// Error Handler节点
try {
    // 主流程
} catch (error) {
    return {
        status: 'error',
        line_id: $json.line_id || 'unknown',
        error: {
            message: error.message,
            code: 'GENERATION_FAILED',
            timestamp: new Date().toISOString()
        },
        retry: {
            suggested: true,
            delay: 5000  // 建议5秒后重试
        }
    };
}
```

#### 3.3.2 前端错误恢复
```javascript
// 前端处理错误响应
async function handleResponse(response, lineId) {
    if (response.status === 'error') {
        // 检查是否是该线路的响应
        if (response.line_id !== lineId) {
            console.error('Line ID mismatch!');
            return;
        }
        
        if (response.retry?.suggested) {
            // 自动重试
            setTimeout(() => {
                retryRequest(lineId);
            }, response.retry.delay);
        }
    }
}
```

## 4. 性能优化建议

### 4.1 缓存策略
```javascript
// n8n可以实现简单的内存缓存
const cache = {};

// 缓存生成的内容
function cacheResult(key, data) {
    cache[key] = {
        data,
        timestamp: Date.now(),
        ttl: 3600000  // 1小时过期
    };
}

// 检查缓存
function getFromCache(key) {
    const cached = cache[key];
    if (cached && Date.now() - cached.timestamp < cached.ttl) {
        return cached.data;
    }
    return null;
}
```

### 4.2 批处理优化
如果用户快速切换线路，可以批量获取：

```javascript
// 批量请求
POST /webhook/batch-status
{
    "line_ids": ["line_1", "line_2", "line_3"],
    "session_id": "user_123_session_456"
}

// 批量响应
{
    "line_1": { "step": "outline", "progress": 100 },
    "line_2": { "step": "novel", "progress": 45 },
    "line_3": { "step": "idea", "progress": 100 }
}
```

## 5. 监控和日志

### 5.1 请求追踪
```javascript
// n8n中添加日志节点
const log = {
    request_id: generateUUID(),
    line_id: $json.line_id,
    session_id: $json.session_id,
    step: $json.step,
    timestamp: new Date().toISOString(),
    input_size: JSON.stringify($json).length,
    processing_time: null  // 结束时计算
};

// 保存到数据库或文件
```

### 5.2 监控指标
- 每条线路的平均生成时间
- 失败率和重试次数
- 并发请求数
- 内存使用情况

## 6. 安全考虑

### 6.1 输入验证
```javascript
// 防止注入攻击
function sanitizeInput(input) {
    // 移除潜在的恶意代码
    const cleaned = input
        .replace(/<script>/gi, '')
        .replace(/<\/script>/gi, '')
        .replace(/javascript:/gi, '');
    
    // 限制长度
    if (cleaned.length > 10000) {
        throw new Error('Input too long');
    }
    
    return cleaned;
}
```

### 6.2 频率限制
```javascript
// 简单的频率限制
const requestCounts = {};

function checkRateLimit(sessionId) {
    const key = `${sessionId}_${Date.now() / 60000 | 0}`; // 每分钟
    requestCounts[key] = (requestCounts[key] || 0) + 1;
    
    if (requestCounts[key] > 10) {  // 每分钟最多10次
        throw new Error('Rate limit exceeded');
    }
}
```

## 7. 测试建议

### 7.1 测试场景
1. **单线路测试**：确保基本功能正常
2. **多线路并发**：同时生成3条线路
3. **线路切换**：快速切换查看
4. **错误恢复**：模拟网络中断
5. **数据一致性**：验证line_id正确

### 7.2 压力测试
```bash
# 使用curl测试并发
for i in {1..3}; do
    curl -X POST https://n8n.games/webhook/xxx \
        -H "Content-Type: application/json" \
        -d "{\"line_id\":\"line_$i\",\"session_id\":\"test\"}" &
done
```

## 8. 总结

### 关键要点
1. ✅ **每次请求必须带line_id**
2. ✅ **完整传递上下文信息**
3. ✅ **响应中返回line_id验证**
4. ✅ **添加请求间隔避免混淆**
5. ✅ **实现错误重试机制**

### 实施优先级
1. **P0**：line_id参数支持（必须）
2. **P1**：完整上下文传递（必须）
3. **P2**：错误处理（重要）
4. **P3**：缓存优化（可选）

---

**文档版本**：1.0.0  
**更新时间**：2024-01-20  
**作者**：AI助手