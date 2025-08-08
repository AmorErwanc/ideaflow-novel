#!/bin/bash
# 快速启动服务器脚本

echo "🚀 正在启动服务器..."
echo "📁 当前目录: $(pwd)"
echo "🌐 访问地址: http://localhost:9000"
echo ""
echo "可用页面："
echo "  - http://localhost:9000/test.html (测试页)"
echo "  - http://localhost:9000/streaming-test/stream-test-v4.html (V4极简版)"
echo "  - http://localhost:9000/streaming-test/stream-test-v2.html (V3版)"
echo "  - http://localhost:9000/original/index.html (原始版)"
echo ""
echo "按 Ctrl+C 停止服务器"
echo "----------------------------------------"

# 启动Python服务器
python3 -m http.server 9000