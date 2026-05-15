# MoneyNote Web — AWSデプロイ設計書（Step 17〜22）

**作成日:** 2026年5月  
**バージョン:** 1.0  
**区分:** 個人開発

---

## 目次

1. [プロジェクト概要](#1-プロジェクト概要)
2. [AWS利用方針](#2-aws利用方針)
3. [コスト見積もり](#3-コスト見積もり)
4. [Step 17 — 環境1デプロイ（EC2 + Docker Compose）](#4-step-17--環境1デプロイec2--docker-compose)
5. [Step 18 — CI/CDパイプライン構築](#5-step-18--cicdパイプライン構築)
6. [Step 19 — 環境2構築](#6-step-19--環境2構築)
7. [Step 20〜21 — 3層構成への移行](#7-step-2021--3層構成への移行)
8. [Step 22 — SES・Secrets Manager本格活用](#8-step-22--sessecrets-manager本格活用)
9. [セキュリティ設計](#9-セキュリティ設計)
10. [移行ロードマップ](#10-移行ロードマップ)

---

## 1. プロジェクト概要

### 1.1 システム概要

| 項目 | 内容 |
|---|---|
| システム名 | MoneyNote Web |
| 概要 | Web版家計簿管理アプリ（マルチアカウント・マルチ帳簿対応） |
| 技術スタック | Spring Boot 3.4.5 / Java 24 / Next.js 14 / TypeScript / PostgreSQL / Redis |
| 現在のバージョン | v0.6.0（Step 16完了） |
| 対象ドキュメント | Step 17〜22 AWSデプロイ計画 |

### 1.2 リリース計画

| バージョン | Step | 内容 | フェーズ |
|---|---|---|---|
| v1.0.0 | Step 17 | 環境1デプロイ（EC2 + Docker Compose） | 初回デプロイ |
| v1.1.0 | Step 18 | CI/CDパイプライン構築（GitHub Actions） | 自動化 |
| v1.2.0 | Step 19 | 環境2構築（環境1と同構成） | 多環境管理 |
| v1.3.0 | Step 20 | 環境1を3層構成に移行（RDS・ElastiCache） | インフラ強化 |
| v1.4.0 | Step 21 | 環境2を3層構成に移行 | インフラ強化 |
| v1.5.0 | Step 22 | SES・Secrets Manager本格活用 | 運用強化 |

---

## 2. AWS利用方針

### 2.1 基本方針

- 会社AWSアカウントから払い出されたIAMユーザー（AdministratorAccess）を使用
- リージョン: **ap-northeast-1（東京）に統一**（ALL.4対応）
- 利用者: 数人のテストユーザー（大規模公開は想定しない）
- 運用: テスト・動作確認時のみ稼働。未使用時は**停止または削除**（ALL.2対応）
- AWSリソースの作成は**AWSコンソールのCloudShellを使用**（IAM.3対応・アクセスキー不要）
- 詰まった場合はローカルにAWS CLIをインストールしてアクセスキーを一時使用することを検討

### 2.2 ガイドライン遵守チェックリスト

本プロジェクトは社内AWSガイドライン（`docs/aws-guidelines.md`）を**全て厳守・遵守**する。

| ルール | 内容 | 対応方針 |
|---|---|---|
| ALL.1 | リソースをパブリックに公開しない | ALBのみ公開・EC2/RDS/Redisはプライベートに配置 |
| ALL.2 | 未使用リソースは削除または停止 | テスト後・休日は停止or削除 |
| ALL.3 | IAMロールを使用（アクセスキー禁止） | EC2にIAMロール付与・CloudShellでアクセスキー不要 |
| ALL.4 | 使用リージョンを統一 | ap-northeast-1（東京）に統一 |
| ALL.5 | アカウント全体設定変更禁止 | 既存IAMロール変更なし・新規作成のみ |
| ALL.6 | リソースに適切にタグ付け | タグ付けルールに従い全リソースにNameタグを付与 |
| IAM.1 | IAMユーザーの共有禁止 | 払い出された個人IAMユーザーのみ使用 |
| IAM.2 | 最小権限の原則 | 設計が固まり次第IAMロールの権限を絞り込む |
| IAM.3 | アクセスキー禁止 | CloudShellを使用・EC2はIAMロールで対応 |
| EC2.1 | パブリックIP付与は最小限 | **Step 17はEC2にパブリックIPを付与（やむを得ない例外）** SSM Session ManagerでSSH代替。Step 20移行時にProtectedサブネットへ移動 |
| EC2.2 | SGは最小権限 | ALBからの通信のみEC2に許可。多層防御を実施 |
| EC2.3 | 未使用インスタンスは停止または削除 | テスト後・休日は停止or削除 |
| EC2.4 | EBSスナップショット非公開 | パブリック公開設定をしない |
| VPC.1 | ネットワークレイヤを作成 | Public・Privateの2層構成（Step 20で3層に拡張） |
| VPC.2 | 全レイヤでトラフィックコントロール | SG多層防御（ALB用SG→EC2用SGの連鎖制限） |
| VPC.3 | 自動パブリックIP割り当て禁止 | 全サブネットで自動割り当てを無効化 |
| S3.1/2 | S3非公開 | パブリックアクセスブロックを有効化 |
| S3.3 | 未使用S3削除 | 不要になったバケットは削除 |
| S3.4 | BucketPolicyの制限 | 他アカウントへの権限委任なし |
| RDS.1 | RDS非公開 | Privateサブネットに配置（Step 20以降） |
| RDS.2 | RDSスナップショット非公開 | パブリック公開設定をしない |
| RDS.3 | 未使用RDS停止または削除 | **停止後7日で自動起動するため、7日以上停止する場合はスナップショット取得後に削除** |

> ⚠️ **RDS停止の注意:** RDSは停止後7日で自動起動します。長期間停止したい場合は必ずスナップショットを取得してから削除してください。

### 2.3 タグ付けルール

**命名規則:**
```
<リソース文字>_ka_moneynote_<2桁連番>
```
アンダースコアが使えないリソース（RDS・ALB・ターゲットグループ等）はハイフンで代用:
```
<リソース文字>-ka-moneynote-<2桁連番>
```

**リソース文字一覧:**

| リソース | 文字 |
|---|---|
| EC2 | EC2 |
| AMI | AMI |
| Auto Scaling起動テンプレート | LTP |
| Auto Scalingグループ | ASG |
| S3 | S3 |
| RDS | RDS |
| Application Load Balancer | ALB |
| Network Load Balancer | NLB |
| ターゲットグループ | TGT |
| VPC | VPC |
| サブネット | SBN |
| サブネットグループ | SNG |
| ルートテーブル | RTB |
| Internet Gateway | IGW |
| セキュリティグループ | SEG |
| IAMユーザ | IAM |
| IAMグループ | IAM_G |
| IAMロール | IAM_R |
| カスタマー管理ポリシー | IAM_P |
| ElastiCache | ELC |
| NAT Gateway | NGW |
| CloudWatch Logs | CWL |

> 一覧に存在しないサービスを利用する場合は妥当な文字を設定すること。

**環境別リソース命名一覧:**

| リソース | 環境1 | 環境2 | 備考 |
|---|---|---|---|
| VPC | VPC_ka_moneynote_01 | VPC_ka_moneynote_02 | |
| Publicサブネット | SBN_ka_moneynote_01 | SBN_ka_moneynote_02 | |
| Privateサブネット | SBN_ka_moneynote_03 | SBN_ka_moneynote_04 | |
| Internet Gateway | IGW_ka_moneynote_01 | IGW_ka_moneynote_02 | |
| ルートテーブル（Public） | RTB_ka_moneynote_01 | RTB_ka_moneynote_02 | |
| ルートテーブル（Private） | RTB_ka_moneynote_03 | RTB_ka_moneynote_04 | |
| SG（ALB用） | SEG_ka_moneynote_01 | SEG_ka_moneynote_02 | |
| SG（EC2用） | SEG_ka_moneynote_03 | SEG_ka_moneynote_04 | |
| EC2 | EC2_ka_moneynote_01 | EC2_ka_moneynote_02 | |
| ALB | ALB-ka-moneynote-01 | ALB-ka-moneynote-02 | |
| ターゲットグループ | TGT-ka-moneynote-01 | TGT-ka-moneynote-02 | |
| IAMロール（EC2用） | IAM_R_ka_moneynote_01 | ※環境共通 | |
| IAMポリシー | IAM_P_ka_moneynote_01 | ※環境共通 | |
| S3（ログ用） | S3_ka_moneynote_01 | ※環境共通 | |
| Protectedサブネット（Step 20〜） | SBN_ka_moneynote_05 | SBN_ka_moneynote_06 | Step 20で追加 |
| NAT Gateway（Step 20〜） | NGW_ka_moneynote_01 | NGW_ka_moneynote_02 | Step 20で追加 |
| RDS（Step 20〜） | RDS-ka-moneynote-01 | RDS-ka-moneynote-02 | Step 20で追加 |
| ElastiCache（Step 20〜） | ELC-ka-moneynote-01 | ELC-ka-moneynote-02 | Step 20で追加 |
| サブネットグループ（RDS用） | SNG_ka_moneynote_01 | SNG_ka_moneynote_02 | Step 20で追加 |
| サブネットグループ（Cache用） | SNG_ka_moneynote_03 | SNG_ka_moneynote_04 | Step 20で追加 |

---

## 3. コスト見積もり

### 3.1 稼働パターン

- テスト・動作確認時のみ稼働（24時間365日稼働しない）
- 休日・未使用時は**停止または削除**
- **最小値:** 月40時間稼働（平日2時間×20日）
- **最大値:** 月200時間稼働（平日10時間×20日）
- EBSは**停止中も課金される**点に注意
- **2024年2月以降、パブリックIPv4アドレスには$0.005/時間（月約$3.60）の課金が発生**
  - EC2・ALBそれぞれのパブリックIPに適用される

### 3.2 Step 17〜19（EC2 + Docker Compose構成・2環境合計）

| サービス | スペック | 月40h稼働 | 月200h稼働 | 備考 |
|---|---|---|---|---|
| EC2 × 2 | t3.small ($0.034/h) | $2.7 | $13.6 | 停止中は課金なし |
| EBS × 2 | 20GB gp3 ($0.096/GB) | $3.8 | $3.8 | **停止中も課金** |
| パブリックIP（EC2） × 2 | $0.005/h | $0.4 | $2.0 | 2024年2月〜課金開始 |
| ALB × 2 | $0.0243/h + LCU | $1.9 | $9.7 | |
| パブリックIP（ALB） × 2 | $0.005/h | $0.4 | $2.0 | 2024年2月〜課金開始 |
| ACM | SSL証明書 | $0 | $0 | 無料 |
| S3・CloudWatch | 最小限 | $2.0 | $4.0 | |
| **合計** | | **約$11/月（約1,700円）** | **約$35/月（約5,300円）** | |

### 3.3 Step 20〜22（3層構成移行後・2環境合計）

| サービス | スペック | 月40h稼働 | 月200h稼働 | 備考 |
|---|---|---|---|---|
| EC2 × 2 | t3.small | $2.7 | $13.6 | |
| EBS × 2 | 20GB gp3 | $3.8 | $3.8 | **停止中も課金** |
| パブリックIP（ALB） × 2 | $0.005/h | $0.4 | $2.0 | EC2はPrivateサブネットに移動 |
| ALB × 2 | $0.0243/h | $1.9 | $9.7 | |
| RDS × 2 | db.t3.micro ($0.034/h) | $2.7 | $13.6 | 停止後7日で自動起動に注意 |
| ElastiCache × 2 | cache.t3.micro ($0.019/h) | $1.5 | $7.6 | |
| NAT Gateway × 2 | $0.062/h + $0.062/GB | $5.0 | $24.8 | **稼働中は常時課金** |
| S3・CloudWatch | 最小限 | $3.0 | $5.0 | |
| **合計** | | **約$21/月（約3,200円）** | **約$80/月（約12,000円）** | |

> ⚠️ **NAT Gatewayのコスト注意:** NAT Gatewayは存在するだけで課金されます（停止不可）。使わない期間は**削除**してください。

---

## 4. Step 17 — 環境1デプロイ（EC2 + Docker Compose）

### 4.1 アーキテクチャ概要

EC2上でDocker Composeを使用してローカル環境と同等の構成でデプロイする。  
将来のRDS・ElastiCache移行（Step 20）を見据えてPrivateサブネットを事前に確保しておく。

```
インターネット
    ↓ HTTPS(443)
Internet Gateway (IGW_ka_moneynote_01)
    ↓
[Publicサブネット: 10.0.1.0/24]
    ├── ALB-ka-moneynote-01  ← SEG_ka_moneynote_01でHTTPS(443)のみ受付
    └── EC2_ka_moneynote_01  ← SEG_ka_moneynote_03でALBからの8080のみ受付
         ├── nginx（リバースプロキシ）
         ├── Next.js（フロントエンド: 3000）
         ├── Spring Boot（バックエンドAPI: 8080）
         ├── PostgreSQL（DB: 5432）
         └── Redis（セッション・キャッシュ: 6379）

[Privateサブネット: 10.0.3.0/24]
    └── （現時点では空・Step 20でRDS・ElastiCacheを配置）
```

### 4.2 VPCネットワーク設計

| リソース | Name タグ | 設定値 |
|---|---|---|
| VPC | VPC_ka_moneynote_01 | CIDR: 10.0.0.0/16・DNS解決有効・DNSホスト名有効 |
| Publicサブネット | SBN_ka_moneynote_01 | CIDR: 10.0.1.0/24・AZ: ap-northeast-1a・自動パブリックIP: **無効** |
| Privateサブネット | SBN_ka_moneynote_03 | CIDR: 10.0.3.0/24・AZ: ap-northeast-1a・自動パブリックIP: **無効** |
| Internet Gateway | IGW_ka_moneynote_01 | VPC_ka_moneynote_01にアタッチ |
| ルートテーブル（Public） | RTB_ka_moneynote_01 | 0.0.0.0/0 → IGW_ka_moneynote_01・SBN_ka_moneynote_01に関連付け |
| ルートテーブル（Private） | RTB_ka_moneynote_03 | ローカルのみ（デフォルトルートなし）・SBN_ka_moneynote_03に関連付け |

> ⚠️ **VPC.3対応:** 全サブネットで「パブリックIPv4アドレスの自動割り当て」を**無効**にすること。EC2へのパブリックIP付与はインスタンス起動時に個別に設定する。

### 4.3 セキュリティグループ設計（VPC.2 多層防御）

#### SEG_ka_moneynote_01（ALB用）

| 方向 | プロトコル | ポート | 送信元/送信先 | 理由 |
|---|---|---|---|---|
| インバウンド | TCP | 443 | 0.0.0.0/0 | インターネットからのHTTPS |
| アウトバウンド | TCP | 8080 | SEG_ka_moneynote_03 | EC2へのトラフィックのみ許可 |

#### SEG_ka_moneynote_03（EC2用）

| 方向 | プロトコル | ポート | 送信元/送信先 | 理由 |
|---|---|---|---|---|
| インバウンド | TCP | 8080 | SEG_ka_moneynote_01 | ALBからのトラフィックのみ許可 |
| アウトバウンド | TCP | 443 | 0.0.0.0/0 | Docker pull・外部API・SSM通信 |
| アウトバウンド | TCP | 80 | 0.0.0.0/0 | HTTP外部通信（必要に応じて） |

> ✅ **多層防御の確認:**
> - ALBのSGはインターネット → ALBの443のみ許可
> - EC2のSGはALBのSGからの8080のみ許可（送信元をSGIDで指定する）
> - SSHの22番ポートは**開放しない**（SSM Session Managerで代替）
> - EC2へのパブリックIPは付与するが、SGでインバウンドを制限することでALL.1を担保

### 4.4 IAMロール設計

**IAM_R_ka_moneynote_01 に付与する権限:**

| 権限 | 理由 |
|---|---|
| AmazonSSMManagedInstanceCore | SSM Session ManagerでEC2にアクセスするため（EC2.1対応） |
| CloudWatchLogsFullAccess（後で絞り込み） | アプリケーションログをCloudWatchに送信するため |
| secretsmanager:GetSecretValue（対象リソースのみ） | JWT_SECRET等の機密情報を取得するため |

> ⚠️ **IAM.2対応:** 最初は広めの権限を付与し、設計が固まってから絞り込む。

### 4.5 機密情報管理（Secrets Manager）

| シークレット名 | 内容 | 利用箇所 |
|---|---|---|
| moneynote/env1/db-password | PostgreSQLパスワード | docker-compose.env1.yml |
| moneynote/env1/jwt-secret | JWT署名キー（256bit以上） | application-env1.yml |
| moneynote/env1/redis-password | Redisパスワード | docker-compose.env1.yml |
| moneynote/env1/claude-api-key | Claude APIキー | application-env1.yml |

> ✅ EC2のIAMロール経由でSecrets Managerから取得する。アクセスキーをコードに埋め込まない。

### 4.6 アクセスURL

独自ドメインは使用しない。ALBのデフォルトDNS名でアクセスする。

```
https://ALB-ka-moneynote-01-xxxxxxxxxx.ap-northeast-1.elb.amazonaws.com
```

> 将来的に独自ドメインを取得した際にRoute 53で紐付ける。

### 4.7 作業手順

#### Phase 1: AWSリソース作成（CloudShellで実行）

1. **VPC作成**
   - CIDR: 10.0.0.0/16
   - DNS解決・DNSホスト名を有効化
   - Nameタグ: VPC_ka_moneynote_01

2. **サブネット作成**
   - Publicサブネット（10.0.1.0/24）・自動パブリックIP割り当て: 無効
   - Privateサブネット（10.0.3.0/24）・自動パブリックIP割り当て: 無効

3. **Internet Gateway作成・VPCにアタッチ**

4. **ルートテーブル作成**
   - Publicルートテーブル: 0.0.0.0/0 → IGW・Publicサブネットに関連付け
   - Privateルートテーブル: ローカルのみ・Privateサブネットに関連付け

5. **セキュリティグループ作成**
   - SEG_ka_moneynote_01（ALB用）
   - SEG_ka_moneynote_03（EC2用）
   - **インバウンドルールのSG指定は作成順に依存するため、両SG作成後に設定する**

6. **IAMロール・IAMポリシー作成**
   - IAM_R_ka_moneynote_01（EC2用）
   - AmazonSSMManagedInstanceCoreをアタッチ

7. **EC2インスタンス起動**
   - AMI: Amazon Linux 2023（最新版）
   - インスタンスタイプ: t3.small
   - サブネット: SBN_ka_moneynote_01（Publicサブネット）
   - パブリックIPの自動割り当て: **有効**（このインスタンスのみ個別に有効化）
   - IAMロール: IAM_R_ka_moneynote_01
   - セキュリティグループ: SEG_ka_moneynote_03
   - EBSボリューム: 20GB gp3
   - キーペア: **作成しない**（SSMで接続するため不要）

8. **ALB・ターゲットグループ作成**
   - ALB: ALB-ka-moneynote-01（インターネット向け・Publicサブネット）
   - ターゲットグループ: TGT-ka-moneynote-01（HTTP:8080・ヘルスチェック: /actuator/health）
   - EC2インスタンスをターゲットに登録

9. **自己署名証明書の生成・ACMへのインポート**
```bash
   # 自己署名証明書を生成（有効期限: 825日）
   openssl req -x509 -nodes -days 825 -newkey rsa:2048 \
     -keyout self-signed.key \
     -out self-signed.crt \
     -subj "/CN=moneynote-env1"

   # ACMにインポート
   aws acm import-certificate \
     --certificate fileb://self-signed.crt \
     --private-key fileb://self-signed.key \
     --region ap-northeast-1
```
   > ブラウザで「安全でない」警告が出るがテスト用途のため許容する。
   > 将来独自ドメインを取得した際にACMパブリック証明書に切り替える。

10. **ALBにHTTPSリスナー設定**
    - ポート443・ACM証明書をアタッチ
    - ターゲットグループ: TGT-ka-moneynote-01

11. **S3バケット作成（ログ用）**
    - Name: S3_ka_moneynote_01
    - パブリックアクセスブロック: **全て有効**（S3.1/2対応）
    - バージョニング: 有効

#### Phase 2: アプリケーション設定（SSM Session Managerで実行）

> **SSM Session Managerでの接続方法:**
> AWSコンソール → EC2 → インスタンス → 接続 → Session Manager → 接続

1. **Dockerのインストール**
   ```bash
   sudo dnf update -y
   sudo dnf install -y docker
   sudo systemctl start docker
   sudo systemctl enable docker
   sudo usermod -aG docker ssm-user
   # Docker Composeのインストール
   sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
   sudo chmod +x /usr/local/bin/docker-compose
   ```

2. **Secrets Managerへのシークレット登録（CloudShellで実行）**
   ```bash
   aws secretsmanager create-secret \
     --name moneynote/env1/db-password \
     --secret-string "your-db-password" \
     --region ap-northeast-1
   # 同様にjwt-secret・redis-password・claude-api-keyを登録
   ```

3. **リポジトリのクローン**
   ```bash
   sudo dnf install -y git
   git clone https://github.com/skajihara/moneynote-web.git
   cd moneynote-web
   ```

4. **環境変数の取得スクリプト作成**
   ```bash
   # Secrets Managerから機密情報を取得して環境変数に設定するスクリプトを作成
   # .envファイルには機密情報を書かない
   ```

5. **docker-compose.env1.ymlの作成**
   - 本番用Docker Compose設定を作成
   - 機密情報は環境変数経由で注入（ハードコード禁止）

6. **application-env1.ymlの作成**
   - 本番用Spring Boot設定を作成
   - DB接続先・Redis接続先・JWT設定等を環境変数で注入

7. **Docker Composeでアプリ起動**
   ```bash
   docker-compose -f docker-compose.env1.yml up -d
   ```

#### Phase 3: 動作確認

1. **ヘルスチェック確認**
   ```bash
   curl http://localhost:8080/actuator/health
   ```

2. **ターゲットグループのヘルスチェック確認**
   - AWSコンソール → EC2 → ターゲットグループ → TGT-ka-moneynote-01
   - ステータスが「healthy」になっていること

3. **ブラウザでアクセス確認**
   - `https://{ALBのDNS名}` にアクセス
   - ログイン画面が表示されること

4. **seedデータ投入**
   ```bash
   # EC2上でseedスクリプトを実行
   ```

5. **全機能の動作確認**
   - ログイン・帳簿・明細・レポート・AI分析等を確認

#### 作業完了後の注意事項

- 動作確認完了後、不要なリソースは**停止または削除**する（ALL.2・EC2.3対応）
- EC2を停止する際はDockerコンテナを事前に停止する
- EBSは停止中も課金されることを忘れずに

---

## 5. Step 18 — CI/CDパイプライン構築

### 5.1 概要

GitHub Actionsを使用してテスト・ビルド・EC2へのデプロイを自動化する。  
**AWSの認証にはIAM OIDCプロバイダーを使用してアクセスキーなしで実現する（IAM.3対応）。**

### 5.2 パイプライン構成

| ブランチ | トリガー | 処理 | デプロイ先 |
|---|---|---|---|
| develop | push | テスト → ビルド → デプロイ | 環境1 |
| main | push | テスト → ビルド → デプロイ | 環境2（Step 19構築後） |
| 全ブランチ | PR作成 | テストのみ | — |

### 5.3 ワークフロー構成

| ジョブ | 内容 |
|---|---|
| test-backend | `./gradlew test` でJUnit5テストを実行 |
| test-frontend | `npm test` でJestテストを実行 |
| build | Dockerイメージをビルド |
| deploy | SSM Send Commandを使用してEC2にデプロイ |

### 5.4 IAM OIDCプロバイダーの設定

GitHub ActionsがAWSにアクセスするためのIAMロールを作成する。

1. IAMコンソールでOIDCプロバイダーを追加
   - プロバイダーURL: `https://token.actions.githubusercontent.com`
   - 対象者: `sts.amazonaws.com`

2. IAMロールを作成
   - 信頼ポリシー: GitHubリポジトリからのみアクセスを許可
   - 権限: SSM Send Command・EC2インスタンス操作（最小限）

### 5.5 GitHub Secrets 設定

| Secret名 | 内容 |
|---|---|
| AWS_ROLE_ARN | IAM OIDCロールのARN |
| AWS_REGION | ap-northeast-1 |
| EC2_INSTANCE_ID_ENV1 | 環境1のEC2インスタンスID |
| EC2_INSTANCE_ID_ENV2 | 環境2のEC2インスタンスID（Step 19構築後） |

> ⚠️ **アクセスキーはGitHub SecretsにもCLAUDE.mdにも記載しない。**

---

## 6. Step 19 — 環境2構築

### 6.1 概要

環境1と同スペック・同構成で環境2を構築する。  
mainブランチのコードを環境2にデプロイする。

### 6.2 環境1との違い

| 項目 | 環境1 | 環境2 |
|---|---|---|
| 対象ブランチ | develop | main |
| 用途 | 開発・テスト | 本番相当テスト |
| Spring Boot設定 | application-env1.yml | application-env2.yml |
| Secrets Manager | moneynote/env1/* | moneynote/env2/* |
| VPC | VPC_ka_moneynote_01 | VPC_ka_moneynote_02 |
| EC2 | EC2_ka_moneynote_01 | EC2_ka_moneynote_02 |
| ALB | ALB-ka-moneynote-01 | ALB-ka-moneynote-02 |

### 6.3 作業手順

Step 17の手順を環境2用のリソース名・設定で繰り返す。  
CIDRブロックは環境1と重複しないように設定する。

```
環境2 VPC CIDR: 10.1.0.0/16
環境2 Publicサブネット: 10.1.1.0/24
環境2 Privateサブネット: 10.1.3.0/24
```

---

## 7. Step 20〜21 — 3層構成への移行

### 7.1 概要

EC2上のDockerで動いているPostgreSQL・RedisをRDS・ElastiCacheに移行する。  
VPCを3層構成（Public・Protected・Private）に拡張する。  
Step 20で環境1・Step 21で環境2を移行する。

### 7.2 移行後のアーキテクチャ

```
インターネット
    ↓ HTTPS(443)
Internet Gateway
    ↓
[Publicサブネット]
    └── ALB
         ↓ HTTP(8080)
[Protectedサブネット] ← NAT Gateway経由で外部通信
    └── EC2（nginx・Next.js・Spring Boot）
         ↓
[Privateサブネット]
    ├── RDS（PostgreSQL）
    └── ElastiCache（Redis）
```

### 7.3 追加するAWSリソース（各環境）

| リソース | 環境1 | 環境2 | スペック |
|---|---|---|---|
| Protectedサブネット | SBN_ka_moneynote_05 | SBN_ka_moneynote_06 | 10.0.2.0/24 |
| Privateサブネット追加 | SBN_ka_moneynote_07 | SBN_ka_moneynote_08 | 10.0.4.0/24（RDS用・マルチAZ） |
| NAT Gateway | NGW_ka_moneynote_01 | NGW_ka_moneynote_02 | Publicサブネットに配置 |
| RDS | RDS-ka-moneynote-01 | RDS-ka-moneynote-02 | db.t3.micro・PostgreSQL 16 |
| ElastiCache | ELC-ka-moneynote-01 | ELC-ka-moneynote-02 | cache.t3.micro・Redis 7 |
| サブネットグループ（RDS用） | SNG_ka_moneynote_01 | SNG_ka_moneynote_02 | マルチAZ対応 |
| サブネットグループ（Cache用） | SNG_ka_moneynote_03 | SNG_ka_moneynote_04 | マルチAZ対応 |

### 7.4 セキュリティグループ追加（3層構成）

#### SEG_ka_moneynote_05（RDS用）

| 方向 | プロトコル | ポート | 送信元 | 理由 |
|---|---|---|---|---|
| インバウンド | TCP | 5432 | SEG_ka_moneynote_03 | EC2からのみ許可 |

#### SEG_ka_moneynote_07（ElastiCache用）

| 方向 | プロトコル | ポート | 送信元 | 理由 |
|---|---|---|---|---|
| インバウンド | TCP | 6379 | SEG_ka_moneynote_03 | EC2からのみ許可 |

> ⚠️ **NAT Gatewayの注意:** NAT Gatewayは存在するだけで課金されます（停止不可）。使わない期間は削除してください。削除・再作成の際はElastic IPも忘れずに解放してください（未割り当てのElastic IPも課金対象）。

### 7.5 移行手順

#### データ移行

1. EC2上のPostgreSQLからダンプを取得
   ```bash
   docker exec -it db pg_dump -U postgres moneynote > backup.sql
   ```

2. RDSに接続してリストア
   ```bash
   psql -h {RDSエンドポイント} -U postgres moneynote < backup.sql
   ```

3. ElastiCacheはセッションデータのためデータ移行不要（接続先変更のみ）

#### アプリケーション設定変更

1. `docker-compose.env1.yml` からdb・redisコンテナを削除
2. `application-env1.yml` のDB接続先をRDSのエンドポイントに変更
3. `application-env1.yml` のRedis接続先をElastiCacheのエンドポイントに変更
4. Docker Composeを再起動

---

## 8. Step 22 — SES・Secrets Manager本格活用

### 8.1 SES（Simple Email Service）

予算超過メール通知（T-016）等のメール送信機能を本番環境で有効化する。

| 項目 | 内容 |
|---|---|
| 用途 | 予算超過通知・アカウント登録確認メール等 |
| 送信元アドレス | SESで検証済みのアドレスを使用 |
| 送信制限解除 | **アカウント管理者への申請が必要（ALL.5対応）** |
| Spring Boot設定 | application-env2.ymlにSES設定を追加 |

> ⚠️ **ALL.5対応:** SESのサンドボックス解除はアカウント全体に影響するため、アカウント管理者の許可を得てから申請する。

### 8.2 Secrets Manager本格活用

Step 17では最小限のシークレットのみ登録するが、Step 22で全ての機密情報を集約する。

| シークレット名 | 内容 | 利用箇所 |
|---|---|---|
| moneynote/env1/db-password | PostgreSQLパスワード | Spring Boot DB接続 |
| moneynote/env1/jwt-secret | JWT署名キー（256bit以上） | Spring Boot認証 |
| moneynote/env1/redis-password | Redisパスワード | Spring Boot Redis接続 |
| moneynote/env1/claude-api-key | Claude APIキー | AI支出分析機能 |
| moneynote/env1/ses-credentials | SESアクセス情報 | メール送信機能 |

---

## 9. セキュリティ設計

### 9.1 機密情報管理ルール

- Gitリポジトリに機密情報を**絶対にコミットしない**
- `.env` / `application-env2.yml` / `*.pem` 等は `.gitignore` に登録済み
- IAMアクセスキーをコードや設定ファイルに埋め込まない
- SSHキーペア（.pem）をリポジトリに追加しない
- AWSコンソールのスクリーンショットにアクセスキーが写っていないか確認する
- 作業ログ・コマンド履歴に機密情報が含まれていないか注意する

### 9.2 ネットワークセキュリティ

- ALBのみインターネットに公開
- EC2/RDS/Redisは外部から直接アクセス不可
- セキュリティグループで送信元を前の層のSG IDで指定（IPアドレスではなくSG参照）
- SSM Session ManagerでSSH代替・22番ポート開放なし
- 全サブネットで自動パブリックIP割り当てを無効化

### 9.3 運用セキュリティ

- 未使用リソースは停止または削除（ALL.2対応）
- **RDSは停止後7日で自動起動するため、スナップショット取得後に削除する運用を徹底**
- **NAT Gatewayは停止できないため、使わない期間は削除する**（削除前にElastic IPも解放）
- IAMロールは設計が固まり次第最小権限に絞り込む（IAM.2対応）
- CloudWatch Logsのログ保持期間を適切に設定する（無期限は課金増加の原因）

---

## 10. 移行ロードマップ

| Step | バージョン | 主要作業 | 環境 | アーキテクチャ |
|---|---|---|---|---|
| Step 17 | v1.0.0 | 初回デプロイ | 環境1 | EC2 + Docker Compose（2層VPC） |
| Step 18 | v1.1.0 | CI/CD構築 | 環境1 | GitHub Actions自動デプロイ |
| Step 19 | v1.2.0 | 環境2構築 | 環境1・2 | EC2 + Docker Compose（両環境） |
| Step 20 | v1.3.0 | 環境1移行 | 環境1 | RDS・ElastiCache・NAT GW（3層VPC） |
| Step 21 | v1.4.0 | 環境2移行 | 環境2 | RDS・ElastiCache・NAT GW（3層VPC） |
| Step 22 | v1.5.0 | 運用強化 | 環境1・2 | SES・Secrets Manager本格活用 |

---

*以上*
