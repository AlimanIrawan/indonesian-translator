#!/bin/bash

# 印中图译通 - 启动脚本
# 使用方法: ./启动应用.sh

# 颜色定义
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 获取脚本所在目录
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

echo -e "${BLUE}"
echo "╔══════════════════════════════════════╗"
echo "║      印中图译通 - 启动程序          ║"
echo "╚══════════════════════════════════════╝"
echo -e "${NC}"

# 检查 Node.js 是否安装
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ 错误: 未检测到 Node.js${NC}"
    echo "请先安装 Node.js: https://nodejs.org/"
    exit 1
fi

echo -e "${GREEN}✅ Node.js 版本: $(node -v)${NC}"
echo -e "${GREEN}✅ npm 版本: $(npm -v)${NC}"
echo ""

# 检查依赖是否安装
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}📦 首次运行，正在安装依赖...${NC}"
    echo ""
    npm install
    
    if [ $? -ne 0 ]; then
        echo -e "${RED}❌ 依赖安装失败${NC}"
        exit 1
    fi
    echo ""
    echo -e "${GREEN}✅ 依赖安装完成${NC}"
    echo ""
fi

# 检查环境变量文件
if [ ! -f ".env.local" ]; then
    echo -e "${YELLOW}⚠️  警告: 未找到 .env.local 文件${NC}"
    echo "请确保已配置 OpenAI API Key"
    echo ""
fi

echo -e "${BLUE}🚀 正在启动开发服务器...${NC}"
echo ""
echo -e "${GREEN}应用将在浏览器中自动打开${NC}"
echo -e "${GREEN}访问地址: http://localhost:5173${NC}"
echo ""
echo -e "${YELLOW}提示：${NC}"
echo "  - 按 Ctrl+C 可以停止服务器"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# 启动开发服务器
npm run dev

