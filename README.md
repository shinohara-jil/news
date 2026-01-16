# 生成AIニュースキュレーションサイト

Next.js (App Router) と Tailwind CSS を使用した生成AIニュースサイトです。

## 🎯 主要機能

- **RSS取得**: Googleニュースから生成AI関連のニュースを自動取得（重複除外機能付き）
- **AI画像生成**: Gemini 2.0 Flash（Imagen 3）でニュースに合った画像を自動生成
- **画像アップロード**: 生成した画像をGoogle Driveに自動保存
- **OGP画像抽出**: AI画像生成失敗時のフォールバックとして記事のOGP画像を取得
- **自動カテゴリ分類**: Gemini 2.5 Flashで「言語生成AI」「画像生成AI」「動画生成AI」「音声生成AI」「その他」に自動分類
- **スプレッドシート保存**: Googleスプレッドシートに自動保存
- **自動実行**: GitHub Actionsで毎日午前7時・午後4時に自動実行（1日最大6件）

## セットアップ

詳細なセットアップ手順は `SETUP.md` を参照してください。

### 必要な環境変数

`.env.local` ファイルを作成し、以下の環境変数を設定してください：

```env
# Google OAuth 2.0
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/callback

# Google Spreadsheet
SPREADSHEET_ID=your-spreadsheet-id

# OAuth リフレッシュトークン（初回認証後に設定）
GOOGLE_REFRESH_TOKEN=

# Gemini API（AI画像生成・カテゴリ分類）
GEMINI_API_KEY=your-gemini-api-key

# 管理者シークレットキー
ADMIN_SECRET_KEY=your-secret-key
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

## 📚 ドキュメント

プロジェクトの詳細な情報は以下のドキュメントを参照してください:

- **[PROJECT_DOCUMENTATION.md](./PROJECT_DOCUMENTATION.md)** - プロジェクト全体の構成と開発状況
- **[SETUP.md](./SETUP.md)** - 初期セットアップの詳細手順
- **[SETUP_OAUTH_ALTERNATIVE.md](./SETUP_OAUTH_ALTERNATIVE.md)** - OAuth認証の代替手順
- **[SETUP_GITHUB_ACTIONS.md](./SETUP_GITHUB_ACTIONS.md)** - GitHub Actionsの設定方法

## ⚠️ 注意事項

- 初回実行時はAI画像生成に時間がかかります（1件あたり15-30秒）
- 同じ記事は重複して保存されません（タイトル・リンクで判定）
- Vercel無料プランでは最大5分の実行時間制限があります
- Gemini APIのレート制限に注意してください（429エラー時は自動リトライ）
- 本番環境（Vercel）にデプロイする場合は、環境変数をVercelのダッシュボードで設定してください
