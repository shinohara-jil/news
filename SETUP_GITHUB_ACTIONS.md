# GitHub Actions セットアップ手順

GitHub Actionsを使って、毎日16時に自動でニュースを3件取得する設定です。

## 必要なGitHub Secretsの設定

以下の2つのシークレットをGitHubリポジトリに設定する必要があります。

### 1. GitHubリポジトリのSettings → Secrets and variables → Actionsを開く

1. GitHubのリポジトリページを開く
2. 上部メニューの「Settings」をクリック
3. 左側メニューの「Secrets and variables」→「Actions」をクリック

### 2. 必要なSecretsを追加

#### `ADMIN_SECRET_KEY`
- 「New repository secret」ボタンをクリック
- Name: `ADMIN_SECRET_KEY`
- Secret: 環境変数ファイル（`.env.local`）に設定している`ADMIN_SECRET_KEY`の値を入力
- 「Add secret」をクリック

#### `APP_URL`
- 「New repository secret」ボタンをクリック
- Name: `APP_URL`
- Secret: https://ai-news-site-c.vercel.app/

  - ローカル環境では動作しないため、Vercel等にデプロイしている必要があります
  - URLの最後に`/`は不要です
- 「Add secret」をクリック

## ワークフローの実行スケジュール

- **自動実行**: 毎日日本時間16時（UTC 7時）に自動実行
- **手動実行**: GitHubのActionsタブから手動でも実行可能

## 手動実行の方法

1. GitHubリポジトリの「Actions」タブを開く
2. 左側から「毎日ニュース取得」ワークフローを選択
3. 右側の「Run workflow」ボタンをクリック
4. 「Run workflow」を再度クリックして実行

## 実行結果の確認

1. GitHubリポジトリの「Actions」タブを開く
2. 実行履歴から最新の実行を選択
3. ログを確認して、ニュースが正常に取得されたか確認

## トラブルシューティング

### エラー: HTTPステータスコード 401
- `ADMIN_SECRET_KEY`が正しく設定されているか確認してください
- `.env.local`の値とGitHub Secretsの値が一致しているか確認してください

### エラー: HTTPステータスコード 500
- `APP_URL`が正しく設定されているか確認してください
- アプリがデプロイされていて、アクセス可能な状態か確認してください
- 環境変数（`GOOGLE_CLIENT_ID`, `SPREADSHEET_ID`等）がデプロイ先に設定されているか確認してください

### ワークフローが実行されない
- GitHubリポジトリがpublicまたはGitHub Pro/Teamプランの場合、GitHub Actionsは無料で使用できます
- Freeプランのprivateリポジトリの場合、月2,000分の実行時間制限があります
