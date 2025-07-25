# CLAUDE.md

此文件为 Claude Code (claude.ai/code) 在此代码库中工作时提供指导。

## 项目概述

这是一个AI小说创作平台 - 单页面Web应用程序，引导用户通过4步顺序工作流生成完整的小说和互动脚本。平台使用webhook API链和复杂的状态管理来控制创作过程。

## 开发命令

这是一个静态Web应用程序，无需构建过程。开发很简单：

- **本地开发**: 
  - 方法1: 直接在浏览器中打开 `index.html`
  - 方法2: 使用Python服务器: `python3 -m http.server 8000`
  - 方法3: 使用VS Code Live Server扩展
- **调试**: 使用浏览器开发者工具 (F12)，查看Console和Network面板监控API调用
- **测试**: 无自动化测试 - 通过运行完整工作流来测试功能
- **部署**: 静态文件可部署到任何Web服务器或GitHub Pages

## 核心架构

### 顺序工作流系统
应用程序实现严格的4步工作流，每一步都依赖前一步：

1. **脑洞生成** → 返回 `firstWaithook` 
2. **大纲生成** (使用 `firstWaithook`) → 返回 `secondWaithook`
3. **小说生成** (使用 `secondWaithook`) → 返回 `thirdWaithook` 
4. **脚本生成** (使用 `thirdWaithook`) → 最终输出

### Webhook链管理
- 每个API响应在 `*_waithook` 字段中包含下一步的URL
- URL在使用前用 `url.replace(/[`\s]/g, '')` 清理
- 全局变量存储webhook URLs: `firstWaithook`, `secondWaithook`, `thirdWaithook`

### 状态管理系统
`workflowState` 对象跟踪每步的完成状态：
```javascript
workflowState = {
    ideasGenerated: false,    // 脑洞已生成
    outlineGenerated: false,  // 大纲已生成
    novelGenerated: false,    // 小说已生成
    scriptGenerated: false    // 脚本已生成
}
```

状态变化触发按钮启用/禁用逻辑和UI更新。

### 按钮控制架构
复杂的按钮管理系统包含：
- **加载状态** 在API调用期间显示旋转器和自定义文本
- **永久禁用逻辑** 基于工作流进度
- **按钮组** 在操作期间互斥
- **上下文感知状态** 基于工作流进度显示不同行为

## 关键API集成

### 主要端点
`https://n8n.games/webhook/f6021675-4090-4734-b65d-c7ea7ba1b24a` - 用于初始脑洞生成（快速和自定义模式）

### 数据处理模式
- **灵活响应解析**: 处理数组 `result[0]` 和直接对象格式
- **字段映射**: 支持多种字段名变体 (`synopsis`/`synopsisString`)
- **空值一致性**: 所有空用户输入标准化为 `null`
- **布尔标志**: `Boolean: true` 用于生成, `Boolean: false` 用于重新生成

### 错误处理
- 所有API调用周围的全面try-catch块
- 通过 `showError()` 函数显示用户友好的错误消息
- 优雅处理格式错误的API响应

## UI/UX模式

### 动态内容生成
- **脑洞卡片**: 动态生成，支持点击选择和视觉反馈
- **大纲显示**: 四部分结构（起承转合）带交错动画
- **内容区域**: 随工作流进展逐步显示

### 用户体验功能
- **标签切换** 在快速生成和自定义输入模式之间
- **平滑滚动** 到新生成的内容区域
- **下载功能** 用于小说文本和互动脚本
- **视觉反馈** 包含加载旋转器、动画和状态指示器

## 文件结构

- `index.html`: 完整的UI结构，包含所有工作流区域
- `script.js`: 核心应用逻辑、API处理和状态管理
- `styles.css`: 补充Tailwind CSS的自定义样式
- 外部依赖: 
  - Tailwind CSS v3.3.3 (CDN)
  - Font Awesome v6.7.2 (CDN)

## 重要实现注意事项

### 用户输入处理
- 空用户建议转换为 `null` 以保持API一致性
- 大纲生成前需要选择脑洞（通过验证强制执行）
- 范围滑块控制脑洞数量（1-15）用于自定义生成

### 工作流约束
- 用户不能跳过步骤或在工作流中后退
- 任何步骤的重新生成都会重置所有后续步骤
- 工作流开始后禁用标签切换

### API响应处理
- 响应可能包含需要 `JSON.parse()` 的JSON字符串
- 脚本生成返回纯文本（无需JSON解析）
- 全面记录用于调试API响应格式

## 常见开发任务

### 添加新功能
1. 在 `workflowState` 中添加新状态标志
2. 在 `script.js` 中实现API调用函数
3. 在 `index.html` 中添加UI组件
4. 更新 `updateButtonStates()` 处理新的按钮逻辑

### 调试工作流
1. 检查浏览器Console中的API响应日志
2. 验证 `firstWaithook`, `secondWaithook`, `thirdWaithook` 值
3. 监控 `workflowState` 对象状态变化
4. 使用 `console.log('当前状态:', workflowState)` 跟踪流程

### 修改样式
1. 优先使用Tailwind CSS类
2. 自定义样式写入 `styles.css`
3. 动画效果已在CSS中定义: `fadeIn`, `slideInLeft`等