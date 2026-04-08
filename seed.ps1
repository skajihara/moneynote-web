# ===========================================================
# MoneyNote シードデータ投入スクリプト (PowerShell 版)
# ===========================================================
# 使用方法: .\seed.ps1
# 前提: docker compose up -d でバックエンドが起動していること
# ===========================================================

# コンソール出力を UTF-8 に設定（日本語文字化け防止）
$OutputEncoding = [System.Text.Encoding]::UTF8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

$ErrorActionPreference = "Continue"
$baseUrl = if ($env:BASE_URL) { $env:BASE_URL } else { "http://localhost:8080" }
$now     = Get-Date
$curYear = $now.Year
$curMonth= $now.Month

# ─── ヘルパー関数 ────────────────────────────────────────────

function Step-Print { param($msg) Write-Host "`n=== $msg ===" -ForegroundColor Cyan }
function Ok   { param($msg) Write-Host "  ✓ $msg" -ForegroundColor Green }
function Warn { param($msg) Write-Host "  ✗ ERROR: $msg" -ForegroundColor Red }

function Invoke-Api {
    param($method, $endpoint, $body = $null, $token = $null)
    $headers = @{ "Content-Type" = "application/json; charset=utf-8" }
    if ($token) { $headers["Authorization"] = "Bearer $token" }
    $params = @{ Method = $method; Uri = "${baseUrl}${endpoint}"; Headers = $headers }
    if ($body) { $params["Body"] = [System.Text.Encoding]::UTF8.GetBytes($body) }
    try {
        $resp = Invoke-RestMethod @params
        return $resp
    } catch {
        # 4xx/5xx レスポンスボディを取得
        try {
            $stream = $_.Exception.Response.GetResponseStream()
            $reader = [System.IO.StreamReader]::new($stream)
            $text   = $reader.ReadToEnd()
            return $text | ConvertFrom-Json
        } catch {
            Write-Host "  ✗ Network error: $($_.Exception.Message)" -ForegroundColor Red
            return $null
        }
    }
}

function OkOrWarn {
    param($resp, $label)
    if ($resp -eq $null) { Warn "$label → null response"; return }
    if ($resp.error) { Warn "$label → $($resp.error.message)" }
    else { Ok $label }
}

function Get-YearMonth {
    param($offset)
    return $now.AddMonths(-$offset)
}

function Get-LastDay {
    param($dt)
    return [DateTime]::DaysInMonth($dt.Year, $dt.Month)
}

function Find-CategoryId {
    param($cats, $name)
    $found = $cats.data | Where-Object { $_.categoryName -eq $name } | Select-Object -First 1
    # PowerShell 5.1 では return if (...) は無効のため if-else で記述する
    if ($found) { return $found.categoryId } else { return "" }
}

function Post-Transaction {
    param($ledgerId, $token, $categoryId, $txType, $amount, $txDate, $memo = "")
    $body = @{
        categoryId      = $categoryId
        transactionType = $txType
        amount          = $amount
        transactionDate = $txDate
        memo            = $memo
    } | ConvertTo-Json -Compress
    $resp = Invoke-Api "POST" "/api/v1/ledgers/$ledgerId/transactions" $body $token
    if ($resp -and $resp.error) {
        Warn "TX(${txDate} ${amount}円): $($resp.error.message)"
    }
}

function Post-FixedTransaction {
    param($ledgerId, $token, $categoryId, $name, $txType, $amount, $dayOfMonth, $startDate, $endDate = $null)
    $body = @{
        categoryId      = $categoryId
        fixedName       = $name
        transactionType = $txType
        amount          = $amount
        dayOfMonth      = $dayOfMonth
        startDate       = $startDate
        endDate         = $endDate
    } | ConvertTo-Json -Compress
    $resp = Invoke-Api "POST" "/api/v1/ledgers/$ledgerId/fixed-transactions" $body $token
    OkOrWarn $resp "固定費: $name"
}

function Post-Budget {
    param($ledgerId, $token, $categoryId, $amount)
    $body = @{
        categoryId = $categoryId
        year       = $curYear
        month      = $curMonth
        amount     = $amount
    } | ConvertTo-Json -Compress
    $resp = Invoke-Api "POST" "/api/v1/ledgers/$ledgerId/budgets" $body $token
    OkOrWarn $resp "予算: $categoryId ¥$amount"
}

# 変動金額配列 (index 0=12ヶ月前, 12=当月)
$sideIncome  = @(20000, 25000, 30000, 35000, 40000, 45000, 50000, 45000, 40000, 35000, 30000, 25000, 20000)
$utility     = @(15000, 13000, 10000,  8000,  8000,  9000, 12000, 14000, 15000, 13000, 10000,  8000,  8000)
$foodDay8    = @(30000, 33000, 35000, 37000, 40000, 42000, 44000, 46000, 44000, 42000, 40000, 38000, 35000)
$transport   = @( 5000,  6000,  7000,  8000,  9000, 10000, 12000, 10000,  9000,  8000,  7000,  6000,  5000)

# ─── Step 1: バックエンド起動確認 ───────────────────────────
Step-Print "Step1: バックエンド起動確認"
$started = $false
for ($i = 1; $i -le 15; $i++) {
    try {
        Invoke-RestMethod -Method GET -Uri "$baseUrl/v3/api-docs" -ErrorAction Stop | Out-Null
        Ok "バックエンドが起動しています"; $started = $true; break
    } catch {}
    Write-Host "  待機中... ($i/15)"; Start-Sleep -Seconds 3
}
if (-not $started) { Warn "バックエンドが起動していません。docker compose up -d を実行してください。"; exit 1 }

# ─── Step 2: ユーザー登録 ────────────────────────────────────
Step-Print "Step2: ユーザー登録中..."

function Register-AndLogin {
    param($userId, $userName, $email, $password)
    $regBody = @{ userId=$userId; userName=$userName; email=$email; password=$password } | ConvertTo-Json -Compress
    Invoke-Api "POST" "/api/v1/auth/register" $regBody | Out-Null
    $loginBody = @{ userId=$userId; password=$password } | ConvertTo-Json -Compress
    $resp = Invoke-Api "POST" "/api/v1/auth/login" $loginBody
    # PowerShell 5.1 では return if (...) は無効のため if-else で記述する
    if ($resp -and $resp.data) { return $resp.data.accessToken } else { return "" }
}

$tokenNormal = Register-AndLogin "user_normal"        "正常系ユーザー"           "normal@example.com"     "Password123"
Ok "user_normal"
$tokenOver   = Register-AndLogin "user_over_budget"   "予算超過ユーザー"         "overbudget@example.com" "Password123"
Ok "user_over_budget"
$tokenNodata = Register-AndLogin "user_no_data"       "データなしユーザー"       "nodata@example.com"     "Password123"
Ok "user_no_data"
$tokenMinus  = Register-AndLogin "user_minus_balance" "残高マイナスユーザー"     "minus@example.com"      "Password123"
Ok "user_minus_balance"
$tokenOther  = Register-AndLogin "user_other"         "別ユーザー（アクセス禁止）" "other@example.com"    "Password123"
Ok "user_other"

# ─── Step 3: 帳簿の更新・追加 ───────────────────────────────
Step-Print "Step3: 帳簿の更新・追加中..."

function Get-DefaultLedgerId {
    param($token)
    $resp = Invoke-Api "GET" "/api/v1/ledgers" $null $token
    if ($resp -and $resp.data -and $resp.data.Count -gt 0) { return $resp.data[0].ledgerId }
    return ""
}

$ledgerMainId  = Get-DefaultLedgerId $tokenNormal
$ledgerOverId  = Get-DefaultLedgerId $tokenOver
$ledgerMinusId = Get-DefaultLedgerId $tokenMinus
$ledgerNodataId= Get-DefaultLedgerId $tokenNodata
$ledgerOtherId = Get-DefaultLedgerId $tokenOther

function Update-Ledger {
    param($ledgerId, $token, $name, $balance)
    $body = @{ ledgerName=$name; initialBalance=$balance; startDayOfMonth=1; startMonthOfYear=1 } | ConvertTo-Json -Compress
    $resp = Invoke-Api "PUT" "/api/v1/ledgers/$ledgerId" $body $token
    OkOrWarn $resp "帳簿更新: $name"
}

Update-Ledger $ledgerMainId  $tokenNormal "正常系メイン帳簿"                    500000
Update-Ledger $ledgerOverId  $tokenOver   "予算超過確認帳簿"                    200000
Update-Ledger $ledgerMinusId $tokenMinus  "残高マイナス確認帳簿"                 10000
Update-Ledger $ledgerNodataId $tokenNodata "空帳簿（データなし確認用）"                0
Update-Ledger $ledgerOtherId $tokenOther  "別ユーザー帳簿（アクセス禁止確認用）" 300000

# user_no_data の登録時に自動生成された帳簿を削除する
# → 帳簿0件状態でログインすると LedgerCreateModal が表示されることを確認するためのユーザー
$delResp = Invoke-Api "DELETE" "/api/v1/ledgers/$ledgerNodataId" $null $tokenNodata
OkOrWarn $delResp "user_no_data デフォルト帳簿を削除（帳簿0件モーダル確認用）"

# サブ帳簿を追加
$subBody = @{ ledgerName="サブ帳簿（切替確認用）"; initialBalance=100000 } | ConvertTo-Json -Compress
$subResp = Invoke-Api "POST" "/api/v1/ledgers" $subBody $tokenNormal
OkOrWarn $subResp "サブ帳簿 作成"
$ledgerSubId = if ($subResp -and $subResp.data) { $subResp.data.ledgerId } else { "" }

$longName = "100文字帳簿名の帳簿（あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろわをん１２３４５６７８９０）"
$longBody = @{ ledgerName=$longName; initialBalance=0 } | ConvertTo-Json -Compress
$longResp = Invoke-Api "POST" "/api/v1/ledgers" $longBody $tokenNormal
OkOrWarn $longResp "100文字帳簿 作成"

# ─── Step 4: カスタムカテゴリの追加 ────────────────────────
Step-Print "Step4: カスタムカテゴリの追加中..."

$catsMain  = Invoke-Api "GET" "/api/v1/ledgers/$ledgerMainId/categories" $null $tokenNormal
$catsOver  = Invoke-Api "GET" "/api/v1/ledgers/$ledgerOverId/categories" $null $tokenOver
$catsMinus = Invoke-Api "GET" "/api/v1/ledgers/$ledgerMinusId/categories" $null $tokenMinus
$catsSub   = Invoke-Api "GET" "/api/v1/ledgers/$ledgerSubId/categories" $null $tokenNormal

# user_normal メイン帳簿
$catSalary   = Find-CategoryId $catsMain "給与"
$catSide     = Find-CategoryId $catsMain "副収入"
$catOtherInc = Find-CategoryId $catsMain "その他収入"
$catFood     = Find-CategoryId $catsMain "食費"
$catTransport= Find-CategoryId $catsMain "交通費"
$catRent     = Find-CategoryId $catsMain "住居費"
$catUtility  = Find-CategoryId $catsMain "光熱費"
$catComm     = Find-CategoryId $catsMain "通信費"
$catMedical  = Find-CategoryId $catsMain "医療費"
$catEnt      = Find-CategoryId $catsMain "娯楽費"
$catClothing = Find-CategoryId $catsMain "衣服費"
$catOtherExp = Find-CategoryId $catsMain "その他支出"

# user_over_budget
$catOverSalary  = Find-CategoryId $catsOver "給与"
$catOverFood    = Find-CategoryId $catsOver "食費"
$catOverEnt     = Find-CategoryId $catsOver "娯楽費"
$catOverTrans   = Find-CategoryId $catsOver "交通費"
$catOverRent    = Find-CategoryId $catsOver "住居費"
$catOverClothing= Find-CategoryId $catsOver "衣服費"

# user_minus_balance
$catMinusSalary = Find-CategoryId $catsMinus "給与"
$catMinusRent   = Find-CategoryId $catsMinus "住居費"

# サブ帳簿
$catSubSalary = Find-CategoryId $catsSub "給与"
$catSubFood   = Find-CategoryId $catsSub "食費"

# カスタムカテゴリ追加
$customBody = @{ categoryName="カスタムカテゴリ（追加確認用）"; categoryType="EXPENSE"; displayOrder=99 } | ConvertTo-Json -Compress
$customResp = Invoke-Api "POST" "/api/v1/ledgers/$ledgerMainId/categories" $customBody $tokenNormal
OkOrWarn $customResp "カスタムカテゴリ 作成"

Ok "カテゴリIDをすべて取得しました"

# ─── Step 5: 明細データ投入 ─────────────────────────────────
Step-Print "Step5: 明細データ投入中... (13ヶ月分)"

$memo500 = "あ" * 500

# ── user_normal 正常系メイン帳簿: 13ヶ月ループ ──
Write-Host "  [user_normal 正常系メイン帳簿]"
for ($idx = 0; $idx -le 12; $idx++) {
    $monthsAgo = 12 - $idx
    $dt        = $now.AddMonths(-$monthsAgo)
    $ym        = $dt.ToString("yyyy-MM")
    $lastDay   = [DateTime]::DaysInMonth($dt.Year, $dt.Month)
    $lastDayStr= "{0:D2}" -f $lastDay

    # 収入 (index=0 は支出のみ月)
    if ($idx -ne 0) {
        Post-Transaction $ledgerMainId $tokenNormal $catSalary "INCOME" 280000 "${ym}-25"          "月次給与（正常系）"
        Post-Transaction $ledgerMainId $tokenNormal $catSide   "INCOME" $sideIncome[$idx] "${ym}-${lastDayStr}" "副業収入（変動収入確認用）"
    }

    # 支出 (index=1 は収入のみ月)
    if ($idx -ne 1) {
        # index=2 は食費のみ月
        if ($idx -ne 2) {
            Post-Transaction $ledgerMainId $tokenNormal $catRent     "EXPENSE" 80000              "${ym}-01" "家賃（固定費・正常系）"
            Post-Transaction $ledgerMainId $tokenNormal $catComm     "EXPENSE" 5500               "${ym}-25" "スマホ代（固定費・正常系）"
            Post-Transaction $ledgerMainId $tokenNormal $catUtility  "EXPENSE" $utility[$idx]     "${ym}-05" "光熱費（季節変動確認用）"
            Post-Transaction $ledgerMainId $tokenNormal $catTransport"EXPENSE" $transport[$idx]   "${ym}-10" "交通費（正常系）"
            Post-Transaction $ledgerMainId $tokenNormal $catEnt      "EXPENSE" 8000               "${ym}-15" "娯楽費（予算内・正常系）"
        }
        Post-Transaction $ledgerMainId $tokenNormal $catFood "EXPENSE" $foodDay8[$idx] "${ym}-08" "食費週次（正常系）"
        Post-Transaction $ledgerMainId $tokenNormal $catFood "EXPENSE" 8000            "${ym}-20" "食費追加分（正常系）"
    }
}
Ok "13ヶ月分 通常データ完了"

# 当月の境界値データ
$currYM   = $now.ToString("yyyy-MM")
$currLast = "{0:D2}" -f [DateTime]::DaysInMonth($curYear, $curMonth)

Post-Transaction $ledgerMainId $tokenNormal $catFood     "EXPENSE" 1       "${currYM}-01"       "最小金額（境界値確認用）"
Post-Transaction $ledgerMainId $tokenNormal $catClothing "EXPENSE" 999999  "${currYM}-28"       "高額支出（境界値確認用）"
Post-Transaction $ledgerMainId $tokenNormal $catOtherExp "EXPENSE" 15000   "${currYM}-${currLast}" "月末日付（境界値確認用）"
Post-Transaction $ledgerMainId $tokenNormal $catSalary   "INCOME"  280000  "${currYM}-01"       "月初日付（境界値確認用）"
Post-Transaction $ledgerMainId $tokenNormal $catFood     "EXPENSE" 5000    "${currYM}-15"       ",カンマ含むメモ（CSV確認用）,"
Post-Transaction $ledgerMainId $tokenNormal $catTransport"EXPENSE" 3000    "${currYM}-16"       "日本語メモ（文字コード確認用）電車代"
Post-Transaction $ledgerMainId $tokenNormal $catOtherExp "EXPENSE" 1000    "${currYM}-17"       ""
Post-Transaction $ledgerMainId $tokenNormal $catEnt      "EXPENSE" 500     "${currYM}-18"       $memo500
Post-Transaction $ledgerMainId $tokenNormal $catMedical  "EXPENSE" 10000   "2024-02-29"         "うるう日（境界値確認用）"
Ok "当月境界値データ完了"

# ── user_normal サブ帳簿 ──
Write-Host "  [user_normal サブ帳簿]"
Post-Transaction $ledgerSubId $tokenNormal $catSubSalary "INCOME"  150000 "${currYM}-25" "サブ帳簿収入（切替確認用）"
Post-Transaction $ledgerSubId $tokenNormal $catSubFood   "EXPENSE"  20000 "${currYM}-10" "サブ帳簿支出（切替確認用）"
Ok "サブ帳簿完了"

# ── user_over_budget ──
Write-Host "  [user_over_budget 予算超過確認帳簿]"
Post-Transaction $ledgerOverId $tokenOver $catOverSalary   "INCOME"  200000 "${currYM}-25" "収入（予算超過ユーザー）"
Post-Transaction $ledgerOverId $tokenOver $catOverFood     "EXPENSE"  48000 "${currYM}-10" "食費予算オーバー120%（異常系確認用）"
Post-Transaction $ledgerOverId $tokenOver $catOverEnt      "EXPENSE"   8500 "${currYM}-15" "娯楽費警告85%（異常系確認用）"
Post-Transaction $ledgerOverId $tokenOver $catOverTrans    "EXPENSE"   5000 "${currYM}-20" "交通費予算内50%（正常系確認用）"
Post-Transaction $ledgerOverId $tokenOver $catOverClothing "EXPENSE" 100000 "${currYM}-05" "衣服費大幅超過333%（異常系確認用）"
Ok "予算超過確認帳簿完了"

# ── user_minus_balance ──
Write-Host "  [user_minus_balance 残高マイナス確認帳簿]"
Post-Transaction $ledgerMinusId $tokenMinus $catMinusSalary "INCOME"   50000 "${currYM}-25" "収入（残高マイナスユーザー）"
Post-Transaction $ledgerMinusId $tokenMinus $catMinusRent   "EXPENSE" 200000 "${currYM}-01" "支出が収入を大幅超過（残高マイナス確認用）"
Ok "残高マイナス確認帳簿完了"

# ─── Step 6: 固定費データ投入 ────────────────────────────────
Step-Print "Step6: 固定費データ投入中..."

$currM01   = "${currYM}-01"
$currLast2 = "${currYM}-${currLast}"

Post-FixedTransaction $ledgerMainId $tokenNormal $catRent      "家賃（有効・正常系）"        "EXPENSE" 80000  1  "2025-01-01" $null
Post-FixedTransaction $ledgerMainId $tokenNormal $catComm      "スマホ代（有効・正常系）"    "EXPENSE" 5500   25 "2025-04-01" $null
Post-FixedTransaction $ledgerMainId $tokenNormal $catEnt       "今月開始の固定費（境界値）"  "EXPENSE" 3000   20 $currM01     $null
Post-FixedTransaction $ledgerMainId $tokenNormal $catUtility   "28日発生の固定費（境界値）"  "EXPENSE" 2000   28 "2025-01-01" $null
Post-FixedTransaction $ledgerMainId $tokenNormal $catEnt       "旧サブスク（終了済み）"      "EXPENSE" 1490   15 "2024-04-01" "2025-03-31"
Post-FixedTransaction $ledgerMainId $tokenNormal $catTransport "今月終了の固定費（境界値）"  "EXPENSE" 1000   10 "2025-01-01" $currLast2
Post-FixedTransaction $ledgerOverId $tokenOver   $catOverRent  "高額固定費（予算超過用）"    "EXPENSE" 150000 1  "2025-01-01" $null

# ─── Step 7: 予算データ投入 ──────────────────────────────────
Step-Print "Step7: 予算データ投入中..."

# user_normal 正常系メイン帳簿
Post-Budget $ledgerMainId $tokenNormal $catFood      45000
Post-Budget $ledgerMainId $tokenNormal $catTransport 12000
Post-Budget $ledgerMainId $tokenNormal $catEnt       10000
Post-Budget $ledgerMainId $tokenNormal $catClothing  20000

# user_over_budget
Post-Budget $ledgerOverId $tokenOver $catOverFood     40000
Post-Budget $ledgerOverId $tokenOver $catOverEnt      10000
Post-Budget $ledgerOverId $tokenOver $catOverTrans    10000
Post-Budget $ledgerOverId $tokenOver $catOverClothing 30000

# ─── 完了 ────────────────────────────────────────────────────
Write-Host ""
Write-Host "==================================================" -ForegroundColor Green
Write-Host "=== シードデータの投入が完了しました ===" -ForegroundColor Green
Write-Host "==================================================" -ForegroundColor Green
Write-Host "■ ログイン情報:" -ForegroundColor Yellow
Write-Host "  正常系ユーザー:       user_normal        / Password123"
Write-Host "  予算超過ユーザー:     user_over_budget   / Password123"
Write-Host "  データなしユーザー:   user_no_data       / Password123"
Write-Host "  残高マイナスユーザー: user_minus_balance / Password123"
Write-Host "  別ユーザー:           user_other         / Password123"
Write-Host ""
Write-Host "■ データ確認SQL:" -ForegroundColor Yellow
Write-Host '  docker compose exec db psql -U moneynote -d moneynote -c "SELECT user_id, user_name FROM users;"'
Write-Host '  docker compose exec db psql -U moneynote -d moneynote -c "SELECT ledger_name, initial_balance FROM ledgers;"'
Write-Host '  docker compose exec db psql -U moneynote -d moneynote -c "SELECT COUNT(*) FROM transactions;"'
Write-Host '  docker compose exec db psql -U moneynote -d moneynote -c "SELECT fixed_name, end_date FROM fixed_transactions;"'
Write-Host '  docker compose exec db psql -U moneynote -d moneynote -c "SELECT c.category_name, b.amount FROM budgets b JOIN categories c ON b.category_id=c.category_id;"'
