#!/usr/bin/env bash
# 一键部署：组装站点 → main/gh-pages 推 GitLab → push mirror 同步 GitHub → Pages 自动重建。
#
# 前提：工作区已 commit（本脚本不会自动提交源码变更）。
# 用法：./scripts/deploy.sh [--no-watch]
#   --no-watch  跳过部署后的 Pages 构建状态轮询
set -euo pipefail
cd "$(dirname "$0")/.."

REPO_GITLAB="https://git.garena.com/cedric.chencan/AimosMLOps.git"
PAGES_URL="https://cedric-chan.github.io/AimosMLOps/"
WATCH=true
[ "${1:-}" = "--no-watch" ] && WATCH=false

# 工作区必须干净（避免把未审核的改动卷进部署）
if [ -n "$(git status --porcelain)" ]; then
  echo "✗ 工作区有未提交变更，请先 commit 后再部署" >&2
  git status --short >&2
  exit 1
fi

echo "▶ 1/3 组装站点"
./scripts/assemble.sh

echo "▶ 2/3 推送源码 main → GitLab（push mirror 自动同步 GitHub）"
git push gitlab-mlops main

echo "▶ 3/3 发布 gh-pages → GitLab（push mirror 同步 GitHub，内置 hook 自动重建 Pages）"
WORK=$(mktemp -d)
trap 'rm -rf "$WORK"' EXIT
git clone --quiet "$REPO_GITLAB" "$WORK"
git -C "$WORK" checkout --quiet gh-pages
git -C "$WORK" rm -rqf .
cp -r local-dist/. "$WORK"/
git -C "$WORK" add -A

if git -C "$WORK" diff --cached --quiet; then
  echo "gh-pages 无变化，跳过发布"
else
  git -C "$WORK" commit --quiet -m "deploy: $(date '+%F %T') via scripts/deploy.sh"
  git -C "$WORK" push --quiet origin gh-pages
  echo "已推送 gh-pages（镜像将自动同步 GitHub）"
fi
NEW_GH_SHA=$(git -C "$WORK" rev-parse HEAD)

echo "✅ GitLab 已更新"
echo "   - 源码：https://git.garena.com/cedric.chencan/AimosMLOps"
echo "   - Pages 站点（约 1-2 分钟后自动重建）：$PAGES_URL"

# ── 轮询 GitHub Pages 构建状态（可选） ──
if [ "$WATCH" = true ] && command -v gh > /dev/null; then
  echo "▶ 轮询 GitHub Pages 构建状态（最长 4 分钟，--no-watch 可跳过）"
  for i in $(seq 1 24); do
    S=$(gh api repos/Cedric-Chan/AimosMLOps/pages/builds/latest --jq '.status + " @ " + .commit[0:7]' 2>/dev/null || echo "?")
    echo "  [$i] $S"
    C=$(echo "$S" | sed 's/.*@ //')
    if [ "${S%% @*}" = "built" ] && [ "$C" = "${NEW_GH_SHA:0:7}" ]; then echo "  ✅ 最新内容已上线"; break; fi
    sleep 10
  done
fi
