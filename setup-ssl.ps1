# ===========================================================
# MoneyNote Web - ローカル SSL 証明書セットアップスクリプト
# 初回のみ実行してください。
# 前提: mkcert がインストール済みであること
#   インストール方法: winget install mkcert
# ===========================================================

$ErrorActionPreference = "Stop"

# ── mkcert の存在確認 ────────────────────────────────────────
if (-not (Get-Command mkcert -ErrorAction SilentlyContinue)) {
    Write-Host ""
    Write-Host "ERROR: mkcert が見つかりません。" -ForegroundColor Red
    Write-Host "  以下のコマンドでインストールしてから再実行してください。" -ForegroundColor Red
    Write-Host ""
    Write-Host "  winget install mkcert" -ForegroundColor Cyan
    Write-Host ""
    exit 1
}

# ── ローカル CA をシステムに登録（初回のみ必要）────────────
Write-Host ""
Write-Host "=== ローカル CA をシステムに登録します ===" -ForegroundColor Cyan
Write-Host "  ブラウザが証明書を「信頼済み」と認識するために必要です。"
mkcert -install

# ── 証明書を nginx/certs/ に生成 ────────────────────────────
Write-Host ""
Write-Host "=== localhost 用 SSL 証明書を生成します ===" -ForegroundColor Cyan

$certsDir = Join-Path $PSScriptRoot "nginx\certs"
New-Item -ItemType Directory -Force -Path $certsDir | Out-Null

mkcert `
    -cert-file "$certsDir\localhost.pem" `
    -key-file  "$certsDir\localhost-key.pem" `
    localhost 127.0.0.1 ::1

Write-Host ""
Write-Host "=== セットアップ完了 ===" -ForegroundColor Green
Write-Host "  証明書を生成しました: nginx/certs/localhost.pem"
Write-Host ""
Write-Host "次のステップ:"
Write-Host "  docker compose up -d --build"
Write-Host "  ブラウザで https://localhost を開く"
Write-Host ""
