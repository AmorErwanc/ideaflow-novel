# 项目文件结构说明

## 📁 项目目录结构

```
小说互动脚本网页/
│
├── 📂 original/              # 原始版本（同步API）
│   ├── index.html            # 主页面
│   ├── script.js             # 核心逻辑
│   └── styles.css            # 样式文件
│
├── 📂 streaming-test/        # 流式输出测试版本
│   ├── stream-test.html      # V1测试页面（卡片级别）
│   ├── stream-test-v2.html   # V2测试页面（字符级别）
│   ├── stream-script.js      # V1流式脚本
│   ├── stream-script-v2.js   # V2流式脚本（有bug）
│   └── stream-script-v3.js   # V3流式脚本（已修复）
│
├── 📂 ideaflow-novel/        # 最终集成版本（待开发）
│   └── (待集成的生产版本)
│
├── 📂 docs/                  # 项目文档
│   └── program_log.md        # 开发日志
│
├── README.md                 # 项目说明
├── CLAUDE.md                 # Claude AI开发指南
└── PROJECT_STRUCTURE.md     # 本文件

```

## 🔄 版本说明

### 1. Original（原始版本）
- **特点**：传统请求-响应模式
- **等待时间**：约24秒
- **用户体验**：需要等待所有内容生成完毕
- **状态**：稳定运行

### 2. Streaming-Test（流式测试版本）
- **V1**：实现卡片级别的流式显示
- **V2**：尝试字符级别显示（仅第一个卡片正常）
- **V3**：修复多卡片逐字显示问题（当前最新）
- **特点**：真正的打字机效果
- **状态**：测试通过

### 3. IdeaFlow-Novel（生产版本）
- **状态**：待开发
- **目标**：整合流式输出到完整工作流
- **包含**：脑洞、大纲、小说、脚本全流程

## 🚀 快速开始

### 测试原始版本
```bash
cd original
python3 -m http.server 8000
# 访问 http://localhost:8000
```

### 测试流式版本
```bash
cd streaming-test
python3 -m http.server 8888
# 访问 http://localhost:8888/stream-test-v2.html
```

## 📝 开发进度

- ✅ 原始版本完成
- ✅ 流式输出V1（卡片级别）
- ✅ 流式输出V2（字符级别尝试）
- ✅ 流式输出V3（修复多卡片问题）
- ⏳ 集成到主应用
- ⏳ 其他步骤流式化（大纲、小说、脚本）

## 🔗 相关文档

- [开发日志](docs/program_log.md) - 详细的开发过程记录
- [Claude指南](CLAUDE.md) - Claude AI的开发约定
- [项目README](README.md) - 项目整体说明