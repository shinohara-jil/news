# 生成AIニュースキュレーションサイト

Next.js (App Router) と Tailwind CSS を使用した生成AIニュースサイトです。

## 機能

- **RSS取得**: Googleニュースから生成AI関連のニュースを自動取得
- **OGP画像抽出**: 記事のリンクからOGP画像を自動抽出
- **タグ分類**: タイトルから「言語生成AI」「画像生成AI」「動画生成AI」「その他」に自動分類
- **スプレッドシート保存**: Googleスプレッドシートに自動保存

## セットアップ

詳細なセットアップ手順は `SETUP.md` を参照してください。

### 環境変数

`.env.local` ファイルを作成し、以下の環境変数を設定してください：

```env
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/callback
SPREADSHEET_ID=your-spreadsheet-id
GOOGLE_REFRESH_TOKEN=
```

詳細は `SETUP.md` を参照してください。

## 開発

```bash
npm run dev
```

ブラウザで [http://localhost:3000](http://localhost:3000) を開いてください。

## 使い方

### 1. 初回認証（リフレッシュトークンの取得）

初回のみ、OAuth 2.0認証を行ってリフレッシュトークンを取得する必要があります。

1. ブラウザで `/api/auth` にアクセス
2. 表示されたJSONの `authUrl` をコピーしてブラウザで開く
3. Googleアカウントでログインして認証を完了
4. リダイレクト先のページで `refresh_token` をコピー
5. `.env.local` の `GOOGLE_REFRESH_TOKEN` に設定
6. 開発サーバーを再起動

### 2. ニュースの取得と保存

1. ホームページ（`http://localhost:3000`）にアクセス
2. 「ニュースを取得して保存」ボタンをクリック
3. 処理が完了するまで待機（数分かかる場合があります）
4. Googleスプレッドシートを確認してデータが保存されているか確認

### 3. APIエンドポイント

- `GET /api/fetch-news`: ニュースを取得してスプレッドシートに保存
- `GET /api/auth`: OAuth認証URLを取得
- `GET /api/auth/callback`: OAuth認証コールバック
- `GET /api/test-env`: 環境変数の設定確認

## スプレッドシートの形式

スプレッドシートには以下の列でデータが保存されます：

| タイトル | リンク | 説明 | 公開日 | OGP画像 | カテゴリ |
|---------|--------|------|--------|---------|---------|
| ... | ... | ... | ... | ... | ... |

## 注意事項

- 初回実行時はOGP画像の取得に時間がかかる場合があります
- 同じ記事は重複して保存されません（リンクで判定）
- 本番環境（Vercel）にデプロイする場合は、環境変数をVercelのダッシュボードで設定してください
