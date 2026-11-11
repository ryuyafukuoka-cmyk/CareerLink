## 初回セットアップ

```bash
npm install
npm install --prefix frontend
npm install --prefix backend
```

## ルートで使えるコマンド

| コマンド               | 内容                                                                          |
| ---------------------- | ----------------------------------------------------------------------------- |
| `npm run dev`          | フロントエンドとバックエンドを同時に起動する（`front` / `back` と色分け表示） |
| `npm run format`       | Prettier で全ファイルを整形する                                               |
| `npm run format:check` | 整形が必要なファイルがないか確認する（変更はしない）                          |
| `npm run tree`         | フォルダ構成を表示する                                                        |

`prepare` は `npm install` のときに自動で実行され、コミット時の自動整形（husky）を有効にします。手動で実行する必要はありません。
