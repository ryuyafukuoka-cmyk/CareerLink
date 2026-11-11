# CareerLink

三重県立津高等技術学校 ICTエンジニア科の就職活動記録を蓄積・共有する Web システムです。
活動記録の登録、過去情報の検索、企業別カルテ、次年度への引き継ぎを扱います。

## 技術構成

| 領域           | 使うもの                                                                    |
| -------------- | --------------------------------------------------------------------------- |
| フロントエンド | React + Vite（S3 + CloudFront で配信予定）                                  |
| バックエンド   | Express（ローカル開発用の仮サーバー）／本番は AWS Lambda + API Gateway 予定 |
| 認証           | 学校 AD / AD FS + Amazon Cognito（SAML 2.0）                                |
| データベース   | Amazon RDS（MariaDB）                                                       |

## フォルダ構成

```
CareerLink
├── frontend/   画面（React）
├── backend/    サーバー側の処理
├── shared/     フロントエンドとバックエンドで共有するファイル
└── README.md
```

各フォルダの使い方は、中の `〇〇メモ.md` を見てください。

## 初回セットアップ

1. Node.js をインストールする
2. リポジトリをクローンする
3. 次のコマンドを実行する

```bash
npm install
npm install --prefix frontend
npm install --prefix backend
```

4. `frontend/.env.example` をコピーして `frontend/.env` を作る

```bash
copy frontend\.env.example frontend\.env
```

## 開発の始め方

```bash
npm run dev
```

フロントエンドとバックエンドが同時に起動します。

| 起動するもの   | アドレス              |
| -------------- | --------------------- |
| フロントエンド | http://localhost:5173 |
| バックエンド   | http://localhost:3000 |

バックエンドの動作確認：http://localhost:3000/api/health

## ルートで使えるコマンド

| コマンド               | 内容                                         |
| ---------------------- | -------------------------------------------- |
| `npm run dev`          | フロントエンドとバックエンドを同時に起動する |
| `npm run format`       | Prettier で全ファイルを整形する              |
| `npm run format:check` | 整形が必要なファイルがないか確認する         |
| `npm run tree`         | フォルダ構成を表示する                       |

フロントエンドとバックエンドのコマンドは、それぞれのメモを見てください。

## ブランチの使い方

| ブランチ    | 役割                                                              |
| ----------- | ----------------------------------------------------------------- |
| `main`      | 発表・提出できる完成版だけ                                        |
| `sub`       | `develop` で動作確認ができた状態の置き場                          |
| `develop`   | 日々の開発の合流先。ふだんの PR はここへ                          |
| `feature/*` | 作業ごとに作る短いブランチ。`develop` から作って `develop` へ戻す |

```
feature/* → develop → sub → main
```

### ブランチ名の付け方

`feature/<担当>-<機能ID または内容>`

```
feature/frontend-F-006-company-screens
feature/aws-cognito-login
```

### 作業の流れ

```bash
# 1. 最新の develop から作業ブランチを作る
git checkout develop
git pull origin develop
git checkout -b feature/frontend-xxxx

# 2. 作業してコミットする
git add .
git commit -m "feat(F-006): add company form"

# 3. push して GitHub で Pull Request を作る（base は develop）
git push -u origin feature/frontend-xxxx
```

4. チームメンバーがレビューして承認する
5. `develop` にマージする
6. ローカルを更新する：`git checkout develop && git pull origin develop`

### コミットメッセージ

```
feat(F-002): ログインの PKCE フローを追加
fix(F-004): 保存済み下書きの企業変更を拒否
docs(F-001): ロール変更の説明を更新
chore: 開発ツールを追加
```

種類：`feat`（機能追加）／`fix`（修正）／`docs`（文書）／`chore`（設定・整理）

## ルール

- `main` `sub` `develop` に直接 push しない（必ず PR を使う）
- `.env`、AWS のキー、DB のパスワードは**絶対にコミットしない**
- `git push --force` は使わない
- 1つの PR は小さく保つ（目安：変更 300 行以内）
- 同じファイルを複数人で同時に編集しない（担当フォルダを分ける）
- 困ったら、`reset --hard` などを実行する前に相談する

## コミット時の自動整形

コミットすると、husky と lint-staged が自動でコードを整形します。
`npm install` を実行すれば自動で有効になり、手動の設定は不要です。

## 設計書

機能 ID（F-001〜F-007）は設計書に対応しています。コミットメッセージやブランチ名に機能 ID を入れると、設計書と結びつけやすくなります。
