# AWS利用ガイドライン

## 概要
本プロジェクトのAWSリソース作成・運用時に厳守・遵守すること。
Claude Code はAWS関連の作業を行う際に必ずこのファイルを読み
全ての項目を厳守・遵守すること。

## サービス共通
- ALL.1: リソースをパブリック（不特定多数）に公開しない
- ALL.2: 未使用リソースは削除または停止する
- ALL.3: AWSリソースへの権限付与にはアクセスキーではなくIAMロールを使用する
- ALL.4: 普段使用していないリージョンにリソースを作成しない（ap-northeast-1 東京に統一）
- ALL.5: アカウント全体に影響する設定変更は行わない
- ALL.6: リソースに適切にタグ付けする（タグ付けルールを参照）

## IAM
- IAM.1: IAMユーザを複数人で共有しない
- IAM.2: 最小権限の原則に従ってIAMロールを設計する
- IAM.3: IAMユーザのアクセスキーは可能な限り発行しない

## EC2
- EC2.1: パブリックIPの付与は必要がない限り避ける
- EC2.2: セキュリティグループは必要最低限の通信のみ許可する
- EC2.3: 未使用インスタンスは停止または削除する
- EC2.4: EBSのスナップショットをパブリックに公開しない

## VPC
- VPC.1: ネットワークレイヤを作成する（Public・Protected・Privateサブネットを分離）
- VPC.2: すべてのレイヤでトラフィックをコントロールする（SG + NACLで多層防御）
- VPC.3: 自動割り当てパブリックIPのサブネットは作成しない

## S3
- S3.1: S3バケットをパブリックに読み取り可能にしない
- S3.2: S3バケットをパブリックに書き込み可能にしない
- S3.3: 未使用S3バケットは削除する
- S3.4: BucketPolicyで他のAWSアカウントに権限を委任する場合、特定Actionを制限する
  （s3:DeleteBucketPolicy・s3:PutBucketAcl・s3:PutBucketPolicy・
    s3:PutEncryptionConfiguration・s3:PutObjectAclは与えない）

## RDS
- RDS.1: インスタンスをパブリックに公開しない
- RDS.2: スナップショットをパブリックに公開しない
- RDS.3: 未使用インスタンスは停止または削除する
  （停止後7日で自動起動するため7日以上停止する場合はスナップショットを取得して削除する）

## タグ付けルール
命名規則: ＜リソース文字＞_ka_moneynote_＜2桁連番＞
ハイフン代用: ＜リソース文字＞-ka-moneynote-＜2桁連番＞
（RDS・ターゲットグループ・ALB等アンダースコア利用不可の場合）

| リソース | 文字 |
|---|---|
| EC2 | EC2 |
| AMI | AMI |
| Auto Scaling起動テンプレート | LTP |
| Auto Scalingグループ | ASG |
| S3 | S3 |
| RDS | RDS |
| ALB | ALB |
| NLB | NLB |
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

一覧に存在しないサービスを利用する場合は妥当な文字を設定すること。

## 環境別リソース命名（現時点）

| リソース | 環境1 | 環境2 |
|---|---|---|
| VPC | VPC_ka_moneynote_01 | VPC_ka_moneynote_02 |
| Publicサブネット（1a） | SBN_ka_moneynote_01 | SBN_ka_moneynote_05 |
| Publicサブネット（1c） | SBN_ka_moneynote_02 | SBN_ka_moneynote_06 |
| Privateサブネット（1a） | SBN_ka_moneynote_03 | SBN_ka_moneynote_07 |
| Privateサブネット（1c） | SBN_ka_moneynote_04 | SBN_ka_moneynote_08 |
| Internet Gateway | IGW_ka_moneynote_01 | IGW_ka_moneynote_02 |
| ルートテーブル（Public） | RTB_ka_moneynote_01 | RTB_ka_moneynote_05 |
| ルートテーブル（Private） | RTB_ka_moneynote_03 | RTB_ka_moneynote_07 |
| SG（ALB用） | SEG_ka_moneynote_01 | SEG_ka_moneynote_05 |
| SG（EC2用） | SEG_ka_moneynote_03 | SEG_ka_moneynote_07 |
| EC2 | EC2_ka_moneynote_01 | EC2_ka_moneynote_02 |
| ALB | ALB-ka-moneynote-01 | ALB-ka-moneynote-02 |
| ターゲットグループ | TGT-ka-moneynote-01 | TGT-ka-moneynote-02 |
| IAMロール（EC2用） | IAM_R_ka_moneynote_01 | ※環境共通 |
| IAMポリシー | IAM_P_ka_moneynote_01 | ※環境共通 |
| S3（ログ用） | S3_ka_moneynote_01 | ※環境共通 |

## 全リソースに以下の2つのタグを必ず付与する。
- Name: 命名規則に従った値
- Owner: IAMユーザー名
