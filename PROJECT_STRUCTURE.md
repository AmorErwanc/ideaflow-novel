# 项目结构说明

## 📁 目录结构

```
小说互动脚本网页/
│
├── 📄 CLAUDE.md              # Claude AI的项目指导文件
├── 📄 README.md              # 项目说明
├── 📄 PROJECT_STRUCTURE.md   # 项目结构文档（本文件）
│
├── 📁 docs/                  # 文档中心
│   ├── TECHNICAL_DOCS.md     # 统一技术文档（核心）
│   └── program_log.md        # 开发日志
│
├── 📁 original/              # 原始版本（同步输出）
│   ├── index.html            # 主页面
│   ├── script.js             # 核心逻辑
│   └── styles.css            # 样式文件
│
├── 📁 streaming-test/        # 流式输出测试版本
│   ├── stream-script-v4.js   # V4极简XML解析器（最新）
│   ├── stream-test-v4.html   # V4测试页面
│   ├── stream-script-v3.js   # V3状态机版本
│   ├── stream-script-v2.js   # V2逐字显示
│   ├── stream-test-v2.html   # V3测试页面
│   ├── stream-script.js      # V1基础版本
│   └── stream-test.html      # V1测试页面
│
├── 📁 ideaflow-novel/        # 未来集成版本（预留）
│
├── 📄 start_server.sh        # 快速启动脚本
└── 📄 test.html              # 服务器测试页

```

## 🚀 快速开始

### 启动本地服务器
```bash
# 方式1：使用启动脚本（推荐）
./start_server.sh

# 方式2：Python服务器
python3 -m http.server 9000

# 方式3：直接打开HTML
open streaming-test/stream-test-v4.html
```

### 访问地址
- 测试页：http://localhost:9000/test.html
- V4流式版：http://localhost:9000/streaming-test/stream-test-v4.html
- 原始版：http://localhost:9000/original/index.html

## 🔑 核心文件说明

### 文档文件
- **docs/TECHNICAL_DOCS.md** - 完整技术文档（必读）
- **CLAUDE.md** - Claude AI专用指导
- **docs/program_log.md** - 开发历程记录

### 代码文件
- **stream-script-v4.js** - 最新流式解析器，支持极简XML
- **original/script.js** - 原始同步版本主逻辑

## 📊 版本对比

| 版本 | 位置 | 特性 | 状态 |
|-----|------|------|------|
| 原始版 | /original | 同步输出，24秒等待 | 稳定 |
| V4流式版 | /streaming-test | 逐字显示，1-2秒响应 | 测试中 |
| 集成版 | /ideaflow-novel | 完整功能整合 | 待开发 |

## ⚠️ 注意事项

1. **流式版本独立测试** - 不要集成到主应用（用户要求）
2. **使用V4版本** - 最新优化，性能最佳
3. **查看技术文档** - docs/TECHNICAL_DOCS.md包含所有技术细节