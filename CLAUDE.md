# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

AI小说创作平台 - 单页面Web应用，通过4步顺序工作流生成完整小说和互动脚本。使用webhook API链和状态管理控制创作流程。

## 开发命令

```bash
# 本地开发
python3 -m http.server 8000  # 推荐方式
open index.html              # 直接打开

# 调试
# 使用浏览器开发者工具 (F12) - Console和Network面板监控API调用

# 测试V4流式输出
open streaming-test/stream-test-v4.html
```

## 核心架构

### 工作流系统
严格的4步链式依赖，每步返回下一步所需的webhook URL：

1. **脑洞生成** → `firstWaithook`
2. **大纲生成** (需要 `firstWaithook`) → `secondWaithook`  
3. **小说生成** (需要 `secondWaithook`) → `thirdWaithook`
4. **脚本生成** (需要 `thirdWaithook`) → 最终输出

### 状态管理
```javascript
workflowState = {
    ideasGenerated: false,    // 脑洞已生成
    outlineGenerated: false,  // 大纲已生成
    novelGenerated: false,    // 小说已生成
    scriptGenerated: false    // 脚本已生成
}
```

### Webhook链处理
- URL清理: `url.replace(/[`\s]/g, '')`
- 全局变量: `firstWaithook`, `secondWaithook`, `thirdWaithook`
- 每步失败需从头开始（链式依赖限制）

## API集成细节

### 主端点
`https://n8n.games/webhook/bd608722-b6fc-46b7-92b8-bf72d4c991af`

### 响应处理模式
- 数组格式: `result[0]` 
- 对象格式: 直接访问
- 字段映射: `synopsis`/`synopsisString`
- 空值处理: 用户空输入转换为 `null`
- 布尔标志: `Boolean: true` (生成) / `Boolean: false` (重新生成)

### 错误处理
- try-catch包装所有API调用
- `showError()` 显示用户友好错误
- 控制台日志记录调试信息

## 文件结构

```
主应用:
├── index.html         # UI结构，工作流区域
├── script.js          # 核心逻辑，API处理，状态管理
├── styles.css         # 自定义样式，动画定义
│
流式输出测试:
└── streaming-test/
    ├── stream-test-v4.html    # V4测试页面
    └── stream-script-v4.js    # V4流式解析实现
```

## 分支策略

- `main` - 稳定版本 (commit: 7363452)
- `test` - 测试版本 (包含V4流式输出)
- `experimental-features` - 所有实验性功能

## 关键实现细节

### 按钮状态管理
- 加载时显示旋转器和自定义文本
- 基于工作流进度的永久禁用逻辑
- 按钮组互斥控制
- `updateButtonStates()` 统一管理

### 用户输入验证
- 脑洞选择强制验证
- 空输入转换为 `null`
- 范围滑块控制 (1-15)
- 工作流开始后禁用tab切换

### API响应格式
- JSON字符串需 `JSON.parse()`
- 脚本生成返回纯文本
- 灵活处理嵌套JSON结构

## 常见开发任务

### 添加新功能流程
1. 在 `workflowState` 添加状态标志
2. 在 `script.js` 实现API调用
3. 在 `index.html` 添加UI组件  
4. 更新 `updateButtonStates()` 逻辑

### 调试工作流
```javascript
console.log('当前状态:', workflowState);
console.log('Webhook URLs:', {firstWaithook, secondWaithook, thirdWaithook});
// 检查Network面板的API响应
```

### 样式修改
- 优先使用Tailwind CSS类
- 自定义样式写入 `styles.css`
- 动画: `fadeIn`, `slideInLeft`, `fadeInUp`