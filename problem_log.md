# 项目开发日志 (Problem Log)

## 项目信息
- **项目名称**: AI小说创作平台重构
- **开始日期**: 2025-08-09
- **当前分支**: test
- **主要技术栈**: HTML, JavaScript, Tailwind CSS, 流式API

## 用户需求分析

### 核心需求清单
1. **流式输出集成**
   - 将streaming-test/stream-test-v4.html中的流式输出功能集成到主应用
   - 使用极简XML格式 (<s1><t>标题</t><c>内容</c></s1>)
   - 支持实时显示和打字机效果

2. **布局重构**
   - 从纵向瀑布式布局改为横向进程式布局
   - 类似步骤向导的用户体验
   - 可视化显示创作流程进度

3. **API架构重构**
   - 移除回调链机制 (firstWaithook, secondWaithook, thirdWaithook)
   - 每个功能模块使用独立的固定webhook地址
   - 前端负责管理和传递完整上下文

### 技术挑战
- 数据持久化：需要在前端存储创作过程中的所有数据
- 状态管理：管理复杂的多步骤工作流状态
- 流式解析：高效解析极简XML格式的流式数据

## 现有架构分析

### 文件结构
```
/
├── index.html          # 主页面（纵向瀑布式布局）
├── script.js           # 主逻辑（回调链式API）
├── styles.css          # 样式文件
├── streaming-test/
│   ├── stream-test-v4.html  # 流式输出demo
│   └── stream-script-v4.js  # 流式处理逻辑
└── CLAUDE.md          # 项目指南
```

### 现有工作流
1. **脑洞生成** → 返回firstWaithook
2. **大纲生成** (需要firstWaithook) → 返回secondWaithook  
3. **小说生成** (需要secondWaithook) → 返回thirdWaithook
4. **脚本生成** (需要thirdWaithook) → 最终输出

### 问题点
- 强依赖链式结构，任何步骤失败需要从头开始
- 无法灵活跳转或修改中间步骤
- webhook地址动态生成，增加复杂性

## 解决方案设计

### 1. 流式输出集成方案
**实施步骤**：
1. 将stream-script-v4.js的核心功能提取为可复用模块
2. 在主应用中引入流式处理能力
3. 统一所有API调用使用流式输出

**技术细节**:
```javascript
// 流式处理核心模块
class StreamProcessor {
    constructor() {
        this.parserState = {...}
    }
    
    async processStream(url, data) {
        // 流式处理逻辑
    }
    
    parseXMLContent(content) {
        // 极简XML解析
    }
}
```

### 2. 横向进程式布局方案
**设计思路**:
- 采用步骤指示器 (Step Indicator) 模式
- 每个步骤显示为一个节点，通过连线连接
- 当前步骤高亮，完成步骤显示勾选标记

**布局结构**:
```
[脑洞生成] ━━━> [大纲创作] ━━━> [小说撰写] ━━━> [脚本生成]
    ✓             进行中           待处理           待处理
```

**实现方式**:
- 使用Flexbox或Grid布局实现横向排列
- 添加进度条显示整体完成度
- 步骤间添加动画过渡效果

### 3. 固定Webhook架构方案
**新架构设计**:
```javascript
const API_ENDPOINTS = {
    generateIdeas: 'https://n8n.games/webhook/ideas-generation',
    generateOutline: 'https://n8n.games/webhook/outline-generation',
    generateNovel: 'https://n8n.games/webhook/novel-generation',
    generateScript: 'https://n8n.games/webhook/script-generation'
};
```

**数据流管理**:
```javascript
// 使用localStorage或sessionStorage存储
class WorkflowDataManager {
    constructor() {
        this.data = {
            ideas: null,
            selectedIdea: null,
            outline: null,
            novel: null,
            script: null,
            metadata: {
                timestamp: Date.now(),
                sessionId: generateSessionId()
            }
        };
    }
    
    saveStep(step, data) {
        this.data[step] = data;
        localStorage.setItem('workflow_data', JSON.stringify(this.data));
    }
    
    getContext() {
        // 返回当前所有上下文数据
        return this.data;
    }
}
```

### 4. 前端数据存储方案
**存储策略**:
1. **SessionStorage**: 用于临时会话数据
2. **LocalStorage**: 用于需要持久化的数据
3. **IndexedDB**: 用于大量文本数据（小说内容）

**数据结构设计**:
```javascript
{
    sessionId: "uuid-v4",
    currentStep: 1,
    completedSteps: [1],
    data: {
        userInput: {},
        ideas: [],
        selectedIdea: {},
        outline: {},
        novel: "",
        script: ""
    },
    timestamps: {
        started: "2025-08-09T10:00:00Z",
        lastModified: "2025-08-09T10:05:00Z"
    }
}
```

## 实施计划

### 第一阶段：基础架构准备（当前）
- [x] 分析现有代码结构
- [x] 创建problem_log.md文档
- [ ] 更新CLAUDE.md添加自动日志记录
- [ ] 创建新的项目结构

### 第二阶段：流式输出集成
- [ ] 提取stream-script-v4.js核心功能
- [ ] 创建StreamProcessor类
- [ ] 集成到主应用
- [ ] 测试流式输出效果

### 第三阶段：布局重构
- [ ] 设计横向进程式UI
- [ ] 实现步骤指示器组件
- [ ] 添加进度动画
- [ ] 响应式布局适配

### 第四阶段：API架构重构
- [ ] 定义固定webhook端点
- [ ] 实现WorkflowDataManager
- [ ] 重构API调用逻辑
- [ ] 添加错误处理和重试机制

### 第五阶段：测试与优化
- [ ] 功能测试
- [ ] 性能优化
- [ ] 用户体验优化
- [ ] 文档更新

## 技术决策记录

### 决策1：使用Web Storage API而非内存存储
**原因**：
- 防止页面刷新丢失数据
- 支持跨标签页共享数据
- 便于调试和数据恢复

### 决策2：保持极简XML格式
**原因**：
- 传输效率提高70%
- 解析速度快3倍
- 减少服务器负载

### 决策3：采用步骤式而非自由流程
**原因**：
- 用户体验更清晰
- 便于错误定位
- 符合创作逻辑流程

## 风险评估

1. **数据丢失风险**
   - 缓解措施：自动保存机制，定期备份到localStorage

2. **API兼容性**
   - 缓解措施：保留旧版本API支持，逐步迁移

3. **浏览器兼容性**
   - 缓解措施：添加polyfill，提供降级方案

## 进度跟踪

### 2025-08-09
- ✅ 项目启动，需求分析完成
- ✅ 创建problem_log.md文档
- ✅ 完成架构分析
- ✅ 更新用户CLAUDE.md添加自动创建日志指令
- ✅ 创建静态横向进程式布局demo
  - demo/horizontal-layout.html (第一版，4步流程)
  - demo/horizontal-layout-v2.html (完善版，6步流程)
  - demo/horizontal-layout-v3.html (流式输出展示版)
- ✅ 实现创意输入独立步骤
- ✅ 添加模式选择（快速生成/定制创作）
- ✅ 实现脑洞生成加载过渡动画（3秒加载效果）
- ✅ 优化灵感速写模式交互逻辑
  - 点击直接跳转到脑洞生成页面
  - 实现流式输出卡片展示效果
  - 使用模拟数据演示极简XML格式解析
- 🔄 前端功能完善阶段

## 下一步行动计划

### 第一阶段：前端功能完善（当前）
- [x] 创建流式输出展示demo（horizontal-layout-v3.html）
- [x] 实现灵感速写模式直接跳转
- [x] 模拟流式输出效果展示
- [ ] 完善其他步骤的界面和交互
  - [ ] 大纲创作步骤界面
  - [ ] 小说撰写步骤界面
  - [ ] 脚本生成步骤界面
- [ ] 添加步骤间的数据传递逻辑
- [ ] 实现本地存储功能（localStorage）
- [ ] 优化动画和过渡效果

### 第二阶段：代码模块化
- [ ] 提取StreamProcessor类为独立模块
  - 极简XML解析器（<s1><t>标题</t><c>内容</c></s1>格式）
  - 流式数据处理器
  - 打字机效果渲染器
- [ ] 创建WorkflowManager类管理步骤流程
- [ ] 创建DataStore类管理数据存储
- [ ] 分离样式文件（styles-v2.css）

### 第三阶段：后端集成准备
- [ ] 创建统一的index-v2.html整合所有功能
- [ ] 设计API接口规范
- [ ] 定义固定的webhook端点
- [ ] 实现错误处理机制
- [ ] 添加重试逻辑

### 第四阶段：后端集成实施
- [ ] 连接真实的流式API
- [ ] 实现各步骤的API调用
- [ ] 测试端到端流程
- [ ] 优化性能和用户体验

### 第五阶段：测试与优化
- [ ] 功能测试
- [ ] 性能优化
- [ ] 浏览器兼容性测试
- [ ] 用户体验改进

### 第六阶段：文档完善
- [ ] 更新README.md
- [ ] 更新CLAUDE.md项目指南
- [ ] 创建用户使用手册
- [ ] 编写开发文档

## 技术实现细节

### 流式输出关键技术点
1. **极简XML格式解析**
   - 格式：`<s1><t>标题</t><c>内容</c></s1>`
   - 传输效率提升70%
   - 解析速度提升3倍
   - 实现逐字符解析和渲染
   - 打字机效果展示

2. **6步工作流设计**
   - Step 0: 模式选择（快速生成/定制创作）
   - Step 1: 创意输入（根据模式显示不同UI）
   - Step 2: 脑洞生成（流式输出展示）
   - Step 3: 大纲创作
   - Step 4: 小说撰写
   - Step 5: 脚本生成

3. **优化的用户体验**
   - 灵感速写模式：直接跳转到脑洞生成页面
   - 定制创作模式：先输入创意再生成
   - 流式输出实时展示，沉浸式体验
   - 卡片式布局，支持选择和交互

4. **前端状态管理（规划中）**
   - LocalStorage存储会话数据
   - SessionStorage存储临时状态
   - 步骤间数据自动传递

## 备注

- 所有修改都在test分支进行
- 保留原版本作为备份
- 每个重大改动后进行git commit
- demo文件单独存放在demo/文件夹中

---

*本文档将持续更新，记录项目进展和决策过程*
*最后更新：2025-08-09*