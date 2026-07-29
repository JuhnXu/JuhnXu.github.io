#!/bin/bash

echo "===== Git 单快照同步开始 ====="


# 当前目录
REPO=$(pwd)


# 检查Git仓库
if [ ! -d ".git" ]; then
    echo "错误: 当前目录不是Git仓库"
    exit 1
fi


# 防止重复运行
LOCK="/tmp/$(basename "$REPO")_snapshot.lock"

if [ -f "$LOCK" ]; then
    echo "已有任务运行"
    exit 1
fi

touch "$LOCK"
trap "rm -f $LOCK" EXIT



echo "===== 添加文件 ====="

git add -A



# 判断是否有变化
if git diff --cached --quiet; then

    echo "没有文件变化"

    exit 0

fi



echo "===== 创建单快照 ====="


# 创建孤立分支
git checkout --orphan temp_snapshot



git commit -m "snapshot $(date '+%Y-%m-%d %H:%M:%S')"



echo "===== 删除旧历史 ====="


git branch -D main 2>/dev/null



git branch -m main



echo "===== 清理Git对象 ====="


git reflog expire --expire=now --all


git gc --prune=now



echo "===== 强制同步远程镜像 ====="


# 检查是否存在origin
if git remote | grep -q "^origin$"; then

    git push -f origin main

else

    echo "没有配置origin，跳过push"

fi



echo "===== 当前状态 ====="


echo "提交数量:"
git rev-list --count HEAD


echo "Git大小:"
du -sh .git



echo "===== 单快照完成 ====="
