# プロジェクト構成・開発状況ドキュメント

## 📋 プロジェクト概要

**プロジェクト名**: AI生成ニュースキュレーションサイト
**技術スタック**: Next.js 14 (App Router), TypeScript, Tailwind CSS
**目的**: 生成AI関連のニュースを自動収集・分類・保存し、AI生成画像とともに表示するキュレーションサイト

---

## 🏗️ プロジェクト構成

```
260113_ニュースサイト/
├── app/                          # Next.js App Router
│   ├── api/                      # APIエンドポイント
│   │   ├── auth/                 # OAuth認証
│   │   │   ├── callback/         # 認証コールバック
│   │   │   └── route.ts          # 認証URL生成
│   │   ├── fetch-news/           # ニュース取得・保存API
│   │   │   └── route.ts          # メインロジック
│   │   ├── news/                 # ニュース読み取りAPI
│   │   │   └── route.ts          # スプレッドシートから取得
│   │   └── test-env/             # 環境変数テスト
│   │       └── route.ts
│   ├── admin/                    # 管理画面
│   │   └── page.tsx              # 手動実行UI
│   ├── layout.tsx                # ルートレイアウト
│   ├── page.tsx                  # ホームページ
│   └── globals.css               # グローバルスタイル
│
├── lib/                          # ユーティリティ・ビジネスロジック
│   ├── classify.ts               # カテゴリ分類（Gemini 2.5 Flash）
│   ├── drive.ts                  # Google Drive画像アップロード
│   ├── gemini.ts                 # Gemini API（画像生成）
│   ├── ogp.ts                    # OGP画像取得
│   ├── rss.ts                    # Google News RSS取得
│   ├── sheets.ts                 # スプレッドシート書き込み
│   └── sheets-read.ts            # スプレッドシート読み込み
│
├── .github/                      # GitHub設定
│   └── workflows/                # GitHub Actions
│       └── fetch-news.yml        # 自動ニュース取得ワークフロー
│
├── public/                       # 静的ファイル
├── .env.local                    # 環境変数（gitignore）
├── package.json                  # 依存関係
├── tsconfig.json                 # TypeScript設定
├── tailwind.config.ts            # Tailwind CSS設定
├── next.config.mjs               # Next.js設定
│
└── ドキュメント
    ├── README.md                 # 基本的な使い方
    ├── SETUP.md                  # セットアップ手順
    ├── SETUP_OAUTH_ALTERNATIVE.md # OAuth代替手順
    ├── SETUP_GITHUB_ACTIONS.md   # GitHub Actions設定
    └── PROJECT_DOCUMENTATION.md  # 本ドキュメント
```

---

## 🎯 主要機能

### 1. ニュース自動取得 (`/api/fetch-news`)

**処理フロー**:
1. Google News RSSから「生成AI OR AI生成」キーワードでニュースを取得（最大50件）
2. 既存記事と重複チェック（タイトル・リンクで判定）
3. 新規記事のみを処理対象として選択
4. 各記事に対して以下を実行:
   - **AI画像生成**: Gemini 2.0 Flash Experimental（Imagen 3モデル）でニュース内容に合った画像を生成
   - **画像アップロード**: 生成した画像をGoogle Driveにアップロード
   - **カテゴリ分類**: Gemini 2.5 Flashで記事を「言語生成AI」「画像生成AI」「動画生成AI」「音声生成AI」「その他」に分類
   - **OGP画像取得**: AI画像生成に失敗した場合のフォールバック
5. Googleスプレッドシートに保存

**技術的特徴**:
- 最大実行時間: 5分（Vercel制限）
- 重複記事の自動スキップ
- エラーハンドリング（リトライロジック付き）
- シークレットキー認証（`ADMIN_SECRET_KEY`）

### 2. AI画像生成 (`lib/gemini.ts`)

**使用モデル**: Gemini 2.0 Flash Experimental
**画像生成モデル**: Imagen 3

**機能**:
- ニュース記事のタイトルから適切な画像を自動生成
- プロンプト例: 「『{記事タイトル}』に関連する画像を生成してください。洗練されたスタイルで...」
- レスポンス形式: Base64エンコードされた画像データ（PNG）
- レート制限対策: エラー時の自動リトライ（最大3回）

### 3. カテゴリ自動分類 (`lib/classify.ts`)

**使用モデル**: Gemini 2.5 Flash
**分類カテゴリ**:
- 言語生成AI（ChatGPT、GPT-4、Claude等）
- 画像生成AI（Stable Diffusion、Midjourney、DALL-E等）
- 動画生成AI（Sora、Runway等）
- 音声生成AI（ElevenLabs等）
- その他

**精度向上の工夫**:
- タイトルと説明文の両方を分析
- Few-shotプロンプト（具体例を提示）
- 厳格な出力フォーマット指定

### 4. スプレッドシート連携

**書き込み** (`lib/sheets.ts`):
- OAuth 2.0認証（リフレッシュトークン使用）
- バッチ書き込み（複数行を一度に追加）
- カラム: タイトル | リンク | 説明 | 公開日 | OGP画像 | カテゴリ

**読み込み** (`lib/sheets-read.ts`):
- キャッシュ対応（Next.jsの`revalidate`）
- APIエンドポイント: `/api/news`

### 5. GitHub Actions自動実行

**実行スケジュール**:
- 毎日午前7時（UTC 22時）
- 毎日午後4時（UTC 7時）

**取得件数**: 各回3件（1日最大6件）

**設定ファイル**: `.github/workflows/fetch-news.yml`

**特徴**:
- curlでAPIを呼び出し
- リダイレクト自動追跡（`-L`オプション）
- 末尾スラッシュ自動削除
- HTTPステータスコードチェック
- 詳細なエラーレポート

---

## 🔧 技術詳細

### 依存パッケージ

```json
{
  "dependencies": {
    "react": "^18",
    "react-dom": "^18",
    "next": "14.2.5",
    "googleapis": "^144.0.0",    // Google APIs連携
    "cheerio": "^1.0.0"          // HTML/OGPパース
  },
  "devDependencies": {
    "typescript": "^5",
    "tailwindcss": "^3.3.0",
    "autoprefixer": "^10.0.1",
    "postcss": "^8"
  }
}
```

### 環境変数

必須の環境変数:

```env
# Google OAuth 2.0
GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=xxx
GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/callback

# Google Spreadsheet
SPREADSHEET_ID=xxx

# OAuth リフレッシュトークン（初回認証後に設定）
GOOGLE_REFRESH_TOKEN=xxx

# Gemini API（AI画像生成・カテゴリ分類）
GEMINI_API_KEY=xxx

# 管理者シークレットキー
ADMIN_SECRET_KEY=xxx
```

### APIエンドポイント一覧

| エンドポイント | メソッド | 用途 | 認証 |
|--------------|---------|------|------|
| `/api/fetch-news` | GET | ニュース取得・保存 | ADMIN_SECRET_KEY |
| `/api/news` | GET | ニュース一覧取得 | なし |
| `/api/auth` | GET | OAuth認証URL生成 | なし |
| `/api/auth/callback` | GET | OAuth認証コールバック | なし |
| `/api/test-env` | GET | 環境変数確認 | なし |

### セキュリティ

1. **API認証**: `ADMIN_SECRET_KEY`でニュース取得APIを保護
2. **OAuth 2.0**: Google APIsへのアクセスは認証済みトークンのみ
3. **環境変数**: 機密情報は`.env.local`で管理（gitignore）
4. **GitHub Secrets**: GitHub ActionsではSecretsで環境変数を管理

---

## 📊 開発状況

### ✅ 完成済み機能

- [x] Google News RSSからのニュース取得
- [x] OGP画像の抽出
- [x] Gemini 2.0でのAI画像生成（Imagen 3）
- [x] Google Driveへの画像アップロード
- [x] Gemini 2.5によるカテゴリ自動分類
- [x] Googleスプレッドシートへの自動保存
- [x] 重複記事の自動除外
- [x] OAuth 2.0認証フロー
- [x] Next.js UIでの手動実行
- [x] GitHub Actionsによる自動実行（1日2回）
- [x] エラーハンドリング・リトライロジック
- [x] 包括的なドキュメント整備

### 🚧 今後の拡張候補

- [ ] フロントエンド: ニュース一覧表示ページ
- [ ] フィルタリング機能（カテゴリ別表示）
- [ ] 検索機能（キーワード検索）
- [ ] ページネーション
- [ ] お気に入り機能
- [ ] RSSフィードの追加ソース対応
- [ ] 通知機能（新着ニュース通知）
- [ ] パフォーマンス最適化（画像の遅延読み込み等）
- [ ] A/Bテスト（AI画像 vs OGP画像の効果測定）

### 🐛 既知の制限事項

1. **実行時間**: Vercelの無料プランでは最大5分の実行時間制限
2. **レート制限**: Gemini APIのレート制限（429エラー時は自動リトライ）
3. **画像生成失敗**: 一部の記事タイトルでAI画像生成が失敗する可能性（その場合はOGP画像を使用）
4. **GitHub Actions**: publicリポジトリまたはGitHub Pro/Teamプランが必要（Freeプランのprivateリポジトリは月2,000分まで）

---

## 🚀 デプロイ

### Vercelへのデプロイ

1. Vercelアカウントを作成
2. GitHubリポジトリを連携
3. 環境変数を設定（Vercelダッシュボード → Settings → Environment Variables）
4. デプロイ実行

**必要な環境変数**:
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_REDIRECT_URI`（本番URLに変更）
- `SPREADSHEET_ID`
- `GOOGLE_REFRESH_TOKEN`
- `GEMINI_API_KEY`
- `ADMIN_SECRET_KEY`

### GitHub Actionsの設定

詳細は `SETUP_GITHUB_ACTIONS.md` を参照。

**必要なGitHub Secrets**:
- `APP_URL`: デプロイ先のURL（末尾の`/`なし）
- `ADMIN_SECRET_KEY`: `.env.local`と同じ値

---

## 📈 パフォーマンス

### 処理時間（目安）

- ニュース1件あたり: 約15-30秒
  - RSS取得: 1-2秒
  - AI画像生成: 5-10秒
  - カテゴリ分類: 2-3秒
  - スプレッドシート保存: 1-2秒

- 3件処理: 約1-2分
- 10件処理: 約3-5分

### APIコスト（概算）

**Gemini API**:
- 2.0 Flash Experimental（画像生成）: 課金対象（詳細はGoogle AI Studioで確認）
- 2.5 Flash（テキスト分類）: 無料枠あり

**Google APIs**:
- Sheets API: 無料（クォータ制限あり）
- Drive API: 無料（ストレージ制限あり）

---

## 🔍 トラブルシューティング

### よくある問題と解決方法

| 問題 | 原因 | 解決方法 |
|-----|------|---------|
| HTTPステータス308 | `APP_URL`に末尾`/`がある | GitHub Secretsから`/`を削除 |
| HTTPステータス401 | `ADMIN_SECRET_KEY`が不正 | GitHub Secretsと`.env.local`を確認 |
| HTTPステータス500 | 環境変数未設定 | Vercelの環境変数を確認 |
| 画像生成失敗（429エラー） | レート制限 | 時間を置いて再実行、またはリトライを待つ |
| OAuth認証失敗 | リダイレクトURIの不一致 | Google Cloud Consoleで設定を確認 |
| スプレッドシート書き込み失敗 | トークン期限切れ | リフレッシュトークンを再取得 |

詳細は各セットアップドキュメントを参照してください。

---

## 📝 開発メモ

### 重要な実装ポイント

1. **重複チェック**: タイトルとリンクの両方で重複を判定（`Set`を使用）
2. **画像生成の優先順位**: Gemini生成 → OGP画像の順でフォールバック
3. **エラーハンドリング**: try-catchでエラーを捕捉し、処理を継続
4. **Google News URL解決**: `news.google.com`のURLは実際の記事URLにリダイレクト
5. **ファイル名の安全化**: 特殊文字を`_`に置換してDriveにアップロード

### コーディング規約

- TypeScript strictモード使用
- async/awaitでの非同期処理
- エラーメッセージは日本語
- コンソールログで処理状況を詳細に出力
- 環境変数の存在チェックを各関数で実施

---

## 📚 参考リンク

- [Next.js公式ドキュメント](https://nextjs.org/docs)
- [Google Cloud Console](https://console.cloud.google.com/)
- [Google AI Studio](https://aistudio.google.com/)
- [Vercel公式ドキュメント](https://vercel.com/docs)
- [GitHub Actions公式ドキュメント](https://docs.github.com/actions)

---

## 📞 サポート

質問や問題が発生した場合は、以下のドキュメントを参照してください:

1. `README.md` - 基本的な使い方
2. `SETUP.md` - 初期セットアップ
3. `SETUP_OAUTH_ALTERNATIVE.md` - OAuth代替手順
4. `SETUP_GITHUB_ACTIONS.md` - 自動実行設定
5. 本ドキュメント - 全体構成と開発状況

---

**最終更新日**: 2026-01-15
**プロジェクトバージョン**: 1.0.0
**メンテナ**: [あなたの名前]
