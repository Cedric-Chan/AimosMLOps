#!/usr/bin/env bash
# 组装 Aimos MLOps 本地/CI 站点：平台壳 + apps/ 下全部应用。
# 动态遍历 apps/*/（有 dist 用 dist，无 dist 直接拷贝静态源），
# 新增应用无需再改组装清单。
set -euo pipefail
cd "$(dirname "$0")/.."

rm -rf local-dist
mkdir -p local-dist/apps
cp index.html local-dist/
cp -r assets local-dist/
touch local-dist/.nojekyll

for dir in apps/*/; do
  name=$(basename "$dir")
  if [ -d "$dir/dist" ]; then
    cp -r "$dir/dist" "local-dist/apps/$name"
  else
    cp -r "$dir" "local-dist/apps/$name"
  fi
done

echo "assembled: $(ls local-dist/apps | tr '\n' ' ')"
