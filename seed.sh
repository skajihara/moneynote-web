#!/bin/bash
# ===========================================================
# MoneyNote シードデータ投入スクリプト (Bash / Git Bash 版)
# ===========================================================

BASE_URL="${BASE_URL:-https://localhost}"
CURRENT_YEAR=$(date +%Y)
CURRENT_MONTH_RAW=$(date +%m)
CURRENT_MONTH=$(( 10#$CURRENT_MONTH_RAW ))

# ─── 依存確認 ────────────────────────────────────────────────
# Windows ストアのスタブは command -v で見つかるが実際には動かないため import sys で動作確認する
if python3 -c "import sys" 2>/dev/null; then PY="python3"
elif python -c "import sys" 2>/dev/null; then PY="python"
else echo "ERROR: python3 が必要です。インストールしてください。"; exit 1; fi

# ─── ヘルパー ────────────────────────────────────────────────
step()  { echo ""; echo "=== $* ==="; }
ok()    { echo "  ✓ $*"; }
warn()  { echo "  ✗ ERROR: $*"; }

api_post() {
  local ep=$1 body=$2 token=$3
  local args=(-sk -X POST "${BASE_URL}${ep}" -H "Content-Type: application/json" -d "$body")
  [ -n "$token" ] && args+=(-H "Authorization: Bearer $token")
  curl "${args[@]}"
}
api_put() {
  curl -sk -X PUT "${BASE_URL}$1" -H "Content-Type: application/json" \
       -H "Authorization: Bearer $3" -d "$2"
}
api_get() {
  curl -sk -X GET "${BASE_URL}$1" -H "Authorization: Bearer $2"
}

# JSON値取得: json_get "$resp" "data.accessToken"
json_get() {
  printf '%s' "$1" | $PY -c "
import sys,json
try:
    d=json.load(sys.stdin)
    for k in '$2'.split('.'):
        if k: d=d[k] if not k.isdigit() else d[int(k)]
    print('' if d is None else d,end='')
except: pass
" 2>/dev/null
}

# 配列からcategoryNameで検索してcategoryIdを返す
find_cat() {
  printf '%s' "$1" | $PY -c "
import sys,json
cats=json.load(sys.stdin)['data']
for c in cats:
    if c['categoryName']=='$2': print(c['categoryId'],end=''); break
" 2>/dev/null
}

# 配列からledgerNameで検索してledgerIdを返す (未指定なら先頭)
find_ledger() {
  printf '%s' "$1" | $PY -c "
import sys,json
ls=json.load(sys.stdin)['data']
name='$2'
for l in ls:
    if name and l.get('ledgerName')==name: print(l['ledgerId'],end=''); break
else:
    if not name and ls: print(ls[0]['ledgerId'],end='')
" 2>/dev/null
}

ok_or_warn() {
  local resp="$1" label="$2"
  local em
  em=$(printf '%s' "$resp" | $PY -c "
import sys,json
d=json.load(sys.stdin)
e=d.get('error')
print(e['message'] if e else '',end='')
" 2>/dev/null)
  [ -z "$em" ] && ok "$label" || warn "$label → $em"
}

# 月オフセット計算: calc_ym <months_ago>
calc_ym() {
  local y=$CURRENT_YEAR m=$CURRENT_MONTH off=$(( $1 ))
  m=$(( m - off ))
  while [ $m -le 0 ]; do m=$(( m + 12 )); y=$(( y - 1 )); done
  printf "%04d-%02d" $y $m
}
last_day() {
  local y=$1 m=$(( 10#$2 ))
  case $m in 1|3|5|7|8|10|12) echo 31;; 4|6|9|11) echo 30;;
    2) (( y%4==0 && (y%100!=0 || y%400==0) )) && echo 29 || echo 28;;
  esac
}

# 明細投入: post_tx <ledger_id> <token> <cat_id> <type> <amount> <date> <memo>
post_tx() {
  local lid=$1 tok=$2 cid=$3 typ=$4 amt=$5 dt=$6
  local memo="${7:-}"
  local me="${memo//\\/\\\\}"; me="${me//\"/\\\"}"
  local body="{\"categoryId\":\"$cid\",\"transactionType\":\"$typ\",\"amount\":$amt,\"transactionDate\":\"$dt\",\"memo\":\"$me\"}"
  local resp
  resp=$(api_post "/api/v1/ledgers/${lid}/transactions" "$body" "$tok")
  local em
  em=$(printf '%s' "$resp" | $PY -c "
import sys,json
d=json.load(sys.stdin)
e=d.get('error')
print(e['message'] if e else '',end='')
" 2>/dev/null)
  [ -n "$em" ] && warn "TX(${dt} ${amt}円): $em"
}

# 変動金額配列 (index 0=12ヶ月前, 12=当月)
SI=(20000 25000 30000 35000 40000 45000 50000 45000 40000 35000 30000 25000 20000) # 副収入
UT=(15000 13000 10000  8000  8000  9000 12000 14000 15000 13000 10000  8000  8000) # 光熱費
FD=(30000 33000 35000 37000 40000 42000 44000 46000 44000 42000 40000 38000 35000) # 食費(8日)
TR=(5000   6000  7000  8000  9000 10000 12000 10000  9000  8000  7000  6000  5000) # 交通費

# ─── Step 1: バックエンド起動確認 ───────────────────────────
step "Step1: バックエンド起動確認"
for i in $(seq 1 15); do
  if curl -skf "${BASE_URL}/v3/api-docs" -o /dev/null 2>&1; then
    ok "バックエンドが起動しています"; break
  fi
  [ $i -eq 15 ] && { warn "バックエンドが起動していません。docker compose up -d を実行してください。"; exit 1; }
  echo "  待機中... ($i/15)"; sleep 3
done

# ─── Step 2: ユーザー登録 ────────────────────────────────────
step "Step2: ユーザー登録中..."

reg_login() {
  local uid=$1 uname=$2 email=$3 pass=$4
  local reg
  reg=$(api_post "/api/v1/auth/register" \
    "{\"userId\":\"$uid\",\"userName\":\"$uname\",\"email\":\"$email\",\"password\":\"$pass\"}")
  # 登録済みエラーは無視
  local login
  login=$(api_post "/api/v1/auth/login" \
    "{\"userId\":\"$uid\",\"password\":\"$pass\"}")
  json_get "$login" "data.accessToken"
}

TOKEN_NORMAL=$(reg_login "user_normal" "正常系ユーザー" "normal@example.com" "Password123")
ok "user_normal"
TOKEN_OVER=$(reg_login "user_over_budget" "予算超過ユーザー" "overbudget@example.com" "Password123")
ok "user_over_budget"
TOKEN_NODATA=$(reg_login "user_no_data" "データなしユーザー" "nodata@example.com" "Password123")
ok "user_no_data"
TOKEN_MINUS=$(reg_login "user_minus_balance" "残高マイナスユーザー" "minus@example.com" "Password123")
ok "user_minus_balance"
TOKEN_OTHER=$(reg_login "user_other" "別ユーザー（アクセス禁止）" "other@example.com" "Password123")
ok "user_other"

# ─── Step 3: 帳簿の更新・追加 ───────────────────────────────
step "Step3: 帳簿の更新・追加中..."

# 各ユーザーのデフォルト帳簿IDを取得
LEDGERS_NORMAL=$(api_get "/api/v1/ledgers" "$TOKEN_NORMAL")
LEDGER_MAIN_ID=$(find_ledger "$LEDGERS_NORMAL" "")

LEDGERS_OVER=$(api_get "/api/v1/ledgers" "$TOKEN_OVER")
LEDGER_OVER_ID=$(find_ledger "$LEDGERS_OVER" "")

LEDGERS_MINUS=$(api_get "/api/v1/ledgers" "$TOKEN_MINUS")
LEDGER_MINUS_ID=$(find_ledger "$LEDGERS_MINUS" "")

LEDGERS_NODATA=$(api_get "/api/v1/ledgers" "$TOKEN_NODATA")
LEDGER_NODATA_ID=$(find_ledger "$LEDGERS_NODATA" "")

LEDGERS_OTHER=$(api_get "/api/v1/ledgers" "$TOKEN_OTHER")
LEDGER_OTHER_ID=$(find_ledger "$LEDGERS_OTHER" "")

# 帳簿名・初期残高を更新
r=$(api_put "/api/v1/ledgers/$LEDGER_MAIN_ID" \
  '{"ledgerName":"正常系メイン帳簿","initialBalance":500000,"startDayOfMonth":1,"startMonthOfYear":1}' \
  "$TOKEN_NORMAL")
ok_or_warn "$r" "user_normal デフォルト帳簿 → 正常系メイン帳簿"

r=$(api_put "/api/v1/ledgers/$LEDGER_OVER_ID" \
  '{"ledgerName":"予算超過確認帳簿","initialBalance":200000,"startDayOfMonth":1,"startMonthOfYear":1}' \
  "$TOKEN_OVER")
ok_or_warn "$r" "user_over_budget デフォルト帳簿 → 予算超過確認帳簿"

r=$(api_put "/api/v1/ledgers/$LEDGER_MINUS_ID" \
  '{"ledgerName":"残高マイナス確認帳簿","initialBalance":10000,"startDayOfMonth":1,"startMonthOfYear":1}' \
  "$TOKEN_MINUS")
ok_or_warn "$r" "user_minus_balance デフォルト帳簿 → 残高マイナス確認帳簿"

r=$(api_put "/api/v1/ledgers/$LEDGER_NODATA_ID" \
  '{"ledgerName":"空帳簿（データなし確認用）","initialBalance":0,"startDayOfMonth":1,"startMonthOfYear":1}' \
  "$TOKEN_NODATA")
ok_or_warn "$r" "user_no_data デフォルト帳簿 → 空帳簿"

r=$(api_put "/api/v1/ledgers/$LEDGER_OTHER_ID" \
  '{"ledgerName":"別ユーザー帳簿（アクセス禁止確認用）","initialBalance":300000,"startDayOfMonth":1,"startMonthOfYear":1}' \
  "$TOKEN_OTHER")
ok_or_warn "$r" "user_other デフォルト帳簿 → 別ユーザー帳簿"

# user_normal のサブ帳簿を追加
r=$(api_post "/api/v1/ledgers" \
  '{"ledgerName":"サブ帳簿（切替確認用）","initialBalance":100000}' \
  "$TOKEN_NORMAL")
ok_or_warn "$r" "user_normal サブ帳簿 作成"
LEDGER_SUB_ID=$(json_get "$r" "data.ledgerId")

LONG_NAME="100文字帳簿名の帳簿（あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろわをん１２３４５６７８９０）"
r=$(api_post "/api/v1/ledgers" \
  "{\"ledgerName\":\"$LONG_NAME\",\"initialBalance\":0}" \
  "$TOKEN_NORMAL")
ok_or_warn "$r" "user_normal 100文字帳簿 作成"

# ─── Step 4: カスタムカテゴリの追加 ────────────────────────
step "Step4: カスタムカテゴリの追加中..."

# user_normal の正常系メイン帳簿のカテゴリ一覧を取得・IDを保存
CATS=$(api_get "/api/v1/ledgers/$LEDGER_MAIN_ID/categories" "$TOKEN_NORMAL")

CAT_SALARY=$(find_cat "$CATS" "給与")
CAT_SIDE=$(find_cat "$CATS" "副収入")
CAT_OTHER_INC=$(find_cat "$CATS" "その他収入")
CAT_FOOD=$(find_cat "$CATS" "食費")
CAT_TRANSPORT=$(find_cat "$CATS" "交通費")
CAT_RENT=$(find_cat "$CATS" "住居費")
CAT_UTILITY=$(find_cat "$CATS" "光熱費")
CAT_COMM=$(find_cat "$CATS" "通信費")
CAT_MEDICAL=$(find_cat "$CATS" "医療費")
CAT_ENT=$(find_cat "$CATS" "娯楽費")
CAT_CLOTHING=$(find_cat "$CATS" "衣服費")
CAT_OTHER_EXP=$(find_cat "$CATS" "その他支出")

r=$(api_post "/api/v1/ledgers/$LEDGER_MAIN_ID/categories" \
  '{"categoryName":"カスタムカテゴリ（追加確認用）","categoryType":"EXPENSE","displayOrder":99}' \
  "$TOKEN_NORMAL")
ok_or_warn "$r" "カスタムカテゴリ 作成"

# user_over_budget のカテゴリ取得
CATS_OVER=$(api_get "/api/v1/ledgers/$LEDGER_OVER_ID/categories" "$TOKEN_OVER")
CAT_OVER_SALARY=$(find_cat "$CATS_OVER" "給与")
CAT_OVER_FOOD=$(find_cat "$CATS_OVER" "食費")
CAT_OVER_ENT=$(find_cat "$CATS_OVER" "娯楽費")
CAT_OVER_TRANS=$(find_cat "$CATS_OVER" "交通費")
CAT_OVER_RENT=$(find_cat "$CATS_OVER" "住居費")
CAT_OVER_CLOTHING=$(find_cat "$CATS_OVER" "衣服費")

# user_minus_balance のカテゴリ取得
CATS_MINUS=$(api_get "/api/v1/ledgers/$LEDGER_MINUS_ID/categories" "$TOKEN_MINUS")
CAT_MINUS_SALARY=$(find_cat "$CATS_MINUS" "給与")
CAT_MINUS_RENT=$(find_cat "$CATS_MINUS" "住居費")

# サブ帳簿のカテゴリ取得
CATS_SUB=$(api_get "/api/v1/ledgers/$LEDGER_SUB_ID/categories" "$TOKEN_NORMAL")
CAT_SUB_SALARY=$(find_cat "$CATS_SUB" "給与")
CAT_SUB_FOOD=$(find_cat "$CATS_SUB" "食費")

ok "カテゴリIDをすべて取得しました"

# ─── Step 5: 明細データ投入 ─────────────────────────────────
step "Step5: 明細データ投入中... (13ヶ月分)"

# 500文字メモ
MEMO_500=$($PY -c "print('あ'*500,end='')")

# ── user_normal 正常系メイン帳簿: 13ヶ月ループ ──
echo "  [user_normal 正常系メイン帳簿]"
for i in $(seq 0 12); do
  MONTHS_AGO=$(( 12 - i ))
  YM=$(calc_ym $MONTHS_AGO)
  YEAR=${YM%-*}
  MON=${YM#*-}
  LD=$(last_day $YEAR $MON)

  # 収入 (index=0 は支出のみ月のため除外)
  if [ $i -ne 0 ]; then
    post_tx "$LEDGER_MAIN_ID" "$TOKEN_NORMAL" "$CAT_SALARY"  "INCOME" "280000"        "${YM}-25"    "月次給与（正常系）"
    post_tx "$LEDGER_MAIN_ID" "$TOKEN_NORMAL" "$CAT_SIDE"    "INCOME" "${SI[$i]}"      "${YM}-${LD}" "副業収入（変動収入確認用）"
  fi

  # 支出 (index=1 は収入のみ月のため除外)
  if [ $i -ne 1 ]; then
    # index=2 は食費のみ月 (住居費・通信費・光熱費・交通費・娯楽費を除外)
    if [ $i -ne 2 ]; then
      post_tx "$LEDGER_MAIN_ID" "$TOKEN_NORMAL" "$CAT_RENT"     "EXPENSE" "80000"        "${YM}-01"    "家賃（固定費・正常系）"
      post_tx "$LEDGER_MAIN_ID" "$TOKEN_NORMAL" "$CAT_COMM"     "EXPENSE" "5500"          "${YM}-25"    "スマホ代（固定費・正常系）"
      post_tx "$LEDGER_MAIN_ID" "$TOKEN_NORMAL" "$CAT_UTILITY"  "EXPENSE" "${UT[$i]}"     "${YM}-05"    "光熱費（季節変動確認用）"
      post_tx "$LEDGER_MAIN_ID" "$TOKEN_NORMAL" "$CAT_TRANSPORT""EXPENSE" "${TR[$i]}"     "${YM}-10"    "交通費（正常系）"
      post_tx "$LEDGER_MAIN_ID" "$TOKEN_NORMAL" "$CAT_ENT"      "EXPENSE" "8000"          "${YM}-15"    "娯楽費（予算内・正常系）"
    fi
    post_tx "$LEDGER_MAIN_ID" "$TOKEN_NORMAL" "$CAT_FOOD"     "EXPENSE" "${FD[$i]}"     "${YM}-08"    "食費週次（正常系）"
    post_tx "$LEDGER_MAIN_ID" "$TOKEN_NORMAL" "$CAT_FOOD"     "EXPENSE" "8000"          "${YM}-20"    "食費追加分（正常系）"
  fi
done
ok "13ヶ月分 通常データ完了"

# 当月の境界値データ
CURR_YM=$(calc_ym 0)
CURR_LD=$(last_day $CURRENT_YEAR $CURRENT_MONTH)

post_tx "$LEDGER_MAIN_ID" "$TOKEN_NORMAL" "$CAT_FOOD"      "EXPENSE" "1"        "${CURR_YM}-01"    "最小金額（境界値確認用）"
post_tx "$LEDGER_MAIN_ID" "$TOKEN_NORMAL" "$CAT_CLOTHING"  "EXPENSE" "999999"   "${CURR_YM}-28"    "高額支出（境界値確認用）"
post_tx "$LEDGER_MAIN_ID" "$TOKEN_NORMAL" "$CAT_OTHER_EXP" "EXPENSE" "15000"    "${CURR_YM}-${CURR_LD}" "月末日付（境界値確認用）"
post_tx "$LEDGER_MAIN_ID" "$TOKEN_NORMAL" "$CAT_SALARY"    "INCOME"  "280000"   "${CURR_YM}-01"    "月初日付（境界値確認用）"
post_tx "$LEDGER_MAIN_ID" "$TOKEN_NORMAL" "$CAT_FOOD"      "EXPENSE" "5000"     "${CURR_YM}-15"    ",カンマ含むメモ（CSV確認用）,"
post_tx "$LEDGER_MAIN_ID" "$TOKEN_NORMAL" "$CAT_TRANSPORT" "EXPENSE" "3000"     "${CURR_YM}-16"    "日本語メモ（文字コード確認用）電車代"
post_tx "$LEDGER_MAIN_ID" "$TOKEN_NORMAL" "$CAT_OTHER_EXP" "EXPENSE" "1000"     "${CURR_YM}-17"    ""
post_tx "$LEDGER_MAIN_ID" "$TOKEN_NORMAL" "$CAT_ENT"       "EXPENSE" "500"      "${CURR_YM}-18"    "$MEMO_500"
post_tx "$LEDGER_MAIN_ID" "$TOKEN_NORMAL" "$CAT_MEDICAL"   "EXPENSE" "10000"    "2024-02-29"       "うるう日（境界値確認用）"
ok "当月境界値データ完了"

# ── user_normal サブ帳簿 ──
echo "  [user_normal サブ帳簿]"
post_tx "$LEDGER_SUB_ID" "$TOKEN_NORMAL" "$CAT_SUB_SALARY" "INCOME"  "150000" "${CURR_YM}-25" "サブ帳簿収入（切替確認用）"
post_tx "$LEDGER_SUB_ID" "$TOKEN_NORMAL" "$CAT_SUB_FOOD"   "EXPENSE" "20000"  "${CURR_YM}-10" "サブ帳簿支出（切替確認用）"
ok "サブ帳簿完了"

# ── user_over_budget ──
echo "  [user_over_budget 予算超過確認帳簿]"
post_tx "$LEDGER_OVER_ID" "$TOKEN_OVER" "$CAT_OVER_SALARY"   "INCOME"  "200000" "${CURR_YM}-25" "収入（予算超過ユーザー）"
post_tx "$LEDGER_OVER_ID" "$TOKEN_OVER" "$CAT_OVER_FOOD"     "EXPENSE" "48000"  "${CURR_YM}-10" "食費予算オーバー120%（異常系確認用）"
post_tx "$LEDGER_OVER_ID" "$TOKEN_OVER" "$CAT_OVER_ENT"      "EXPENSE" "8500"   "${CURR_YM}-15" "娯楽費警告85%（異常系確認用）"
post_tx "$LEDGER_OVER_ID" "$TOKEN_OVER" "$CAT_OVER_TRANS"    "EXPENSE" "5000"   "${CURR_YM}-20" "交通費予算内50%（正常系確認用）"
post_tx "$LEDGER_OVER_ID" "$TOKEN_OVER" "$CAT_OVER_CLOTHING" "EXPENSE" "100000" "${CURR_YM}-05" "衣服費大幅超過333%（異常系確認用）"
ok "予算超過確認帳簿完了"

# ── user_minus_balance ──
echo "  [user_minus_balance 残高マイナス確認帳簿]"
post_tx "$LEDGER_MINUS_ID" "$TOKEN_MINUS" "$CAT_MINUS_SALARY" "INCOME"  "50000"  "${CURR_YM}-25" "収入（残高マイナスユーザー）"
post_tx "$LEDGER_MINUS_ID" "$TOKEN_MINUS" "$CAT_MINUS_RENT"   "EXPENSE" "200000" "${CURR_YM}-01" "支出が収入を大幅超過（残高マイナス確認用）"
ok "残高マイナス確認帳簿完了"

# ─── Step 6: 固定費データ投入 ────────────────────────────────
step "Step6: 固定費データ投入中..."

CURR_M01="${CURR_YM}-01"
CURR_LAST="${CURR_YM}-${CURR_LD}"

post_ft() {
  local lid=$1 tok=$2 cid=$3 name=$4 typ=$5 amt=$6 dom=$7 start=$8 end=$9
  local end_json="null"; [ -n "$end" ] && end_json="\"$end\""
  local body="{\"categoryId\":\"$cid\",\"fixedName\":\"$name\",\"transactionType\":\"$typ\",\"amount\":$amt,\"dayOfMonth\":$dom,\"startDate\":\"$start\",\"endDate\":$end_json}"
  local resp
  resp=$(api_post "/api/v1/ledgers/${lid}/fixed-transactions" "$body" "$tok")
  ok_or_warn "$resp" "固定費: $name"
}

post_ft "$LEDGER_MAIN_ID" "$TOKEN_NORMAL" "$CAT_RENT"     "家賃（有効・正常系）"        "EXPENSE" 80000  1  "2025-01-01" ""
post_ft "$LEDGER_MAIN_ID" "$TOKEN_NORMAL" "$CAT_COMM"     "スマホ代（有効・正常系）"    "EXPENSE" 5500   25 "2025-04-01" ""
post_ft "$LEDGER_MAIN_ID" "$TOKEN_NORMAL" "$CAT_ENT"      "今月開始の固定費（境界値）"  "EXPENSE" 3000   20 "$CURR_M01"  ""
post_ft "$LEDGER_MAIN_ID" "$TOKEN_NORMAL" "$CAT_UTILITY"  "28日発生の固定費（境界値）"  "EXPENSE" 2000   28 "2025-01-01" ""
post_ft "$LEDGER_MAIN_ID" "$TOKEN_NORMAL" "$CAT_ENT"      "旧サブスク（終了済み）"      "EXPENSE" 1490   15 "2024-04-01" "2025-03-31"
post_ft "$LEDGER_MAIN_ID" "$TOKEN_NORMAL" "$CAT_TRANSPORT" "今月終了の固定費（境界値）"  "EXPENSE" 1000   10 "2025-01-01" "$CURR_LAST"
post_ft "$LEDGER_OVER_ID" "$TOKEN_OVER"   "$CAT_OVER_RENT" "高額固定費（予算超過用）"    "EXPENSE" 150000 1  "2025-01-01" ""

# ─── Step 7: 予算データ投入 ──────────────────────────────────
step "Step7: 予算データ投入中..."

post_budget() {
  local lid=$1 tok=$2 cid=$3 amt=$4
  local body="{\"categoryId\":\"$cid\",\"year\":$CURRENT_YEAR,\"month\":$CURRENT_MONTH,\"amount\":$amt}"
  local resp
  resp=$(api_post "/api/v1/ledgers/${lid}/budgets" "$body" "$tok")
  ok_or_warn "$resp" "予算: $(json_get "$resp" "data.categoryId") ¥$amt"
}

# user_normal 正常系メイン帳簿
post_budget "$LEDGER_MAIN_ID" "$TOKEN_NORMAL" "$CAT_FOOD"      45000
post_budget "$LEDGER_MAIN_ID" "$TOKEN_NORMAL" "$CAT_TRANSPORT" 12000
post_budget "$LEDGER_MAIN_ID" "$TOKEN_NORMAL" "$CAT_ENT"       10000
post_budget "$LEDGER_MAIN_ID" "$TOKEN_NORMAL" "$CAT_CLOTHING"  20000

# user_over_budget
post_budget "$LEDGER_OVER_ID" "$TOKEN_OVER" "$CAT_OVER_FOOD"     40000
post_budget "$LEDGER_OVER_ID" "$TOKEN_OVER" "$CAT_OVER_ENT"      10000
post_budget "$LEDGER_OVER_ID" "$TOKEN_OVER" "$CAT_OVER_TRANS"    10000
post_budget "$LEDGER_OVER_ID" "$TOKEN_OVER" "$CAT_OVER_CLOTHING" 30000

# ─── 完了 ────────────────────────────────────────────────────
echo ""
echo "=================================================="
echo "=== シードデータの投入が完了しました ==="
echo "=================================================="
echo "■ ログイン情報:"
echo "  正常系ユーザー:       user_normal        / Password123"
echo "  予算超過ユーザー:     user_over_budget   / Password123"
echo "  データなしユーザー:   user_no_data       / Password123"
echo "  残高マイナスユーザー: user_minus_balance / Password123"
echo "  別ユーザー:           user_other         / Password123"
echo ""
echo "■ データ確認SQL:"
echo "  docker compose exec db psql -U moneynote -d moneynote -c \"SELECT user_id, user_name FROM users;\""
echo "  docker compose exec db psql -U moneynote -d moneynote -c \"SELECT ledger_name, initial_balance FROM ledgers;\""
echo "  docker compose exec db psql -U moneynote -d moneynote -c \"SELECT COUNT(*) FROM transactions;\""
echo "  docker compose exec db psql -U moneynote -d moneynote -c \"SELECT fixed_name, end_date FROM fixed_transactions;\""
echo "  docker compose exec db psql -U moneynote -d moneynote -c \"SELECT c.category_name, b.amount FROM budgets b JOIN categories c ON b.category_id=c.category_id;\""
