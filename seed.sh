#!/bin/bash
# ===========================================================
# MoneyNote シードデータ投入スクリプト (bash 版)
# ===========================================================
# 使用方法:
#   ./seed.sh           → ローカル開発 (docker-compose.yml)
#   ./seed.sh env1      → 環境1 (docker-compose.env1.yml)
#   ./seed.sh env2      → 環境2 (docker-compose.env2.yml)
# このスクリプトは DB をリセットしてからデータを投入します。
# 既存のデータはすべて削除されます。
# ===========================================================

set -uo pipefail

ENV="${1:-}"

if [ "$ENV" = "env1" ] || [ "$ENV" = "env2" ]; then
    DC_CMD="docker compose -f docker-compose.${ENV}.yml --env-file .env.${ENV}"
    BASE_URL="${BASE_URL:-http://localhost:8080}"
    CURL_OPTS=(-s)
    HEALTH_PATH="/actuator/health"
elif [ -z "$ENV" ]; then
    DC_CMD="docker compose"
    BASE_URL="${BASE_URL:-https://localhost}"
    CURL_OPTS=(-s -k)
    HEALTH_PATH="/v3/api-docs"
else
    echo "Usage: $0 [env1|env2]"
    exit 1
fi

# ─── 依存ツール確認 ─────────────────────────────────────────
for cmd in curl jq python3; do
    if ! command -v "$cmd" &>/dev/null; then
        echo "ERROR: '$cmd' が見つかりません。"
        [ "$cmd" = "jq" ] && echo "  sudo yum install -y jq  (Amazon Linux 2)"
        [ "$cmd" = "jq" ] && echo "  sudo dnf install -y jq  (Amazon Linux 2023)"
        exit 1
    fi
done

# ─── 日時 ───────────────────────────────────────────────────
cur_year=$(date +%Y)
cur_month=$(date +%-m)
cur_ym=$(date +%Y-%m)

# ─── ヘルパー関数 ────────────────────────────────────────────
step_print() { echo; echo "=== $1 ==="; }
ok()         { echo "  ✓ $1"; }
warn()       { echo "  ✗ ERROR: $1"; }

invoke_api() {
    local method=$1 endpoint=$2 body=${3:-} token=${4:-}
    local url="${BASE_URL}${endpoint}"
    local args=("${CURL_OPTS[@]}" -X "$method"
        -H "Content-Type: application/json; charset=utf-8"
        -H "Accept: application/json")
    [ -n "$token" ] && args+=(-H "Authorization: Bearer $token")
    [ -n "$body"  ] && args+=(-d "$body")
    curl "${args[@]}" "$url" 2>/dev/null || echo '{}'
}

ok_or_warn() {
    local resp=$1 label=$2
    if [ -z "$resp" ]; then warn "$label → null response"; return; fi
    if echo "$resp" | jq -e '.error' >/dev/null 2>&1; then
        warn "$label → $(echo "$resp" | jq -r '.error.message // "unknown error"')"
    else
        ok "$label"
    fi
}

get_ym_offset() {
    date -d "$(date +%Y-%m-01) -${1} months" +%Y-%m
}

get_last_day_of() {
    date -d "${1}-01 +1 month -1 day" +%d
}

find_category_id() {
    echo "$1" | jq -r --arg name "$2" \
        '.data[] | select(.categoryName == $name) | .categoryId' 2>/dev/null | head -1
}

post_transaction() {
    local ledger_id=$1 token=$2 category_id=$3 tx_type=$4
    local amount=$5 tx_date=$6 memo=${7:-}
    local body
    body=$(jq -n \
        --arg   cat  "$category_id" \
        --arg   type "$tx_type" \
        --argjson amt "$amount" \
        --arg   date "$tx_date" \
        --arg   memo "$memo" \
        '{categoryId:$cat,transactionType:$type,amount:$amt,transactionDate:$date,memo:$memo}')
    local resp
    resp=$(invoke_api "POST" "/api/v1/ledgers/${ledger_id}/transactions" "$body" "$token")
    if echo "$resp" | jq -e '.error' >/dev/null 2>&1; then
        warn "TX(${tx_date} ${amount}円): $(echo "$resp" | jq -r '.error.message // "unknown error"')"
    fi
}

post_fixed_transaction() {
    local ledger_id=$1 token=$2 category_id=$3
    local name=$4 tx_type=$5 amount=$6 day_of_month=$7
    local start_date=$8 end_date="${9:-}" memo="${10:-}"
    local body
    body=$(jq -n \
        --arg   cat   "$category_id" \
        --arg   fname "$name" \
        --arg   type  "$tx_type" \
        --argjson amt  "$amount" \
        --argjson dom  "$day_of_month" \
        --arg   start "$start_date" \
        --arg   end   "$end_date" \
        '{categoryId:$cat,fixedName:$fname,transactionType:$type,amount:$amt,
          dayOfMonth:$dom,startDate:$start,
          endDate:($end|if .=="" then null else . end)}')
    if [ -n "$memo" ]; then
        body=$(echo "$body" | jq --arg memo "$memo" '. + {memo:$memo}')
    fi
    local resp
    resp=$(invoke_api "POST" "/api/v1/ledgers/${ledger_id}/fixed-transactions" "$body" "$token")
    ok_or_warn "$resp" "固定費: $name"
}

post_budget_for_month() {
    local ledger_id=$1 token=$2 category_id=$3 year=$4 month=$5 amount=$6
    local body
    body=$(jq -n \
        --arg   cat   "$category_id" \
        --argjson year "$year" \
        --argjson month "$month" \
        --argjson amt  "$amount" \
        '{categoryId:$cat,year:$year,month:$month,amount:$amt}')
    local resp
    resp=$(invoke_api "POST" "/api/v1/ledgers/${ledger_id}/budgets" "$body" "$token")
    ok_or_warn "$resp" "予算(${year}/${month}): $category_id ¥$amount"
}

post_budget() {
    local ledger_id=$1 token=$2 category_id=$3 amount=$4
    post_budget_for_month "$ledger_id" "$token" "$category_id" \
        "$cur_year" "$cur_month" "$amount"
}

# ─── 変動金額配列 (index 0=12ヶ月前, 12=当月) ───────────────
side_income=(20000 25000 30000 35000 40000 45000 50000 45000 40000 35000 30000 25000 20000)
utility=(15000 13000 10000 8000 8000 9000 12000 14000 15000 13000 10000 8000 8000)
food_day8=(30000 33000 35000 37000 40000 42000 44000 46000 44000 42000 40000 38000 35000)
transport=(5000 6000 7000 8000 9000 10000 12000 10000 9000 8000 7000 6000 5000)

# ─── Step 0: DB リセット ─────────────────────────────────────
step_print "Step0: DB リセット中..."
if [ "$ENV" = "env1" ] || [ "$ENV" = "env2" ]; then
    echo "  DB 接続情報を読み込んでいます..."
    H=$(grep DB_HOST ".env.${ENV}" | cut -d= -f2)
    P=$(grep DB_PASSWORD ".env.${ENV}" | cut -d= -f2)
    echo "  RDS スキーマを削除・再作成しています..."
    PGPASSWORD="$P" psql -h "$H" -U moneynote moneynote \
        -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
    echo "  バックエンドを再起動します（Flyway でスキーマ再作成）..."
    $DC_CMD restart backend
    ok "DB リセット完了（RDS）"
else
    echo "  ${DC_CMD} down -v ..."
    $DC_CMD down -v 2>&1 | tail -3 || true
    echo "  ${DC_CMD} up -d --build ..."
    $DC_CMD up -d --build 2>&1 | tail -5 || true
    ok "DB リセット完了"
fi

# ─── Step 1: バックエンド起動確認 ───────────────────────────
step_print "Step1: バックエンド起動確認（最大60秒待機）"
started=false
for i in $(seq 1 20); do
    resp=$(invoke_api "GET" "$HEALTH_PATH" "" "")
    if echo "$resp" | jq -e '. and (. != {})' >/dev/null 2>&1 && \
       ! echo "$resp" | jq -e '.error' >/dev/null 2>&1; then
        ok "バックエンドが起動しています"
        started=true
        break
    fi
    echo "  待機中... ($i/20)"
    sleep 3
done
if [ "$started" = false ]; then
    warn "バックエンドが起動しませんでした。${DC_CMD} logs backend で確認してください。"
    exit 1
fi

# ─── Step 2: ユーザー登録 ────────────────────────────────────
step_print "Step2: ユーザー登録中..."

register_and_login() {
    local user_id=$1 user_name=$2 email=$3 password=$4
    local reg_body login_body resp
    reg_body=$(jq -n \
        --arg uid "$user_id" --arg uname "$user_name" \
        --arg email "$email" --arg pwd "$password" \
        '{userId:$uid,userName:$uname,email:$email,password:$pwd}')
    invoke_api "POST" "/api/v1/auth/register" "$reg_body" > /dev/null 2>&1 || true
    login_body=$(jq -n \
        --arg uid "$user_id" --arg pwd "$password" \
        '{userId:$uid,password:$pwd}')
    resp=$(invoke_api "POST" "/api/v1/auth/login" "$login_body")
    echo "$resp" | jq -r '.data.accessToken // ""'
}

token_normal=$(register_and_login "user_normal"        "正常系ユーザー"             "normal@example.com"     "Password123!"); ok "user_normal"
token_over=$(  register_and_login "user_over_budget"   "予算超過ユーザー"           "overbudget@example.com" "Password123!"); ok "user_over_budget"
token_nodata=$(register_and_login "user_no_data"       "データなしユーザー"         "nodata@example.com"     "Password123!"); ok "user_no_data"
token_minus=$( register_and_login "user_minus_balance" "残高マイナスユーザー"       "minus@example.com"      "Password123!"); ok "user_minus_balance"
token_other=$( register_and_login "user_other"         "別ユーザー（アクセス禁止）" "other@example.com"      "Password123!"); ok "user_other"

# ─── Step 3: 帳簿の更新・追加 ───────────────────────────────
step_print "Step3: 帳簿の更新・追加中..."

get_default_ledger_id() {
    local resp
    resp=$(invoke_api "GET" "/api/v1/ledgers" "" "$1")
    echo "$resp" | jq -r '.data[0].ledgerId // ""'
}

ledger_main_id=$(  get_default_ledger_id "$token_normal")
ledger_over_id=$(  get_default_ledger_id "$token_over")
ledger_minus_id=$( get_default_ledger_id "$token_minus")
ledger_nodata_id=$(get_default_ledger_id "$token_nodata")
ledger_other_id=$( get_default_ledger_id "$token_other")

update_ledger() {
    local ledger_id=$1 token=$2 name=$3 balance=$4
    local body resp
    body=$(jq -n --arg name "$name" --argjson bal "$balance" \
        '{ledgerName:$name,initialBalance:$bal,startDayOfMonth:1,startMonthOfYear:1}')
    resp=$(invoke_api "PUT" "/api/v1/ledgers/${ledger_id}" "$body" "$token")
    ok_or_warn "$resp" "帳簿更新: $name"
}

update_ledger "$ledger_main_id"   "$token_normal" "正常系メイン帳簿"                    500000
update_ledger "$ledger_over_id"   "$token_over"   "予算超過確認帳簿"                    200000
update_ledger "$ledger_minus_id"  "$token_minus"  "残高マイナス確認帳簿"                 10000
update_ledger "$ledger_nodata_id" "$token_nodata" "空帳簿（データなし確認用）"                0
update_ledger "$ledger_other_id"  "$token_other"  "別ユーザー帳簿（アクセス禁止確認用）" 300000

del_resp=$(invoke_api "DELETE" "/api/v1/ledgers/${ledger_nodata_id}" "" "$token_nodata")
ok_or_warn "$del_resp" "user_no_data デフォルト帳簿を削除（帳簿0件モーダル確認用）"

sub_resp=$(invoke_api "POST" "/api/v1/ledgers" \
    "$(jq -n '{ledgerName:"サブ帳簿（切替確認用）",initialBalance:100000}')" "$token_normal")
ok_or_warn "$sub_resp" "サブ帳簿 作成"
ledger_sub_id=$(echo "$sub_resp" | jq -r '.data.ledgerId // ""')

long_name="100文字帳簿名の帳簿（あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろわをん１２３４５６７８９０）"
long_resp=$(invoke_api "POST" "/api/v1/ledgers" \
    "$(jq -n --arg name "$long_name" '{ledgerName:$name,initialBalance:0}')" "$token_normal")
ok_or_warn "$long_resp" "100文字帳簿 作成"

# ─── Step 4: カスタムカテゴリの追加 ────────────────────────
step_print "Step4: カスタムカテゴリの追加中..."

cats_main=$(  invoke_api "GET" "/api/v1/ledgers/${ledger_main_id}/categories"  "" "$token_normal")
cats_over=$(  invoke_api "GET" "/api/v1/ledgers/${ledger_over_id}/categories"  "" "$token_over")
cats_minus=$( invoke_api "GET" "/api/v1/ledgers/${ledger_minus_id}/categories" "" "$token_minus")

sub_exp_resp=$(invoke_api "POST" "/api/v1/ledgers/${ledger_sub_id}/categories" \
    "$(jq -n '{categoryName:"食費",categoryType:"EXPENSE"}')" "$token_normal")
ok_or_warn "$sub_exp_resp" "サブ帳簿 食費カテゴリ作成"

sub_inc_resp=$(invoke_api "POST" "/api/v1/ledgers/${ledger_sub_id}/categories" \
    "$(jq -n '{categoryName:"給与",categoryType:"INCOME"}')" "$token_normal")
ok_or_warn "$sub_inc_resp" "サブ帳簿 給与カテゴリ作成"

cats_sub=$(invoke_api "GET" "/api/v1/ledgers/${ledger_sub_id}/categories" "" "$token_normal")

# カテゴリID取得 (user_normal メイン帳簿)
cat_salary=$(   find_category_id "$cats_main" "給与")
cat_side=$(     find_category_id "$cats_main" "副収入")
cat_other_inc=$(find_category_id "$cats_main" "その他収入")
cat_food=$(     find_category_id "$cats_main" "食費")
cat_transport=$(find_category_id "$cats_main" "交通費")
cat_rent=$(     find_category_id "$cats_main" "住居費")
cat_utility=$(  find_category_id "$cats_main" "光熱費")
cat_comm=$(     find_category_id "$cats_main" "通信費")
cat_medical=$(  find_category_id "$cats_main" "医療費")
cat_ent=$(      find_category_id "$cats_main" "娯楽費")
cat_clothing=$( find_category_id "$cats_main" "衣服費")
cat_other_exp=$(find_category_id "$cats_main" "その他支出")

# カテゴリID取得 (user_over_budget)
cat_over_salary=$(   find_category_id "$cats_over" "給与")
cat_over_food=$(     find_category_id "$cats_over" "食費")
cat_over_ent=$(      find_category_id "$cats_over" "娯楽費")
cat_over_trans=$(    find_category_id "$cats_over" "交通費")
cat_over_rent=$(     find_category_id "$cats_over" "住居費")
cat_over_clothing=$( find_category_id "$cats_over" "衣服費")

# カテゴリID取得 (user_minus_balance)
cat_minus_salary=$(find_category_id "$cats_minus" "給与")
cat_minus_rent=$(  find_category_id "$cats_minus" "住居費")

# カテゴリID取得 (サブ帳簿)
cat_sub_salary=$(find_category_id "$cats_sub" "給与")
cat_sub_food=$(  find_category_id "$cats_sub" "食費")

custom_resp=$(invoke_api "POST" "/api/v1/ledgers/${ledger_main_id}/categories" \
    "$(jq -n '{categoryName:"カスタムカテゴリ（追加確認用）",categoryType:"EXPENSE",displayOrder:99}')" \
    "$token_normal")
ok_or_warn "$custom_resp" "カスタムカテゴリ 作成"

ok "カテゴリIDをすべて取得しました"
echo "  [DEBUG] cat_salary=${cat_salary} cat_food=${cat_food} cat_rent=${cat_rent}"
echo "  [DEBUG] cat_sub_salary=${cat_sub_salary} cat_sub_food=${cat_sub_food}"
if [ -z "$cat_salary" ]; then
    warn "cat_salary が空です。カテゴリIDの取得に失敗しています。処理を中断します。"
    exit 1
fi

# ─── Step 5: 明細データ投入 ─────────────────────────────────
step_print "Step5: 明細データ投入中... (13ヶ月分)"

memo500=$(python3 -c "print('あ' * 500)")

echo "  [user_normal 正常系メイン帳簿]"
for idx in $(seq 0 12); do
    months_ago=$((12 - idx))
    ym=$(get_ym_offset "$months_ago")
    last_day=$(get_last_day_of "$ym")
    last_day_str=$(printf "%02d" "$((10#$last_day))")

    if [ "$idx" -ne 0 ]; then
        post_transaction "$ledger_main_id" "$token_normal" "$cat_salary" "INCOME" 280000 "${ym}-25" "月次給与（正常系）"
        post_transaction "$ledger_main_id" "$token_normal" "$cat_side"   "INCOME" "${side_income[$idx]}" "${ym}-${last_day_str}" "副業収入（変動収入確認用）"
    fi

    if [ "$idx" -ne 1 ]; then
        if [ "$idx" -ne 2 ]; then
            post_transaction "$ledger_main_id" "$token_normal" "$cat_utility"   "EXPENSE" "${utility[$idx]}"   "${ym}-05" "光熱費（季節変動確認用）"
            post_transaction "$ledger_main_id" "$token_normal" "$cat_transport" "EXPENSE" "${transport[$idx]}" "${ym}-10" "交通費（正常系）"
            post_transaction "$ledger_main_id" "$token_normal" "$cat_ent"       "EXPENSE" 8000                "${ym}-15" "娯楽費（予算内・正常系）"
        fi
        post_transaction "$ledger_main_id" "$token_normal" "$cat_food" "EXPENSE" "${food_day8[$idx]}" "${ym}-08" "食費週次（正常系）"
        post_transaction "$ledger_main_id" "$token_normal" "$cat_food" "EXPENSE" 8000                 "${ym}-20" "食費追加分（正常系）"
    fi
done
ok "13ヶ月分 通常データ完了"

curr_last=$(get_last_day_of "$cur_ym")
curr_last_str=$(printf "%02d" "$((10#$curr_last))")

post_transaction "$ledger_main_id" "$token_normal" "$cat_food"      "EXPENSE" 1      "${cur_ym}-01"              "最小金額（境界値確認用）"
post_transaction "$ledger_main_id" "$token_normal" "$cat_clothing"  "EXPENSE" 999999 "2024-03-28"                "高額支出（境界値確認用）"
post_transaction "$ledger_main_id" "$token_normal" "$cat_other_exp" "EXPENSE" 15000  "${cur_ym}-${curr_last_str}" "月末日付（境界値確認用）"
post_transaction "$ledger_main_id" "$token_normal" "$cat_salary"    "INCOME"  280000 "${cur_ym}-01"              "月初日付（境界値確認用）"
post_transaction "$ledger_main_id" "$token_normal" "$cat_food"      "EXPENSE" 5000   "${cur_ym}-15"              ",カンマ含むメモ（CSV確認用）,"
post_transaction "$ledger_main_id" "$token_normal" "$cat_transport" "EXPENSE" 3000   "${cur_ym}-16"              "日本語メモ（文字コード確認用）電車代"
post_transaction "$ledger_main_id" "$token_normal" "$cat_other_exp" "EXPENSE" 1000   "${cur_ym}-17"              ""
post_transaction "$ledger_main_id" "$token_normal" "$cat_ent"       "EXPENSE" 500    "${cur_ym}-18"              "$memo500"
post_transaction "$ledger_main_id" "$token_normal" "$cat_medical"   "EXPENSE" 10000  "2024-02-29"                "うるう日（境界値確認用）"
ok "当月境界値データ完了"

echo "  [user_normal サブ帳簿]"
post_transaction "$ledger_sub_id" "$token_normal" "$cat_sub_salary" "INCOME"  150000 "${cur_ym}-25" "サブ帳簿収入（切替確認用）"
post_transaction "$ledger_sub_id" "$token_normal" "$cat_sub_food"   "EXPENSE"  20000 "${cur_ym}-10" "サブ帳簿支出（切替確認用）"
ok "サブ帳簿完了"

echo "  [user_over_budget 予算超過確認帳簿]"
post_transaction "$ledger_over_id" "$token_over" "$cat_over_salary"   "INCOME"  200000 "${cur_ym}-25" "収入（予算超過ユーザー）"
post_transaction "$ledger_over_id" "$token_over" "$cat_over_food"     "EXPENSE"  48000 "${cur_ym}-10" "食費予算オーバー120%（異常系確認用）"
post_transaction "$ledger_over_id" "$token_over" "$cat_over_ent"      "EXPENSE"   8500 "${cur_ym}-15" "娯楽費警告85%（異常系確認用）"
post_transaction "$ledger_over_id" "$token_over" "$cat_over_trans"    "EXPENSE"   5000 "${cur_ym}-20" "交通費予算内50%（正常系確認用）"
post_transaction "$ledger_over_id" "$token_over" "$cat_over_clothing" "EXPENSE" 100000 "${cur_ym}-05" "衣服費大幅超過333%（異常系確認用）"
ok "予算超過確認帳簿完了"

echo "  [user_minus_balance 残高マイナス確認帳簿]"
post_transaction "$ledger_minus_id" "$token_minus" "$cat_minus_salary" "INCOME"   50000 "${cur_ym}-25" "収入（残高マイナスユーザー）"
post_transaction "$ledger_minus_id" "$token_minus" "$cat_minus_rent"   "EXPENSE" 200000 "${cur_ym}-01" "支出が収入を大幅超過（残高マイナス確認用）"
ok "残高マイナス確認帳簿完了"

# ─── Step 6: 固定費データ投入 ────────────────────────────────
step_print "Step6: 固定費データ投入中..."

curr_m01="${cur_ym}-01"
curr_last2="${cur_ym}-${curr_last_str}"
end_2025_01_01=$(date -d "2025-01-01 +10 years" +%Y-%m-%d)
end_2025_04_01=$(date -d "2025-04-01 +10 years" +%Y-%m-%d)
end_curr_m01=$(  date -d "${curr_m01} +10 years" +%Y-%m-%d)

post_fixed_transaction "$ledger_main_id" "$token_normal" "$cat_rent"      "家賃（有効・正常系）"       "EXPENSE" 80000  1  "2025-01-01" "$end_2025_01_01" "毎月1日引き落とし"
post_fixed_transaction "$ledger_main_id" "$token_normal" "$cat_comm"      "スマホ代（有効・正常系）"   "EXPENSE" 5500  25  "2025-04-01" "$end_2025_04_01" "キャリア月額プラン"
post_fixed_transaction "$ledger_main_id" "$token_normal" "$cat_ent"       "今月開始の固定費（境界値）" "EXPENSE" 3000  20  "$curr_m01"  "$end_curr_m01"
post_fixed_transaction "$ledger_main_id" "$token_normal" "$cat_utility"   "28日発生の固定費（境界値）" "EXPENSE" 2000  28  "2025-01-01" "$end_2025_01_01"
post_fixed_transaction "$ledger_main_id" "$token_normal" "$cat_ent"       "旧サブスク（終了済み）"     "EXPENSE" 1490  15  "2024-04-01" "2025-03-31" "2025年3月解約済み"
post_fixed_transaction "$ledger_main_id" "$token_normal" "$cat_transport" "今月終了の固定費（境界値）" "EXPENSE" 1000  10  "2025-01-01" "$curr_last2"
post_fixed_transaction "$ledger_over_id" "$token_over"   "$cat_over_rent" "高額固定費（予算超過用）"   "EXPENSE" 150000 1  "2025-01-01" "$end_2025_01_01"

# ─── Step 7: 予算データ投入 ──────────────────────────────────
step_print "Step7: 予算データ投入中..."

bym_year()  { date -d "${1}-01" +%Y; }
bym_month() { date -d "${1}-01" +%-m; }

echo "  [user_normal 予算（当月: NORMAL多め）]"
bym=$(get_ym_offset 0)
post_budget_for_month "$ledger_main_id" "$token_normal" "$cat_food"      "$(bym_year "$bym")" "$(bym_month "$bym")" 45000
post_budget_for_month "$ledger_main_id" "$token_normal" "$cat_transport" "$(bym_year "$bym")" "$(bym_month "$bym")" 12000
post_budget_for_month "$ledger_main_id" "$token_normal" "$cat_ent"       "$(bym_year "$bym")" "$(bym_month "$bym")" 10000
post_budget_for_month "$ledger_main_id" "$token_normal" "$cat_rent"      "$(bym_year "$bym")" "$(bym_month "$bym")" 90000
post_budget_for_month "$ledger_main_id" "$token_normal" "$cat_comm"      "$(bym_year "$bym")" "$(bym_month "$bym")"  6000

echo "  [user_normal 予算（1ヶ月前: 食費OVER）]"
bym=$(get_ym_offset 1)
post_budget_for_month "$ledger_main_id" "$token_normal" "$cat_food"      "$(bym_year "$bym")" "$(bym_month "$bym")" 40000
post_budget_for_month "$ledger_main_id" "$token_normal" "$cat_transport" "$(bym_year "$bym")" "$(bym_month "$bym")" 12000
post_budget_for_month "$ledger_main_id" "$token_normal" "$cat_ent"       "$(bym_year "$bym")" "$(bym_month "$bym")" 10000
post_budget_for_month "$ledger_main_id" "$token_normal" "$cat_rent"      "$(bym_year "$bym")" "$(bym_month "$bym")" 90000

echo "  [user_normal 予算（2ヶ月前: 娯楽費OVER/交通費WARNING）]"
bym=$(get_ym_offset 2)
post_budget_for_month "$ledger_main_id" "$token_normal" "$cat_food"      "$(bym_year "$bym")" "$(bym_month "$bym")" 40000
post_budget_for_month "$ledger_main_id" "$token_normal" "$cat_transport" "$(bym_year "$bym")" "$(bym_month "$bym")"  6000
post_budget_for_month "$ledger_main_id" "$token_normal" "$cat_ent"       "$(bym_year "$bym")" "$(bym_month "$bym")"  6000
post_budget_for_month "$ledger_main_id" "$token_normal" "$cat_clothing"  "$(bym_year "$bym")" "$(bym_month "$bym")" 20000

echo "  [user_normal 予算（3ヶ月前: NORMAL）]"
bym=$(get_ym_offset 3)
post_budget_for_month "$ledger_main_id" "$token_normal" "$cat_food"      "$(bym_year "$bym")" "$(bym_month "$bym")" 45000
post_budget_for_month "$ledger_main_id" "$token_normal" "$cat_transport" "$(bym_year "$bym")" "$(bym_month "$bym")" 12000
post_budget_for_month "$ledger_main_id" "$token_normal" "$cat_rent"      "$(bym_year "$bym")" "$(bym_month "$bym")" 90000

echo "  [user_normal 予算（4〜6ヶ月前: 3カテゴリ）]"
for ago in 4 5 6; do
    bym=$(get_ym_offset "$ago")
    post_budget_for_month "$ledger_main_id" "$token_normal" "$cat_food" "$(bym_year "$bym")" "$(bym_month "$bym")" 45000
    post_budget_for_month "$ledger_main_id" "$token_normal" "$cat_rent" "$(bym_year "$bym")" "$(bym_month "$bym")" 90000
    post_budget_for_month "$ledger_main_id" "$token_normal" "$cat_comm" "$(bym_year "$bym")" "$(bym_month "$bym")"  6000
done

echo "  [user_normal 予算（7〜12ヶ月前: 2カテゴリ）]"
for ago in 7 8 9 10 11 12; do
    bym=$(get_ym_offset "$ago")
    post_budget_for_month "$ledger_main_id" "$token_normal" "$cat_food" "$(bym_year "$bym")" "$(bym_month "$bym")" 45000
    post_budget_for_month "$ledger_main_id" "$token_normal" "$cat_rent" "$(bym_year "$bym")" "$(bym_month "$bym")" 90000
done

post_budget "$ledger_over_id" "$token_over" "$cat_over_food"     40000
post_budget "$ledger_over_id" "$token_over" "$cat_over_ent"      10000
post_budget "$ledger_over_id" "$token_over" "$cat_over_trans"    10000
post_budget "$ledger_over_id" "$token_over" "$cat_over_clothing" 30000

# ─── 完了 ────────────────────────────────────────────────────
echo ""
echo "=================================================="
echo "=== シードデータの投入が完了しました ==="
echo "=================================================="
echo "■ ログイン情報:"
echo "  システム管理者:       admin              / Admin1234!  (SYSTEM_ADMIN・管理者画面 /admin にアクセス可能)"
echo "  正常系ユーザー:       user_normal        / Password123!"
echo "  予算超過ユーザー:     user_over_budget   / Password123!"
echo "  データなしユーザー:   user_no_data       / Password123!"
echo "  残高マイナスユーザー: user_minus_balance / Password123!"
echo "  別ユーザー:           user_other         / Password123!"
echo ""
echo "■ データ確認SQL:"
echo "  $DC_CMD exec db psql -U moneynote -d moneynote -c \"SELECT user_id, user_name FROM users;\""
echo "  $DC_CMD exec db psql -U moneynote -d moneynote -c \"SELECT ledger_name, initial_balance FROM ledgers;\""
echo "  $DC_CMD exec db psql -U moneynote -d moneynote -c \"SELECT COUNT(*) FROM transactions;\""
echo "  $DC_CMD exec db psql -U moneynote -d moneynote -c \"SELECT fixed_name, end_date FROM fixed_transactions;\""
echo "  $DC_CMD exec db psql -U moneynote -d moneynote -c \"SELECT c.category_name, b.amount FROM budgets b JOIN categories c ON b.category_id=c.category_id;\""
