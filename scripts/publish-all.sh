#!/usr/bin/env bash
# 四端同步发布：本地构建 → GitHub(main) → GitHub Pages(gh-pages) → Mypage。
#
# 用法：
#   ./scripts/publish-all.sh -m "改动说明"            # 全流程（含 commit + push + publish）
#   ./scripts/publish-all.sh -m "改动说明" --no-commit # 工作区已 commit 时跳过 commit
#   ./scripts/publish-all.sh -m "改动说明" --no-watch  # 跳过 Pages 构建轮询
#   ./scripts/publish-all.sh -m "改动说明" --only mypage  # 只发某一端
#
# 前提：
#   - mypage CLI 已登录（mypage whoami 能返回 username）
#   - 目标 Mypage 项目已存在（默认取 MYPAGE_PROJECT_ID）
set -euo pipefail
cd "$(dirname "$0")/.."

# ── 可覆盖配置 ──
MYPAGE_PROJECT_ID="${MYPAGE_PROJECT_ID:-4669}"
PAGES_URL="https://cedric-chan.github.io/AimosMLOps/"
MYPAGE_URL="https://mypage.shopee.io/p/cedric-chencan/aimos-aio/"

NOTE=""
DO_COMMIT=true
WATCH=true
ONLY=""          # "" = 全部；local/github/pages/mypage 之一

while [ $# -gt 0 ]; do
  case "$1" in
    -m|--message) NOTE="${2:-}"; shift 2 ;;
    --no-commit)  DO_COMMIT=false; shift ;;
    --no-watch)   WATCH=false; shift ;;
    --only)       ONLY="${2:-}"; shift 2 ;;
    -h|--help)    sed -n '2,18p' "$0"; exit 0 ;;
    *) echo "✗ 未知参数：$1" >&2; exit 1 ;;
  esac
done

if [ -z "$NOTE" ]; then
  echo "✗ 必须用 -m \"改动说明\" 提供版本说明（会作为 commit message 与 Mypage 版本 note）" >&2
  exit 1
fi

want() { [ -z "$ONLY" ] || [ "$ONLY" = "$1" ]; }

# ── 0. 提交源码（可选） ──
# 只提交 demo 相关路径，避免把无关的文档改动卷进版本说明不符的提交。
# 需要连其他改动一起提交时，用 -p / --paths 显式指定，或自己 commit 后带 --no-commit。
DEMO_PATHS="index.html assets apps scripts AGENTS.md README.md docs/platform/module-inventory.md docs/orches-service docs/agent-service"
if [ "$DO_COMMIT" = true ] && want github; then
  if [ -n "$(git status --porcelain -- $DEMO_PATHS)" ]; then
    echo "▶ 0/4 提交 demo 相关变更"
    git add -A -- $DEMO_PATHS
    git commit -q -m "$NOTE"
    echo "   已提交：$(git log -1 --format='%h %s')"
  else
    echo "▶ 0/4 demo 相关路径无变更"
  fi
  OTHER=$(git status --porcelain | grep -vE "($(echo $DEMO_PATHS | tr ' ' '|'))" || true)
  if [ -n "$OTHER" ]; then
    echo "   ⚠ 还有未提交的非 demo 改动（本次不提交、不推送）："
    echo "$OTHER" | sed 's/^/     /'
  fi
fi

# ── 1. 组装（所有端都依赖它，永远先构建） ──
echo "▶ 1/4 组装站点 → local-dist/"
./scripts/assemble.sh
echo "   本地预览：cd local-dist && python3 -m http.server 8090"

# ── 2. GitHub main ──
if want github; then
  echo "▶ 2/4 推送源码 → GitHub origin/main"
  if [ -n "$(git status --porcelain -- $DEMO_PATHS)" ]; then
    echo "✗ demo 相关路径仍有未提交变更，拒绝推送" >&2
    git status --short -- $DEMO_PATHS >&2
    exit 1
  fi
  git push -q origin main
  echo "   已推送：$(git rev-parse --short HEAD)"
fi

# ── 3. GitHub Pages (gh-pages) ──
NEW_GH_SHA=""
WORK=""
STAGE=""
cleanup() { [ -n "$WORK" ] && rm -rf "$WORK"; [ -n "$STAGE" ] && rm -rf "$STAGE"; }
trap cleanup EXIT

if want pages; then
  echo "▶ 3/4 发布 → GitHub Pages (gh-pages)"
  WORK=$(mktemp -d)
  git clone --quiet https://github.com/Cedric-Chan/AimosMLOps.git "$WORK"
  git -C "$WORK" checkout --quiet gh-pages
  git -C "$WORK" rm -rqf .
  cp -r local-dist/. "$WORK"/
  git -C "$WORK" add -A
  if git -C "$WORK" diff --cached --quiet; then
    echo "   gh-pages 无变化，跳过"
  else
    git -C "$WORK" commit --quiet -m "deploy: $(date '+%F %T') — $NOTE"
    git -C "$WORK" push --quiet origin gh-pages
    echo "   已推送 gh-pages"
  fi
  NEW_GH_SHA=$(git -C "$WORK" rev-parse HEAD)

  if [ "$WATCH" = true ] && command -v gh > /dev/null; then
    echo "   轮询 Pages 构建（最长 4 分钟）"
    for i in $(seq 1 24); do
      S=$(gh api repos/Cedric-Chan/AimosMLOps/pages/builds/latest \
            --jq '.status + " @ " + .commit[0:7]' 2>/dev/null || echo "?")
      C=$(echo "$S" | sed 's/.*@ //')
      if [ "${S%% @*}" = "built" ] && [ "$C" = "${NEW_GH_SHA:0:7}" ]; then
        echo "   ✅ Pages 已上线最新内容"
        break
      fi
      sleep 10
    done
  fi
fi

# ── 4. Mypage ──
if want mypage; then
  echo "▶ 4/4 发布 → Mypage (project $MYPAGE_PROJECT_ID)"
  if ! command -v mypage > /dev/null; then
    echo "✗ 找不到 mypage CLI" >&2
    exit 1
  fi
  WHO=$(mypage whoami 2>/dev/null | python3 -c 'import json,sys; print(json.load(sys.stdin)["data"]["username"])' 2>/dev/null || true)
  if [ -z "$WHO" ]; then
    echo "✗ mypage 未登录，请先 mypage login" >&2
    exit 1
  fi

  # Mypage 单独暂存：local-dist 已剔除 visual-check，这里再兜一次底
  STAGE=$(mktemp -d)
  cp -R local-dist/. "$STAGE"/
  find "$STAGE" -name '*.visual-check.*' -delete

  OUT=$(mypage project upload --project-id "$MYPAGE_PROJECT_ID" "$STAGE" \
          --recursive --replace=true --note "$NOTE")
  echo "$OUT" | python3 -c '
import json, sys
d = json.load(sys.stdin)
if not d.get("ok"):
    print("✗ 上传失败：" + str(d.get("error")), file=sys.stderr)
    sys.exit(1)
v = d["data"]
print("   ✅ 版本 {}（id {}）· {} 文件 · {:.1f}MB".format(
    v["version_number"], v["version_id"], v["file_count"], v["total_size"] / 1048576))
'
fi

# ── 汇总 ──
echo
echo "✅ 同步完成"
echo "   - 本地：local-dist/（python3 -m http.server 8090）"
want github && echo "   - 源码：https://github.com/Cedric-Chan/AimosMLOps/commit/$(git rev-parse --short HEAD)"
want pages  && echo "   - Pages：$PAGES_URL"
want mypage && echo "   - Mypage：$MYPAGE_URL"
