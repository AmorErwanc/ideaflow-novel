# AI小说创作平台 - 技术文档

## 项目概述

**IdeaFlow Novel** - 一个智能小说创作平台，通过AI引导用户完成从脑洞到剧本的完整创作流程。

### 核心特性
- 4步顺序工作流：脑洞生成 → 大纲创建 → 小说撰写 → 剧本改编
- 流式输出：实时显示AI生成内容（1-2秒首字延迟）
- 极简XML格式：传输效率提升70%
- 智能状态管理：Webhook链式调用

## 系统架构

### 技术栈
- **前端**：原生JavaScript + Tailwind CSS
- **API**：n8n Webhook（流式输出）
- **数据格式**：极简XML（`<s1><t>标题</t><c>内容</c></s1>`）

### 工作流程
```
用户输入 → API调用 → 流式接收 → 增量解析 → 逐字显示 → 状态更新
```

## 核心实现

### 1. 流式输出系统（V4版本）

#### 数据流格式
```json
{"type":"begin","metadata":{...}}
{"type":"item","content":"<s1>"}
{"type":"item","content":"<t>标题</t>"}
{"type":"end"}
```

#### 状态机解析器
```javascript
const parserState = {
    currentStoryNum: null,    // 当前story编号
    currentTag: null,         // 当前标签(t/c)
    buffer: '',              // 内容缓冲
    stories: new Map()       // 独立状态
};
```

#### 核心特性
- **增量解析**：边接收边处理，避免重复
- **独立状态**：每个story维护独立解析进度
- **智能光标**：标题输入时显示，内容开始时自动移除

### 2. Webhook链管理

每步生成下一步的webhook URL：
- `firstWaithook` → 用于大纲生成
- `secondWaithook` → 用于小说生成  
- `thirdWaithook` → 用于剧本生成

### 3. 状态管理

```javascript
workflowState = {
    ideasGenerated: false,
    outlineGenerated: false,
    novelGenerated: false,
    scriptGenerated: false
}
```

## 开发指南

### 本地开发
```bash
# 方式1：Python服务器
python3 -m http.server 9000

# 方式2：使用启动脚本
./start_server.sh

# 方式3：直接打开HTML
open streaming-test/stream-test-v4.html
```

### 关键文件
- `original/` - 原始同步版本
- `streaming-test/` - 流式输出测试版本
  - `stream-script-v4.js` - 极简XML解析器
  - `stream-test-v4.html` - V4测试页面

### 调试要点
```javascript
console.log('📖 Story开始', storyNum);
console.log('📝 标题:', title);
console.log('📄 内容:', content);
console.log('✅ 完成');
```

## API接口

### 脑洞生成
- **URL**: `https://n8n.games/webhook/bd608722-b6fc-46b7-92b8-bf72d4c991af`
- **参数**: 
  - `genre`: 类型（可选）
  - `plot_holes_count`: 数量（1-15）
  - `Boolean`: true生成/false重新生成

### 响应格式
```xml
<s1><t>标题</t><c>内容</c></s1>
<s2><t>标题</t><c>内容</c></s2>
```

## 性能指标

| 指标 | 原始版本 | 流式V4版本 | 提升 |
|-----|---------|-----------|-----|
| 首字延迟 | 24秒 | 1-2秒 | 92% |
| 传输量 | 800字符 | 230字符 | 70% |
| 解析速度 | 基准 | 3倍 | 200% |

## 待优化项

1. **集成到主应用**（暂缓）
2. **其他步骤流式化**（暂缓）
3. **WebSocket支持**
4. **断点续传**
5. **虚拟滚动**

## 版本历史

- **V1**: 基础流式，整卡片显示
- **V2**: 逐字显示尝试（仅首卡片正常）
- **V3**: 状态机模式，修复多卡片问题
- **V4**: 极简XML格式，性能大幅提升

## 注意事项

1. **不要集成到主应用**（用户明确要求）
2. 流式版本在 `streaming-test/` 独立测试
3. 空输入统一转换为 `null`
4. 工作流严格顺序执行，不可跳步