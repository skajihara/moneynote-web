# MoneyNote Web — AWSデプロイ設計書（Step 17〜22）

**作成日:** 2026年5月  
**バージョン:** 1.4  
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
| 現在のバージョン | v1.1.0（Step 18完了） |
| 対象ドキュメント | Step 17〜22 AWSデプロイ計画 |

### 1.2 リリース計画

| バージョン | Step | 内容 | フェーズ |
|---|---|---|---|
| v1.0.0 | Step 17 | 環境1デプロイ（EC2 + Docker Compose） | 初回デプロイ ✅ |
| v1.1.0 | Step 18 | CI/CDパイプライン構築（GitHub Actions + ECR） | 自動化 ✅ |
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
- AWSリソースの作成は**AWSマネジメントコンソールで操作**する
- CloudShellはコマンド実行が必要な場合のみ使用する

### 2.2 ガイドライン遵守チェックリスト

本プロジェクトは社内AWSガイドライン（`docs/aws-guidelines.md`）を**全て厳守・遵守**する。

| ルール | 内容 | 対応方針 |
|---|---|---|
| ALL.1 | リソースをパブリックに公開しない | ALBのみ公開・EC2/RDS/Redisはプライベートに配置 |
| ALL.2 | 未使用リソースは削除または停止 | テスト後・休日は停止or削除 |
| ALL.3 | IAMロールを使用（アクセスキー禁止） | EC2にIAMロール付与・マネジメントコンソールで操作 |
| ALL.4 | 使用リージョンを統一 | ap-northeast-1（東京）に統一 |
| ALL.5 | アカウント全体設定変更禁止 | 既存IAMロール変更なし・新規作成のみ |
| ALL.6 | リソースに適切にタグ付け | 全リソースに Name・Owner タグを付与 |
| IAM.1 | IAMユーザーの共有禁止 | 払い出された個人IAMユーザーのみ使用 |
| IAM.2 | 最小権限の原則 | 設計が固まり次第IAMロールの権限を絞り込む |
| IAM.3 | アクセスキー禁止 | マネジメントコンソールで操作・EC2はIAMロールで対応 |
| EC2.1 | パブリックIP付与は最小限 | **Step 17〜19はEC2にパブリックIPを付与（やむを得ない例外）** SSM Session ManagerでSSH代替。Step 20移行時にProtectedサブネットへ移動 |
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
アンダースコアが使えないリソース（RDS・ALB・ターゲットグループ・ECRリポジトリ等）はハイフンで代用:
```
<リソース文字>-ka-moneynote-<2桁連番>
```

**全リソースに以下の2つのタグを必ず付与する:**
- `Name`: 命名規則に従った値
- `Owner`: IAMユーザー名

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
| ECR | ECR |

> 一覧に存在しないサービスを利用する場合は妥当な文字を設定すること。

**環境別リソース命名一覧:**

| リソース | 環境1 | 環境2 | 備考 |
|---|---|---|---|
| VPC | VPC_ka_moneynote_01 | ※環境共通 | 1人1VPC制約のためenv1・env2で共用 |
| Publicサブネット（1a） | SBN_ka_moneynote_01 | SBN_ka_moneynote_05 | |
| Publicサブネット（1c） | SBN_ka_moneynote_02 | SBN_ka_moneynote_06 | ALBの2AZ要件のため必須 |
| Privateサブネット（1a） | SBN_ka_moneynote_03 | SBN_ka_moneynote_07 | |
| Privateサブネット（1c） | SBN_ka_moneynote_04 | SBN_ka_moneynote_08 | 将来のRDSマルチAZ用 |
| Internet Gateway | IGW_ka_moneynote_01 | ※環境共通 | 1人1VPC制約のためVPCとともに共用 |
| ルートテーブル（Public） | RTB_ka_moneynote_01 | RTB_ka_moneynote_05 | |
| ルートテーブル（Private） | RTB_ka_moneynote_03 | RTB_ka_moneynote_07 | |
| SG（ALB用） | SEG_ka_moneynote_01 | SEG_ka_moneynote_05 | |
| SG（EC2用） | SEG_ka_moneynote_03 | SEG_ka_moneynote_07 | |
| EC2 | EC2_ka_moneynote_01 | EC2_ka_moneynote_02 | |
| ALB | ALB-ka-moneynote-01 | ALB-ka-moneynote-02 | |
| ターゲットグループ | TGT-ka-moneynote-01 | TGT-ka-moneynote-02 | |
| IAMロール（EC2用） | IAM_R_ka_moneynote_01 | ※環境共通 | |
| IAMロール（GitHub Actions用） | IAM_R_ka_moneynote_02 | ※環境共通 | Step 18で追加 |
| IAMポリシー（EC2用） | IAM_P_ka_moneynote_01 | ※環境共通 | |
| IAMポリシー（GitHub Actions用） | IAM_P_ka_moneynote_02 | ※環境共通 | Step 18で追加 |
| S3（ログ用） | S3_ka_moneynote_01 | ※環境共通 | |
| ECR（バックエンド）（Step 18〜） | ecr-ka-moneynote-backend | ※環境共通 | Step 18で追加 |
| ECR（フロントエンド）（Step 18〜） | ecr-ka-moneynote-frontend | ※環境共通 | Step 18で追加 |
| Protectedサブネット（1a）（Step 20〜） | SBN_ka_moneynote_09 | SBN_ka_moneynote_11 | Step 20で追加 |
| Protectedサブネット（1c）（Step 20〜） | SBN_ka_moneynote_10 | SBN_ka_moneynote_12 | Step 20で追加 |
| NAT Gateway（Step 20〜） | NGW_ka_moneynote_01 | NGW_ka_moneynote_02 | Step 20で追加 |
| RDS（Step 20〜） | RDS-ka-moneynote-01 | RDS-ka-moneynote-02 | Step 20で追加 |
| ElastiCache（Step 20〜） | ELC-ka-moneynote-01 | ELC-ka-moneynote-02 | Step 20で追加 |
| サブネットグループ（RDS用） | SNG_ka_moneynote_01 | SNG_ka_moneynote_02 | Step 20で追加 |
| サブネットグループ（Cache用） | SNG_ka_moneynote_03 | SNG_ka_moneynote_04 | Step 20で追加 |
| ルートテーブル（Protected 1a）（Step 20〜） | RTB_ka_moneynote_09 | RTB_ka_moneynote_11 | Step 20で追加 |
| ルートテーブル（Protected 1c）（Step 20〜） | RTB_ka_moneynote_10 | RTB_ka_moneynote_12 | Step 20で追加 |
| SG（RDS用）（Step 20〜） | SEG_ka_moneynote_09 | SEG_ka_moneynote_11 | Step 20で追加 |
| SG（ElastiCache用）（Step 20〜） | SEG_ka_moneynote_10 | SEG_ka_moneynote_12 | Step 20で追加 |

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
| EBS × 2 | 16GB gp3 ($0.096/GB) | $3.1 | $3.1 | **停止中も課金** |
| パブリックIP（EC2） × 2 | $0.005/h | $0.4 | $2.0 | 2024年2月〜課金開始 |
| ALB × 2 | $0.0243/h + LCU | $1.9 | $9.7 | |
| パブリックIP（ALB） × 2 | $0.005/h | $0.4 | $2.0 | 2024年2月〜課金開始 |
| ECR × 2リポジトリ | $0.10/GB/月・最新3世代保持 | $0.4 | $0.4 | **常時課金・Step 18〜** |
| ACM | SSL証明書 | $0 | $0 | 無料 |
| S3・CloudWatch | 最小限 | $2.0 | $4.0 | |
| **合計** | | **約$11/月（約1,700円）** | **約$35/月（約5,300円）** | |

> ⚠️ **ECRの保持世代数:** ライフサイクルポリシーで最新3世代のみ保持する設定を推奨。
> backend（約800MB × 3世代）+ frontend（約500MB × 3世代）= 約3.9GB = 約$0.39/月。

### 3.3 Step 20〜22（3層構成移行後・2環境合計）

| サービス | スペック | 月40h稼働 | 月200h稼働 | 備考 |
|---|---|---|---|---|
| EC2 × 2 | t3.small | $2.7 | $13.6 | |
| EBS × 2 | 16GB gp3 | $3.1 | $3.1 | **停止中も課金** |
| パブリックIP（ALB） × 2 | $0.005/h | $0.4 | $2.0 | EC2はPrivateサブネットに移動 |
| ALB × 2 | $0.0243/h | $1.9 | $9.7 | |
| ECR × 2リポジトリ | $0.10/GB/月 | $0.4 | $0.4 | **常時課金** |
| RDS × 2 | db.t3.micro ($0.034/h) | $2.7 | $13.6 | 停止後7日で自動起動に注意 |
| ElastiCache × 2 | cache.t3.micro ($0.019/h) | $1.5 | $7.6 | |
| NAT Gateway × 2 | $0.062/h + $0.062/GB | $5.0 | $24.8 | **稼働中は常時課金** |
| S3・CloudWatch | 最小限 | $3.0 | $5.0 | |
| **合計** | | **約$21/月（約3,200円）** | **約$80/月（約12,000円）** | |

> ⚠️ **NAT Gatewayのコスト注意:** NAT Gatewayは存在するだけで課金されます（停止不可）。使わない期間は**削除**してください。
>
> | 削除時の操作 | Elastic IPの状態 | 再作成時 |
> |---|---|---|
> | NAT Gatewayのみ削除（Elastic IP保持） | 「未割り当て」状態で**課金継続**（$0.005/時間） | 同じIPで再作成可能 |
> | NAT Gateway削除 + **Elastic IPも解放** | アカウントから解放・課金なし | 新しいIPが割り当てられる |
>
> **推奨運用: Elastic IPは毎回解放・再取得する（コスト最小化）。**  
> IPが変わっても本プロジェクトでは機能影響なし（ECR・SSM・Claude API・GitHubはソースIP制限を行わないため）。

---

## 4. Step 17 — 環境1デプロイ（EC2 + Docker Compose）

### 4.1 アーキテクチャ概要

EC2上でDocker Composeを使用してローカル環境と同等の構成でデプロイする。
将来のRDS・ElastiCache移行（Step 20）を見据えてPrivateサブネットを事前に確保しておく。
ALBの2AZ要件を満たすためPublicサブネットを2AZ（1a・1c）に作成する。

```
インターネット
    ↓ HTTPS(443)
Internet Gateway (IGW_ka_moneynote_01)
    ↓
[Publicサブネット: 10.0.1.0/24（1a）・10.0.2.0/24（1c）]
    ├── ALB-ka-moneynote-01（両AZにまたがって配置）← SEG_ka_moneynote_01でHTTPS(443)のみ受付
    └── EC2_ka_moneynote_01（SBN_ka_moneynote_01・1aに配置）← SEG_ka_moneynote_03でALBからの8080のみ受付
         ├── nginx（リバースプロキシ）
         ├── Next.js（フロントエンド: 3000）
         ├── Spring Boot（バックエンドAPI: 8080）
         ├── PostgreSQL（DB: 5432）
         └── Redis（セッション・キャッシュ: 6379）

[Privateサブネット: 10.0.3.0/24（1a）・10.0.4.0/24（1c）]
    └── （現時点では空・Step 20でRDS・ElastiCacheを配置）
```

### 4.2 VPCネットワーク設計

> ⚠️ **1人1VPC制約:** 会社AWSアカウントの制約により1人が使用できるVPCは1つのみ。Step 19の環境2もこのVPC（VPC_ka_moneynote_01）を共用する。

| リソース | Name タグ | 設定値 |
|---|---|---|
| VPC | VPC_ka_moneynote_01 | CIDR: 10.0.0.0/16・DNS解決有効・DNSホスト名有効 |
| Publicサブネット（1a） | SBN_ka_moneynote_01 | CIDR: 10.0.1.0/24・AZ: ap-northeast-1a・自動パブリックIP: **無効** |
| Publicサブネット（1c） | SBN_ka_moneynote_02 | CIDR: 10.0.2.0/24・AZ: ap-northeast-1c・自動パブリックIP: **無効** |
| Privateサブネット（1a） | SBN_ka_moneynote_03 | CIDR: 10.0.3.0/24・AZ: ap-northeast-1a・自動パブリックIP: **無効** |
| Privateサブネット（1c） | SBN_ka_moneynote_04 | CIDR: 10.0.4.0/24・AZ: ap-northeast-1c・自動パブリックIP: **無効** |
| Internet Gateway | IGW_ka_moneynote_01 | VPC_ka_moneynote_01にアタッチ |
| ルートテーブル（Public） | RTB_ka_moneynote_01 | 0.0.0.0/0 → IGW_ka_moneynote_01・SBN_ka_moneynote_01・SBN_ka_moneynote_02に関連付け |
| ルートテーブル（Private） | RTB_ka_moneynote_03 | ローカルのみ（デフォルトルートなし）・SBN_ka_moneynote_03・SBN_ka_moneynote_04に関連付け |

> ⚠️ **VPC.3対応:** 全サブネットで「パブリックIPv4アドレスの自動割り当て」を**無効**にすること。EC2へのパブリックIP付与はインスタンス起動時に個別に設定する。

> ⚠️ **ALBの2AZ要件:** ALBはAWSの仕様上2つ以上のAZが必須。SBN_ka_moneynote_01（1a）とSBN_ka_moneynote_02（1c）の両方をALBに関連付けること。

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
| アウトバウンド | TCP | 443 | 0.0.0.0/0 | Docker pull・外部API・SSM通信・ECR pull |
| アウトバウンド | TCP | 80 | 0.0.0.0/0 | HTTP外部通信（必要に応じて） |

> ✅ **多層防御の確認:**
> - ALBのSGはインターネット → ALBの443のみ許可
> - EC2のSGはALBのSGからの8080のみ許可（送信元をSGIDで指定する）
> - SSHの22番ポートは**開放しない**（SSM Session Managerで代替）
> - EC2へのパブリックIPは付与するが、SGでインバウンドを制限することでALL.1を担保

### 4.4 IAMロール設計

**IAM_R_ka_moneynote_01（EC2用）に付与する権限:**

| 権限 | 理由 |
|---|---|
| AmazonSSMManagedInstanceCore | SSM Session ManagerでEC2にアクセスするため（EC2.1対応） |
| CloudWatchLogsFullAccess（後で絞り込み） | アプリケーションログをCloudWatchに送信するため |
| secretsmanager:GetSecretValue（対象リソースのみ） | JWT_SECRET等の機密情報を取得するため |
| ecr:GetAuthorizationToken | ECRへのログイン（Step 18で追加） |
| ecr:BatchGetImage | ECRからイメージをpull（Step 18で追加） |
| ecr:GetDownloadUrlForLayer | ECRのレイヤーをダウンロード（Step 18で追加） |

> ⚠️ **IAM.2対応:** 最初は広めの権限を付与し、設計が固まってから絞り込む。

### 4.5 機密情報管理（Secrets Manager）

| シークレット名 | 内容 | 利用箇所 |
|---|---|---|
| moneynote/env1/db-password | PostgreSQLパスワード | docker-compose.env1.yml |
| moneynote/env1/jwt-secret | JWT署名キー（256bit以上） | application-env1.yml |
| moneynote/env1/redis-password | Redisパスワード | docker-compose.env1.yml |
| moneynote/env1/claude-api-key | Claude APIキー | application-env1.yml |
| moneynote/env1/admin-email | システム管理者メールアドレス | application-env1.yml |

> ✅ EC2のIAMロール経由でSecrets Managerから取得する。アクセスキーをコードに埋め込まない。

### 4.6 アプリケーション設定ファイル構成

| ファイル | 用途 |
|---|---|
| application.yml | 共通設定 |
| application-dev.yml | ローカル開発環境用 |
| application-env1.yml | 環境1（AWSデプロイ・developブランチ）用 |
| application-env2.yml | 環境2（AWSデプロイ・mainブランチ）用 |
| docker-compose.yml | ローカル開発環境用 |
| docker-compose.env1.yml | 環境1用（env_file: .env.env1・SPRING_PROFILES_ACTIVE: env1） |
| docker-compose.env2.yml | 環境2用（env_file: .env.env2・SPRING_PROFILES_ACTIVE: env2） |
| scripts/secrets-fetch.sh | Secrets Managerから機密情報を取得して.env.env1/.env.env2を生成するスクリプト |
| seed.sh | EC2環境用seedデータ投入スクリプト（引数: env1/env2） |

### 4.7 secrets-fetch.sh の仕様

```bash
# 実行方法
bash ./scripts/secrets-fetch.sh env1  # → .env.env1 を生成
bash ./scripts/secrets-fetch.sh env2  # → .env.env2 を生成

# 生成される .env.env1 の内容
# Secrets Managerから取得する機密情報
DB_PASSWORD=（Secrets Managerから取得・JSON形式をパースして値のみ取得）
JWT_SECRET=（Secrets Managerから取得）
REDIS_PASSWORD=（Secrets Managerから取得）
CLAUDE_API_KEY=（Secrets Managerから取得）
ADMIN_EMAIL=（Secrets Managerから取得）

# 動的生成・固定値（機密情報ではない）
ECR_REGISTRY=（aws sts get-caller-identityでAWSアカウントIDを取得して動的生成 → {AccountID}.dkr.ecr.ap-northeast-1.amazonaws.com）
DB_HOST=db
DB_PORT=5432
DB_NAME=moneynote
DB_USERNAME=moneynote
REDIS_HOST=redis
REDIS_PORT=6379
FRONTEND_URL=（環境別ALB DNS名・env1: ALB-ka-moneynote-01のURL・env2: ALB-ka-moneynote-02のURL）
MAIL_HOST=localhost
MAIL_PORT=1025
```

> ⚠️ Secrets Managerから取得した値はJSON形式（例: `{"db-password":"xxxx"}`）で返るため
> Python等でパースして値のみを取り出す必要がある。

> ✅ `ECR_REGISTRY` はスクリプト実行時に `aws sts get-caller-identity` でAWSアカウントIDを動的に取得して生成する。AWSアカウントIDをコードにハードコードしない。

### 4.8 HTTPS化について

**自己署名証明書をACMにインポートしてALBに適用する。**

ACMのパブリック証明書は独自ドメインに対してのみ発行可能なため、
自己署名証明書をインポートして使用する。

```bash
# CloudShellで実行
# ⚠️ curlではなくwgetを使用すること（curlはGitHubのリダイレクト処理で失敗する場合がある）

# 自己署名証明書の生成（有効期限: 825日）
# ⚠️ CNはFQDN形式（ドット区切り）が必須。ホスト名のみだとALBが拒否する
openssl req -x509 -nodes -days 825 -newkey rsa:2048 \
  -keyout key.pem -out cert.pem \
  -subj "/CN=moneynote-env1.example.com"

# ACMにインポート
aws acm import-certificate \
  --certificate fileb://cert.pem \
  --private-key fileb://key.pem \
  --region ap-northeast-1

# 出力された CertificateArn をメモしておく
```

> ⚠️ ブラウザで「安全でない」警告が出るがテスト用途のため許容する。
> ⚠️ ACMのコンソール上でインポート済み証明書はALB作成画面のドロップダウンに**表示されない仕様**のため、
>   ALBをHTTP:80で一時的に作成してから「リスナーを追加」でHTTPS:443を追加する。
>   その際「証明書をインポート」を選択してcert.pem・key.pemの内容を貼り付ける。
>   HTTP:80リスナーはHTTPS追加後に必ず削除する。
> ⚠️ 将来独自ドメインを取得した際にACMパブリック証明書に切り替える。

### 4.9 アクセスURL

独自ドメインは使用しない。ALBのデフォルトDNS名でアクセスする。

```
https://ALB-ka-moneynote-01-xxxxxxxxxx.ap-northeast-1.elb.amazonaws.com
```

> 将来的に独自ドメインを取得した際にRoute 53で紐付ける。

### 4.10 作業手順

#### Phase 1: AWSリソース作成（マネジメントコンソールで操作）

**手順1: VPC作成**
```
VPC → VPCを作成
- 作成するリソース: VPCのみ
- 名前タグ: VPC_ka_moneynote_01
- IPv4 CIDR: 10.0.0.0/16
- タグ: Name=VPC_ka_moneynote_01 / Owner=（IAMユーザー名）
作成後 → アクション → VPCの設定を編集
- DNS解決を有効化: ON
- DNSホスト名を有効化: ON
```

**手順2: サブネット作成（4つ）**
```
VPC → サブネット → サブネットを作成
VPC: VPC_ka_moneynote_01 を選択
※ 4つを一括で作成できる（「新しいサブネットを追加」）

① SBN_ka_moneynote_01
  - AZ: ap-northeast-1a / CIDR: 10.0.1.0/24
  - タグ: Name=SBN_ka_moneynote_01 / Owner=（IAMユーザー名）

② SBN_ka_moneynote_02
  - AZ: ap-northeast-1c / CIDR: 10.0.2.0/24
  - タグ: Name=SBN_ka_moneynote_02 / Owner=（IAMユーザー名）

③ SBN_ka_moneynote_03
  - AZ: ap-northeast-1a / CIDR: 10.0.3.0/24
  - タグ: Name=SBN_ka_moneynote_03 / Owner=（IAMユーザー名）

④ SBN_ka_moneynote_04
  - AZ: ap-northeast-1c / CIDR: 10.0.4.0/24
  - タグ: Name=SBN_ka_moneynote_04 / Owner=（IAMユーザー名）

各サブネット作成後 → アクション → サブネットの設定を編集
- パブリックIPv4アドレスの自動割り当て: OFF（全サブネット共通・VPC.3対応）
```

**手順3: Internet Gateway作成・アタッチ**
```
VPC → インターネットゲートウェイ → 作成
- 名前タグ: IGW_ka_moneynote_01
- タグ: Name=IGW_ka_moneynote_01 / Owner=（IAMユーザー名）
作成後 → アクション → VPCにアタッチ → VPC_ka_moneynote_01 を選択
```

**手順4: ルートテーブル作成**
```
VPC → ルートテーブル → 作成

① RTB_ka_moneynote_01（Publicルートテーブル）
  - 名前: RTB_ka_moneynote_01 / VPC: VPC_ka_moneynote_01
  - タグ: Name=RTB_ka_moneynote_01 / Owner=（IAMユーザー名）
  - ルートを編集 → 追加
    送信先: 0.0.0.0/0 / ターゲット: IGW_ka_moneynote_01
  - サブネットの関連付けを編集
    SBN_ka_moneynote_01・SBN_ka_moneynote_02 にチェック

② RTB_ka_moneynote_03（Privateルートテーブル）
  - 名前: RTB_ka_moneynote_03 / VPC: VPC_ka_moneynote_01
  - タグ: Name=RTB_ka_moneynote_03 / Owner=（IAMユーザー名）
  - ルートは追加しない（ローカルのみ）
  - サブネットの関連付けを編集
    SBN_ka_moneynote_03・SBN_ka_moneynote_04 にチェック
```

**手順5: セキュリティグループ作成**
```
※ SEG_ka_moneynote_01を先に作成し、その後SEG_ka_moneynote_03を作成する
  （EC2用SGのインバウンドルールでALB用SGを参照するため）

① SEG_ka_moneynote_01（ALB用）
  - 名前: SEG_ka_moneynote_01 / VPC: VPC_ka_moneynote_01
  - タグ: Name=SEG_ka_moneynote_01 / Owner=（IAMユーザー名）
  - インバウンド: HTTPS(443) ← 0.0.0.0/0
  - アウトバウンド: 一旦デフォルト（全トラフィック）のまま保存

② SEG_ka_moneynote_03（EC2用）
  - 名前: SEG_ka_moneynote_03 / VPC: VPC_ka_moneynote_01
  - タグ: Name=SEG_ka_moneynote_03 / Owner=（IAMユーザー名）
  - インバウンド: カスタムTCP(8080) ← SEG_ka_moneynote_01のSGID
  - アウトバウンド: デフォルト（全トラフィック）のまま

③ SEG_ka_moneynote_01のアウトバウンドを更新
  - SEG_ka_moneynote_01を選択 → アウトバウンドルールを編集
  - デフォルトの全トラフィックを削除
  - カスタムTCP(8080) → SEG_ka_moneynote_03のSGID を追加
```

**手順6: IAMポリシー・ロール作成**
```
① IAM_P_ka_moneynote_01（ポリシー）
  IAM → ポリシー → ポリシーを作成（ビジュアルエディタで設定）
  - Secrets Manager: GetSecretValue・DescribeSecret
    リソース: moneynote/* （ap-northeast-1）
  - CloudWatch Logs: CreateLogGroup・CreateLogStream・
                     PutLogEvents・DescribeLogStreams
    リソース: すべて
  - 名前: IAM_P_ka_moneynote_01
  - タグ: Name=IAM_P_ka_moneynote_01 / Owner=（IAMユーザー名）

② IAM_R_ka_moneynote_01（ロール）
  IAM → ロール → ロールを作成
  - 信頼されたエンティティ: AWSのサービス → EC2
  - ポリシー: AmazonSSMManagedInstanceCore・IAM_P_ka_moneynote_01
  - 名前: IAM_R_ka_moneynote_01
  - タグ: Name=IAM_R_ka_moneynote_01 / Owner=（IAMユーザー名）

※ IAMロール・ポリシーはグローバルリソースのため環境1・2で共通利用できる
  環境を再作成する場合も削除不要
```

**手順7: EC2インスタンス起動**
```
EC2 → インスタンスを起動
- 名前: EC2_ka_moneynote_01
- タグ: Name=EC2_ka_moneynote_01 / Owner=（IAMユーザー名）
  ※ インスタンス・ボリューム両方に付与
- AMI: Amazon Linux 2023（64ビット x86）
- インスタンスタイプ: t3.small
- キーペア: キーペアなしで続行（SSMで接続するため不要）
- ネットワーク設定:
  - VPC: VPC_ka_moneynote_01
  - サブネット: SBN_ka_moneynote_01
  - パブリックIPの自動割り当て: 有効化（このインスタンスのみ）
  - セキュリティグループ: SEG_ka_moneynote_03
- ストレージ: 16GB gp3（ファイルシステム: 未選択・デフォルトxfs）
- 高度な詳細 → IAMインスタンスプロフィール: IAM_R_ka_moneynote_01
```

**手順8: 自己署名証明書の生成・ACMへのインポート（CloudShellで実行）**
```bash
# ⚠️ curlではなくwgetを使用すること（curlはGitHubのリダイレクト処理で失敗する場合がある）

# 自己署名証明書の生成
# CNはFQDN形式が必須（ホスト名のみだとALBがUnsupportedCertificateExceptionを返す）
openssl req -x509 -nodes -days 825 -newkey rsa:2048 \
  -keyout key.pem -out cert.pem \
  -subj "/CN=moneynote-env1.example.com"

# ACMにインポート
aws acm import-certificate \
  --certificate fileb://cert.pem \
  --private-key fileb://key.pem \
  --region ap-northeast-1

# 出力された CertificateArn をメモしておく
```

> ⚠️ **ACMの重要な仕様:** インポートした証明書はALB作成画面のドロップダウンに表示されない。
> ALBをHTTP:80で作成してからHTTPS:443リスナーを追加し「証明書をインポート」を選択する。

**手順9: ターゲットグループ作成**
```
EC2 → ターゲットグループ → 作成
- ターゲットタイプ: インスタンス
- 名前: TGT-ka-moneynote-01
- プロトコル: HTTP / ポート: 8080
- VPC: VPC_ka_moneynote_01
- プロトコルバージョン: HTTP1
  （Next.js standalone・Spring BootはHTTP/1.1対応のためHTTP1を選択）
- ヘルスチェック:
  - プロトコル: HTTP
  - パス: /actuator/health
    （Spring Boot Actuatorのヘルスチェックエンドポイント・認証不要で公開）
  - 正常のしきい値: 2
  - 非正常のしきい値: 3
  - タイムアウト: 5秒
  - 間隔: 30秒
  - 成功コード: 200
- タグ: Name=TGT-ka-moneynote-01 / Owner=（IAMユーザー名）
- ターゲットの登録: EC2_ka_moneynote_01 をポート8080で登録
```

**手順10: ALB作成（HTTP:80で一時的に作成）**
```
EC2 → ロードバランサー → 作成 → Application Load Balancer
- 名前: ALB-ka-moneynote-01
- スキーム: インターネット向け
- IPアドレスタイプ: IPv4
- VPC: VPC_ka_moneynote_01
- AZ:
  - ap-northeast-1a → SBN_ka_moneynote_01
  - ap-northeast-1c → SBN_ka_moneynote_02
  ※ ALBはAWSの仕様上2AZ以上必須
- セキュリティグループ: SEG_ka_moneynote_01
- リスナー: HTTP:80 → TGT-ka-moneynote-01（一時的）
- タグ: Name=ALB-ka-moneynote-01 / Owner=（IAMユーザー名）
作成後 → ALBのDNS名をメモしておく
```

**手順11: HTTPSリスナーの追加・HTTP:80リスナーの削除**
```
EC2 → ロードバランサー → ALB-ka-moneynote-01
→「リスナーとルール」タブ →「リスナーを追加」
- プロトコル: HTTPS / ポート: 443
- デフォルトアクション: TGT-ka-moneynote-01に転送
- デフォルトSSL証明書:「証明書をインポート」を選択
  → cert.pemの内容を「証明書本文」に貼り付ける
  → key.pemの内容を「証明書のプライベートキー」に貼り付ける
  → 証明書チェーンは空欄のまま
- セキュリティポリシー: ELBSecurityPolicy-TLS13-1-2-2021-06

HTTPSリスナー追加後・HTTP:80 リスナーを削除する
同じ「リスナーとルール」タブで HTTP:80 のリスナーを選択 →「削除」
（HTTP:80リスナーが残ると非暗号化アクセスが可能になるため必ず削除する）
```

**手順12: S3バケット作成**
```
S3 → バケットを作成
- バケット名: s3-ka-moneynote-01
- リージョン: ap-northeast-1
- パブリックアクセスをすべてブロック: ON（S3.1/2対応）
- バージョニング: 有効
- タグ: Name=S3_ka_moneynote_01 / Owner=（IAMユーザー名）
```

#### Phase 2: アプリケーション設定（SSM Session Managerで実行）

> **SSM Session Managerでの接続方法:**
> EC2 → インスタンス → EC2_ka_moneynote_01 を選択
> →「接続」→「Session Manager」タブ →「接続」

**手順13: DockerおよびDocker Composeのインストール**
```bash
# Dockerのインストール
sudo dnf update -y
sudo dnf install -y docker
sudo systemctl start docker
sudo systemctl enable docker
sudo usermod -aG docker ssm-user

# ⚠️ Docker Compose v2をインストールする
# Amazon Linux 2023 の標準リポジトリには docker-compose-plugin が存在しない
# ⚠️ curlではなくwgetを使用すること（GitHubのリダイレクト処理で失敗する）
DOCKER_CONFIG=${DOCKER_CONFIG:-$HOME/.docker}
mkdir -p $DOCKER_CONFIG/cli-plugins
wget -O $DOCKER_CONFIG/cli-plugins/docker-compose \
  https://github.com/docker/compose/releases/latest/download/docker-compose-linux-x86_64
chmod +x $DOCKER_CONFIG/cli-plugins/docker-compose

# バージョン確認
docker --version
docker compose version

# ⚠️ Docker Buildxのインストール（docker compose up --build に必要）
# curlではなくwgetを使用すること
sudo mkdir -p /usr/local/lib/docker/cli-plugins
sudo wget -O /usr/local/lib/docker/cli-plugins/docker-buildx \
  https://github.com/docker/buildx/releases/download/v0.33.0/buildx-v0.33.0.linux-amd64
sudo chmod +x /usr/local/lib/docker/cli-plugins/docker-buildx
docker buildx version
```

**手順14: Secrets Managerへのシークレット登録（AWSコンソールで実行）**
```
Secrets Manager → シークレットを保存
以下の5つを登録する（タイプ: その他のシークレット・キー/値形式）

- moneynote/env1/db-password    キー: db-password
- moneynote/env1/jwt-secret     キー: jwt-secret
- moneynote/env1/redis-password キー: redis-password
- moneynote/env1/claude-api-key キー: claude-api-key
- moneynote/env1/admin-email    キー: admin-email

⚠️ キー名はスクリプト内のパース処理と一致させること
⚠️ 取得値はJSON形式（{"db-password":"xxxx"}）で返るため
   scripts/secrets-fetch.sh でPythonを使ってパースして値のみを取り出す
```

**手順15: リポジトリのクローン**
```bash
sudo dnf install -y git
git clone https://github.com/skajihara/moneynote-web.git
cd moneynote-web
git checkout develop
```

**手順16: 環境変数ファイルの生成**
```bash
# secrets-fetch.shを実行して .env.env1 を生成する
bash ./scripts/secrets-fetch.sh env1

# 生成内容を確認（機密情報がプレーンな文字列で含まれていること）
cat .env.env1
```

**手順17: Docker Composeでアプリ起動**
```bash
# ⚠️ docker-compose（ハイフン）ではなく docker compose（スペース）を使用する
# ⚠️ --env-file オプションで .env.env1 を明示的に指定する
docker compose -f docker-compose.env1.yml --env-file .env.env1 up -d --build

# コンテナの状態確認
docker compose -f docker-compose.env1.yml ps
```

> ⚠️ **Next.js standaloneビルドの注意事項:**
> `docker-compose.env1.yml` の frontend サービスに `HOSTNAME: "0.0.0.0"` の環境変数が必要。
> これがないと Next.js がコンテナIPのみでリッスンし、ヘルスチェックが失敗する。
> `node_modules/.bin/next` は standalone ビルドのランタイムイメージには存在しないため
> 起動コマンドの上書きには使用しないこと。

> ⚠️ **DBボリュームの初期化:**
> パスワード不一致等でDBが正常に初期化されなかった場合は
> `docker compose -f docker-compose.env1.yml down -v` でボリュームを削除してから再起動する。

#### Phase 3: 動作確認

**手順18: ヘルスチェック確認**
```bash
curl http://localhost:8080/actuator/health
# {"status":"UP"} が返ること
```

**手順19: ターゲットグループのヘルスチェック確認**
```
EC2 → ターゲットグループ → TGT-ka-moneynote-01
→ ターゲットタブ → ステータスが「healthy」になっていること
※ アプリ起動後2〜3分待つ
```

**手順20: ブラウザでアクセス確認**
```
https://{ALBのDNS名} にアクセス
- ブラウザの警告を承認してアクセスする（自己署名証明書のため）
- ログイン画面が表示されること
```

**手順21: seedデータ投入・全機能確認**
```bash
# EC2上でseed.shを実行してデータを投入する
# ⚠️ seed.ps1はWindowsのPowerShellスクリプトのためEC2上では使用できない
# seed.sh（Linux用）を使用する
chmod +x seed.sh
./seed.sh env1

# ログイン・帳簿・明細・レポート・AI分析等を確認する
```

#### 作業完了後の注意事項

```
✅ 動作確認完了後は不要なリソースを停止または削除する（ALL.2・EC2.3対応）
✅ EC2を停止する際はDockerコンテナを事前に停止する
   docker compose -f docker-compose.env1.yml down
✅ EBSは停止中も課金されることに注意
✅ ACMの証明書・IAMロール・IAMポリシーは環境共通のため停止・削除不要
✅ 作業終了時にTeamsへ利用終了連絡を送信する
```

---

## 5. Step 18 — CI/CDパイプライン構築

### 5.1 概要

GitHub Actionsを使用してテスト・ECRへのイメージプッシュ・EC2へのデプロイを自動化する。
**AWSの認証にはIAM OIDCプロバイダーを使用してアクセスキーなしで実現する（IAM.3対応）。**

```
全体フロー:
push / PR作成
  ↓
GitHub Actions
  ├── test-backend（./gradlew test）
  ├── test-frontend（npm test）
  ├── build-and-push（Dockerイメージ → ECR）
  └── deploy（SSM Send Command → EC2がECRからpull → docker compose up）
```

### 5.2 ECRリポジトリ構成

ビルドが必要なイメージはソースコードを含む以下の2つのみ。
nginx・PostgreSQL・Redisは公式イメージをDocker Hubから直接pullする。

| リポジトリ名 | Name タグ | 用途 | イメージタグ戦略 |
|---|---|---|---|
| ecr-ka-moneynote-backend | ECR-ka-moneynote-01 | バックエンド（Spring Boot） | latest・sha-{GitSHA} |
| ecr-ka-moneynote-frontend | ECR-ka-moneynote-02 | フロントエンド（Next.js） | latest・sha-{GitSHA} |

**イメージタグ戦略:**
- `latest`: 常に最新のイメージ。EC2はこのタグをpullして起動する。
- `sha-{GitSHA}`: デプロイしたGitコミットのSHA（例: `sha-abc1234`）。ロールバック時に特定のバージョンをpullできる。

**ライフサイクルポリシー:**
- 最新3世代のみ保持する設定を適用する（コスト最適化）
- 月額: 約$0.39/月（backend 800MB × 3 + frontend 500MB × 3 ≒ 3.9GB）

### 5.3 パイプライン構成

| ブランチ | トリガー | 処理 | デプロイ先 |
|---|---|---|---|
| develop | push | テスト → ビルド → ECRプッシュ → デプロイ | 環境1 |
| main | push | テスト → ビルド → ECRプッシュ → デプロイ | 環境2（Step 19構築後） |
| 全ブランチ | PR作成 | テストのみ | — |

### 5.4 ワークフロー構成

| ジョブ | 内容 | 依存関係 |
|---|---|---|
| test-backend | `./gradlew test` でJUnit5テストを実行 | なし |
| test-frontend | `npm test` でJestテストを実行 | なし |
| build-and-push | ECRにログインしてbackend・frontendイメージをビルド・プッシュ | test-backend・test-frontend完了後 |
| deploy | SSM Send CommandでEC2にデプロイコマンドを送信 | build-and-push完了後 |

**deployジョブでEC2が実行するコマンド（SSM Send Command経由）:**
```bash
set -e
export HOME=/root
git config --global --add safe.directory /home/ssm-user/moneynote-web
cd /home/ssm-user/moneynote-web

# 最新コードに更新
git fetch origin {ブランチ名}
git checkout {ブランチ名}
git reset --hard origin/{ブランチ名}

# Secrets Managerから機密情報を取得して .env.{env} を生成
bash ./scripts/secrets-fetch.sh {env}

# ECR_REGISTRYを.envファイルから取得
ECR_REGISTRY=$(grep ECR_REGISTRY .env.{env} | cut -d= -f2)

# ECRにログイン
aws ecr get-login-password --region ap-northeast-1 | docker login --username AWS --password-stdin ${ECR_REGISTRY}

# 最新イメージをpull
docker compose -f docker-compose.{env}.yml --env-file .env.{env} pull

# コンテナを再起動（--force-recreateで確実に再作成）
docker compose -f docker-compose.{env}.yml --env-file .env.{env} up -d --force-recreate

# ヘルスチェック確認（nginxの起動ラグのため--retryを使用）
curl -f --retry 10 --retry-delay 3 --retry-all-errors http://localhost:8080/actuator/health
```

> ⚠️ **SSM実行環境の注意点:**
> - SSM Agent はroot実行のため `export HOME=/root` が必要（`git config --global` がHOMEを参照するため）
> - git の dubious ownership エラーを回避するため `git config --global --add safe.directory` が必要
> - `./scripts/secrets-fetch.sh` は実行権限の問題で失敗するため `bash ./scripts/secrets-fetch.sh` で実行する

### 5.5 IAM設計

#### IAM OIDCプロバイダー設定

```
プロバイダーURL: https://token.actions.githubusercontent.com
対象者: sts.amazonaws.com
```

#### IAM_P_ka_moneynote_02（GitHub Actions用ポリシー）

| 権限 | 理由 |
|---|---|
| ecr:GetAuthorizationToken | ECRへのログイン |
| ecr:BatchCheckLayerAvailability | イメージのプッシュ |
| ecr:PutImage | イメージのプッシュ |
| ecr:InitiateLayerUpload | イメージのプッシュ |
| ecr:UploadLayerPart | イメージのプッシュ |
| ecr:CompleteLayerUpload | イメージのプッシュ |
| ssm:SendCommand | EC2へのコマンド送信 |
| ssm:GetCommandInvocation | コマンド実行結果の確認 |

#### IAM_R_ka_moneynote_02（GitHub Actions用ロール）

```
信頼ポリシー: GitHubリポジトリ（skajihara/moneynote-web）からのみアクセスを許可
アタッチするポリシー: IAM_P_ka_moneynote_02
タグ: Name=IAM_R_ka_moneynote_02 / Owner=（IAMユーザー名）
```

#### IAM_R_ka_moneynote_01（EC2用ロール）に追加する権限

Step 18でEC2がECRからイメージをpullするために以下を追加する。

| 権限 | 理由 |
|---|---|
| ecr:GetAuthorizationToken | ECRへのログイン |
| ecr:BatchGetImage | ECRからイメージをpull |
| ecr:GetDownloadUrlForLayer | ECRのレイヤーをダウンロード |

### 5.6 GitHub Secrets 設定

| Secret名 | 内容 |
|---|---|
| AWS_ROLE_ARN | IAM_R_ka_moneynote_02のARN |
| AWS_REGION | ap-northeast-1 |
| ECR_REGISTRY | {AWSアカウントID}.dkr.ecr.ap-northeast-1.amazonaws.com |
| EC2_INSTANCE_ID_ENV1 | 環境1のEC2インスタンスID |
| EC2_INSTANCE_ID_ENV2 | 環境2のEC2インスタンスID（Step 19構築後） |

> ⚠️ **アクセスキーはGitHub SecretsにもCLAUDE.mdにも記載しない。**

### 5.7 docker-compose.env1.yml の変更点

Step 18でECRからpullするようにイメージ参照を変更する。

```yaml
# 変更前（Step 17まで）
backend:
  build: ./backend

frontend:
  build: ./frontend

# 変更後（Step 18以降）
backend:
  image: ${ECR_REGISTRY}/ecr-ka-moneynote-backend:latest

frontend:
  image: ${ECR_REGISTRY}/ecr-ka-moneynote-frontend:latest
```

> ✅ `ECR_REGISTRY` は `scripts/secrets-fetch.sh` が `aws sts get-caller-identity` でAWSアカウントIDを動的に取得し `.env.env1` / `.env.env2` に書き出す。AWSアカウントIDをコードにハードコードしない。

### 5.8 作業手順

#### Phase 1: AWSリソース作成（マネジメントコンソールで操作）

**手順1: ECRリポジトリ作成**
```
ECR → リポジトリを作成

① ecr-ka-moneynote-backend（バックエンド）
  - 可視性設定: プライベート
  - リポジトリ名: ecr-ka-moneynote-backend
  - タグ: Name=ECR-ka-moneynote-01 / Owner=（IAMユーザー名）
  作成後 → ライフサイクルポリシーを設定
  - ルール: イメージ数が3を超えたら古いものから削除

② ecr-ka-moneynote-frontend（フロントエンド）
  - 可視性設定: プライベート
  - リポジトリ名: ecr-ka-moneynote-frontend
  - タグ: Name=ECR-ka-moneynote-02 / Owner=（IAMユーザー名）
  作成後 → ライフサイクルポリシーを設定
  - ルール: イメージ数が3を超えたら古いものから削除
```

**手順2: IAM OIDCプロバイダー作成**
```
IAM → IDプロバイダー → プロバイダーを追加
- プロバイダーのタイプ: OpenID Connect
- プロバイダーURL: https://token.actions.githubusercontent.com
- 対象者: sts.amazonaws.com
```

**手順3: IAMポリシー・ロール作成（GitHub Actions用）**
```
① IAM_P_ka_moneynote_02（ポリシー）
  IAM → ポリシー → ポリシーを作成（ビジュアルエディタで設定）
  - ECR: GetAuthorizationToken（リソース: すべて）
  - ECR: BatchCheckLayerAvailability・PutImage・InitiateLayerUpload・
         UploadLayerPart・CompleteLayerUpload
    リソース: ecr-ka-moneynote-backend・ecr-ka-moneynote-frontendのARN
  - SSM: SendCommand・GetCommandInvocation
    リソース: EC2インスタンスのARN・SSMドキュメントのARN
  - 名前: IAM_P_ka_moneynote_02
  - タグ: Name=IAM_P_ka_moneynote_02 / Owner=（IAMユーザー名）

② IAM_R_ka_moneynote_02（ロール）
  IAM → ロール → ロールを作成
  - 信頼されたエンティティ: ウェブアイデンティティ
  - IDプロバイダー: token.actions.githubusercontent.com
  - 対象者: sts.amazonaws.com
  - 条件: repo:skajihara/moneynote-web:*
  - ポリシー: IAM_P_ka_moneynote_02
  - 名前: IAM_R_ka_moneynote_02
  - タグ: Name=IAM_R_ka_moneynote_02 / Owner=（IAMユーザー名）
```

**手順4: EC2用IAMロールにECR権限を追加**
```
IAM → ロール → IAM_R_ka_moneynote_01
→「許可を追加」→「ポリシーをアタッチ」
→ AmazonEC2ContainerRegistryReadOnly を追加
```

#### Phase 2: アプリケーション設定（Claude Codeで実装）

**手順5: docker-compose.env1.yml・env2.yml の更新**
- `build:` セクションを `image:` に変更（ECRイメージを参照）
- `ECR_REGISTRY` 環境変数を追加

**手順6: GitHub Actionsワークフローファイルの作成**
- `.github/workflows/ci-cd.yml` を作成
- test-backend・test-frontend・build-and-push・deploy の4ジョブを実装

#### Phase 3: 動作確認

**手順7: developブランチにpushしてワークフローを起動**
```
GitHub → Actions タブ → ワークフローの実行を確認
- test-backend: グリーン
- test-frontend: グリーン
- build-and-push: グリーン（ECRにイメージがpushされていること）
- deploy: グリーン
```

**手順8: ECRのイメージを確認**
```
ECR → ecr-ka-moneynote-backend → latest タグのイメージが存在すること
ECR → ecr-ka-moneynote-frontend → latest タグのイメージが存在すること
```

**手順9: ブラウザで動作確認**
```
https://{ALBのDNS名} にアクセス
- ログイン画面が表示されること
- ECRからpullしたイメージで動作していること
```

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
| VPC | VPC_ka_moneynote_01 | VPC_ka_moneynote_01（共通） |
| Publicサブネット（1a） | SBN_ka_moneynote_01 | SBN_ka_moneynote_05 |
| Publicサブネット（1c） | SBN_ka_moneynote_02 | SBN_ka_moneynote_06 |
| Privateサブネット（1a） | SBN_ka_moneynote_03 | SBN_ka_moneynote_07 |
| Privateサブネット（1c） | SBN_ka_moneynote_04 | SBN_ka_moneynote_08 |
| EC2 | EC2_ka_moneynote_01 | EC2_ka_moneynote_02 |
| ALB | ALB-ka-moneynote-01 | ALB-ka-moneynote-02 |

### 6.3 CIDRブロック

```
VPC: VPC_ka_moneynote_01を使用（環境1と共通・CIDR: 10.0.0.0/16）
環境2 Publicサブネット（1a）:  10.0.5.0/24
環境2 Publicサブネット（1c）:  10.0.6.0/24
環境2 Privateサブネット（1a）: 10.0.7.0/24
環境2 Privateサブネット（1c）: 10.0.8.0/24
```

### 6.4 作業手順

Step 17（4.10）の手順を環境2用のリソース名・設定・CIDRで繰り返す。
**VPC・Internet Gatewayの作成は不要** — 1人1VPC制約により VPC_ka_moneynote_01・IGW_ka_moneynote_01 を環境2のサブネット・ルートテーブルと共用する。
IAMロール・IAMポリシー・ACM証明書・ECRリポジトリは環境1と共通のため再作成不要。

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
[Publicサブネット（1a・1c）]
    └── ALB
         ↓ HTTP(8080)
[Protectedサブネット（1a・1c）] ← NAT Gateway経由で外部通信
    └── EC2（nginx・Next.js・Spring Boot）
         ↓
[Privateサブネット（1a・1c）]
    ├── RDS（PostgreSQL・マルチAZ）
    └── ElastiCache（Redis）
```

### 7.3 追加するAWSリソース（各環境）

| リソース | 環境1 | 環境2 | スペック |
|---|---|---|---|
| Protectedサブネット（1a） | SBN_ka_moneynote_09 | SBN_ka_moneynote_11 | 環境1: 10.0.9.0/24 / 環境2: 10.0.11.0/24・ap-northeast-1a |
| Protectedサブネット（1c） | SBN_ka_moneynote_10 | SBN_ka_moneynote_12 | 環境1: 10.0.10.0/24 / 環境2: 10.0.12.0/24・ap-northeast-1c |
| NAT Gateway | NGW_ka_moneynote_01 | NGW_ka_moneynote_02 | Publicサブネット（1a: SBN_ka_moneynote_01 / SBN_ka_moneynote_05）に配置 |
| ルートテーブル（Protected 1a） | RTB_ka_moneynote_09 | RTB_ka_moneynote_11 | SBN_ka_moneynote_09/11に関連付け・0.0.0.0/0 → NAT GW |
| ルートテーブル（Protected 1c） | RTB_ka_moneynote_10 | RTB_ka_moneynote_12 | SBN_ka_moneynote_10/12に関連付け・0.0.0.0/0 → NAT GW |
| RDS | RDS-ka-moneynote-01 | RDS-ka-moneynote-02 | db.t3.micro・PostgreSQL 16 |
| ElastiCache | ELC-ka-moneynote-01 | ELC-ka-moneynote-02 | cache.t3.micro・Redis 7 |
| サブネットグループ（RDS用） | SNG_ka_moneynote_01 | SNG_ka_moneynote_02 | マルチAZ対応 |
| サブネットグループ（Cache用） | SNG_ka_moneynote_03 | SNG_ka_moneynote_04 | マルチAZ対応 |
| SG（RDS用） | SEG_ka_moneynote_09 | SEG_ka_moneynote_11 | TCP 5432 ← EC2用SG（SEG_03/07）のみ許可 |
| SG（ElastiCache用） | SEG_ka_moneynote_10 | SEG_ka_moneynote_12 | TCP 6379 ← EC2用SG（SEG_03/07）のみ許可 |

### 7.4 セキュリティグループ追加（3層構成）

#### SEG_ka_moneynote_09（RDS用・環境1）

| 方向 | プロトコル | ポート | 送信元 | 理由 |
|---|---|---|---|---|
| インバウンド | TCP | 5432 | SEG_ka_moneynote_03 | 環境1 EC2からのみ許可 |

#### SEG_ka_moneynote_10（ElastiCache用・環境1）

| 方向 | プロトコル | ポート | 送信元 | 理由 |
|---|---|---|---|---|
| インバウンド | TCP | 6379 | SEG_ka_moneynote_03 | 環境1 EC2からのみ許可 |

#### SEG_ka_moneynote_11（RDS用・環境2）

| 方向 | プロトコル | ポート | 送信元 | 理由 |
|---|---|---|---|---|
| インバウンド | TCP | 5432 | SEG_ka_moneynote_07 | 環境2 EC2からのみ許可 |

#### SEG_ka_moneynote_12（ElastiCache用・環境2）

| 方向 | プロトコル | ポート | 送信元 | 理由 |
|---|---|---|---|---|
| インバウンド | TCP | 6379 | SEG_ka_moneynote_07 | 環境2 EC2からのみ許可 |

> ⚠️ **NAT Gatewayの注意:** NAT Gatewayは存在するだけで課金されます（停止不可）。使わない期間は削除してください。
>
> | 削除時の操作 | Elastic IPの状態 | 再作成時 |
> |---|---|---|
> | NAT Gatewayのみ削除（Elastic IP保持） | 「未割り当て」状態で**課金継続**（$0.005/時間） | 同じIPで再作成可能 |
> | NAT Gateway削除 + **Elastic IPも解放** | アカウントから解放・課金なし | 新しいIPが割り当てられる |
>
> **推奨運用: Elastic IPは毎回解放・再取得する（コスト最小化）。**  
> IPが変わっても本プロジェクトでは機能影響なし（ECR・SSM・Claude API・GitHubはソースIP制限を行わないため）。

### 7.5 移行手順

**データ移行**
```bash
# EC2上のPostgreSQLからダンプを取得
docker exec -it moneynote-web-db-1 pg_dump -U moneynote moneynote > backup.sql

# RDSに接続してリストア
psql -h {RDSエンドポイント} -U moneynote moneynote < backup.sql
```

**アプリケーション設定変更**
```
1. docker-compose.env1.yml からdb・redisコンテナを削除する
2. application-env1.yml のDB接続先をRDSのエンドポイントに変更する
3. application-env1.yml のRedis接続先をElastiCacheのエンドポイントに変更する
4. Docker Composeを再起動する
   docker compose -f docker-compose.env1.yml --env-file .env.env1 up -d
```

---

## 8. Step 22 — SES・Secrets Manager本格活用

### 8.1 SES（Simple Email Service）

| 項目 | 内容 |
|---|---|
| 用途 | 予算超過通知・アカウント登録確認メール等 |
| 送信元アドレス | SESで検証済みのアドレスを使用 |
| 送信制限解除 | **アカウント管理者への申請が必要（ALL.5対応）** |
| Spring Boot設定 | application-env1.yml / application-env2.yml にSES設定を追加 |

> ⚠️ **ALL.5対応:** SESのサンドボックス解除はアカウント全体に影響するため、アカウント管理者の許可を得てから申請する。

### 8.2 Secrets Manager本格活用

| シークレット名 | 内容 | 利用箇所 |
|---|---|---|
| moneynote/env1/db-password | PostgreSQLパスワード | Spring Boot DB接続 |
| moneynote/env1/jwt-secret | JWT署名キー（256bit以上） | Spring Boot認証 |
| moneynote/env1/redis-password | Redisパスワード | Spring Boot Redis接続 |
| moneynote/env1/claude-api-key | Claude APIキー | AI支出分析機能 |
| moneynote/env1/admin-email | システム管理者メールアドレス | 問い合わせメール受信先 |
| moneynote/env1/ses-credentials | SESアクセス情報 | メール送信機能 |

---

## 9. セキュリティ設計

### 9.1 機密情報管理ルール

- Gitリポジトリに機密情報を**絶対にコミットしない**
- `.env.env1` / `.env.env2` / `application-env1.yml` / `application-env2.yml` / `*.pem` 等は `.gitignore` に登録済み
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
- NACLはデフォルト設定（全許可）を使用。本番化・独自ドメイン取得後に各層のインバウンド・アウトバウンドを制限すること（VPC.2対応）

### 9.3 運用セキュリティ

- 未使用リソースは停止または削除（ALL.2対応）
- **RDSは停止後7日で自動起動するため、スナップショット取得後に削除する運用を徹底**
- **NAT Gatewayは停止できないため、使わない期間は削除する。Elastic IPも必ず解放する**（保持すると$0.005/時間の課金が継続）。IPが変わっても本プロジェクトでは機能影響なし（ECR・SSM・Claude API・GitHubはソースIP制限なし）
- IAMロールは設計が固まり次第最小権限に絞り込む（IAM.2対応）
- CloudWatch Logsのログ保持期間を適切に設定する（無期限は課金増加の原因）
- **ACM証明書・IAMロール・IAMポリシー・ECRリポジトリはグローバルまたは環境共通リソースのため環境削除時も残しておく**

### 9.4 Teams連絡ルール

AWS作業の開始・終了時に以下のフォーマットでTeamsに連絡する。

```
タイトル：【梶原】【Webアプリケーション個人開発・AWSデプロイ演習】AWS利用状況共有

▼利用開始連絡
・（使用するAWSサービス名を列挙）

▼利用終了連絡
・（作成・停止・削除したAWSサービス名を列挙）
```

---

## 10. 移行ロードマップ

| Step | バージョン | 主要作業 | 環境 | アーキテクチャ |
|---|---|---|---|---|
| Step 17 | v1.0.0 | 初回デプロイ ✅ | 環境1 | EC2 + Docker Compose（2層VPC・4サブネット） |
| Step 18 | v1.1.0 | CI/CD構築 ✅ | 環境1 | GitHub Actions + ECR自動デプロイ |
| Step 19 | v1.2.0 | 環境2構築 | 環境1・2 | EC2 + Docker Compose（VPC共用・両環境） |
| Step 20 | v1.3.0 | 環境1移行 | 環境1 | RDS・ElastiCache・NAT GW（3層VPC） |
| Step 21 | v1.4.0 | 環境2移行 | 環境2 | RDS・ElastiCache・NAT GW（3層VPC） |
| Step 22 | v1.5.0 | 運用強化 | 環境1・2 | SES・Secrets Manager本格活用 |

---

*以上*
