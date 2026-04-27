#!/usr/bin/env bash

# stdin の JSON からファイルパスを取得（Windows パス区切りを正規化）
FP=$(node -e '
let raw = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", d => raw += d);
process.stdin.on("end", () => {
  try {
    const fp = (JSON.parse(raw).tool_input || {}).file_path || "";
    console.log(fp.replace(/\\/g, "/"));
  } catch (_) {
    console.log("");
  }
});
')

# マイグレーションファイルでなければスルー
if ! echo "$FP" | grep -qE 'db/migration/V[0-9]+__.*\.sql'; then
  exit 0
fi

# 現在のブランチを取得
BRANCH=$(git branch --show-current 2>/dev/null || echo '')

# feature/* または fix/* ブランチなら許可
if echo "$BRANCH" | grep -qE '^(feature|fix)/'; then
  exit 0
fi

# develop または main ブランチなら警告して確認を求める
if [ "$BRANCH" = "develop" ] || [ "$BRANCH" = "main" ]; then
  printf 'develop/main ブランチで直接マイグレーションファイルを編集しようとしています。\n feature または fix ブランチで作業することを推奨します。続行しますか？\n' >&2
  exit 2
fi

# その他のブランチはスルー
exit 0
