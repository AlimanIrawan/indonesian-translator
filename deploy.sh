#!/bin/bash

echo "🚀 印中图译通 - 一键部署到 Vercel"
echo "================================="
echo ""

# 检查是否安装了 git
if ! command -v git &> /dev/null; then
    echo "❌ 未检测到 Git，请先安装 Git"
    echo "下载地址: https://git-scm.com/download/mac"
    exit 1
fi

echo "✅ Git 已安装"
echo ""

# 检查是否已初始化 git
if [ ! -d .git ]; then
    echo "📦 初始化 Git 仓库..."
    git init
    git add .
    git commit -m "Initial commit: 印中图译通"
    git branch -M main
    echo "✅ Git 仓库初始化完成"
else
    echo "✅ Git 仓库已存在"
fi

echo ""
echo "📋 接下来的步骤："
echo ""
echo "1️⃣  创建 GitHub 仓库"
echo "   访问: https://github.com/new"
echo "   仓库名建议: indonesian-translator"
echo ""
echo "2️⃣  关联远程仓库并推送"
echo "   git remote add origin https://github.com/你的用户名/仓库名.git"
echo "   git push -u origin main"
echo ""
echo "3️⃣  部署到 Vercel"
echo "   访问: https://vercel.com"
echo "   点击 'Import Project' 选择你的 GitHub 仓库"
echo ""
echo "4️⃣  配置环境变量"
echo "   在 Vercel 项目设置中添加:"
echo "   OPENAI_API_KEY = 你的OpenAI密钥"
echo ""
echo "5️⃣  部署完成！"
echo "   访问 Vercel 提供的 URL 即可使用"
echo ""
echo "================================="
echo ""

# 询问是否需要帮助创建 GitHub 仓库
read -p "是否需要打开 GitHub 创建仓库页面? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    open "https://github.com/new"
fi

echo ""
echo "📖 查看完整部署指南: 部署指南.md"
echo ""

