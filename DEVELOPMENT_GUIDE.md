# 開発者ガイド

このドキュメントは、プロジェクトの開発に役立つクイックリファレンスです。

---

## 🚀 クイックスタート

### 1. 初期セットアップ（初回のみ）

```bash
# リポジトリのクローン
git clone <repository-url>
cd 260113_ニュースサイト

# 依存パッケージのインストール
npm install

# 環境変数ファイルの作成
cp .env.example .env.local  # または手動で作成

# 環境変数を編集
# .env.localに必要な値を設定
```

### 2. 開発サーバーの起動

```bash
npm run dev
```

ブラウザで http://localhost:3000 を開く

### 3. OAuth認証（初回のみ）

詳細は `SETUP.md` を参照

---

## 📁 ディレクトリ構造とファイルの役割

```
app/
├── api/
│   ├── fetch-news/route.ts   # メインAPI: ニュース取得・保存
│   ├── news/route.ts          # ニュース読み取りAPI
│   ├── auth/route.ts          # OAuth認証URL生成
│   └── auth/callback/route.ts # OAuth認証コールバック
├── admin/page.tsx             # 管理画面UI
├── page.tsx                   # ホームページ
└── layout.tsx                 # ルートレイアウト

lib/
├── rss.ts                     # Google News RSS取得
├── gemini.ts                  # AI画像生成（Gemini 2.0）
├── classify.ts                # カテゴリ分類（Gemini 2.5）
├── drive.ts                   # Google Drive画像アップロード
├── ogp.ts                     # OGP画像取得
├── sheets.ts                  # スプレッドシート書き込み
└── sheets-read.ts             # スプレッドシート読み込み
```

---

## 🔧 主要な関数とAPI

### RSS取得 (`lib/rss.ts`)

```typescript
import { fetchGoogleNewsRSS } from '@/lib/rss';

// Google Newsから生成AI関連のニュースを取得
const newsItems = await fetchGoogleNewsRSS('生成AI OR AI生成', 50);
// 戻り値: { title, link, description, pubDate }[]
```

### AI画像生成 (`lib/gemini.ts`)

```typescript
import { generateImageWithGemini } from '@/lib/gemini';

// ニュースタイトルから画像を生成
const imageBase64 = await generateImageWithGemini('ChatGPTの新機能が発表');
// 戻り値: Base64エンコードされたPNG画像データ（string | null）
```

### カテゴリ分類 (`lib/classify.ts`)

```typescript
import { classifyNewsCategory } from '@/lib/classify';

// タイトルと説明からカテゴリを分類
const category = await classifyNewsCategory(
  'ChatGPTの新機能が発表',
  'OpenAIが新しい言語モデルを発表しました'
);
// 戻り値: '言語生成AI' | '画像生成AI' | '動画生成AI' | '音声生成AI' | 'その他'
```

### Google Drive画像アップロード (`lib/drive.ts`)

```typescript
import { uploadImageToDrive } from '@/lib/drive';

// Base64画像をGoogle Driveにアップロード
const imageUrl = await uploadImageToDrive(imageBase64, 'news_image.png');
// 戻り値: 公開URLまたはGoogle Drive View URL
```

### OGP画像取得 (`lib/ogp.ts`)

```typescript
import { fetchOGPImage } from '@/lib/ogp';

// URLからOGP画像を取得
const ogpImageUrl = await fetchOGPImage('https://example.com/article');
// 戻り値: 画像URL（string | null）
```

### スプレッドシート操作

**書き込み** (`lib/sheets.ts`):

```typescript
import { saveNewsToSheet } from '@/lib/sheets';

const newsData = [
  {
    title: 'ニュースタイトル',
    link: 'https://example.com',
    description: '説明文',
    pubDate: '2026-01-15',
    ogpImage: 'https://example.com/image.jpg',
    category: '言語生成AI'
  }
];

await saveNewsToSheet(newsData);
```

**読み込み** (`lib/sheets-read.ts`):

```typescript
import { readNewsFromSheet } from '@/lib/sheets-read';

const newsData = await readNewsFromSheet();
// 戻り値: NewsData[]
```

---

## 🌐 APIエンドポイントの使い方

### 1. ニュース取得・保存API

```bash
# 1件取得（デフォルト）
curl "http://localhost:3000/api/fetch-news?key=YOUR_SECRET_KEY"

# 3件取得
curl "http://localhost:3000/api/fetch-news?key=YOUR_SECRET_KEY&count=3"

# 最大10件まで指定可能
curl "http://localhost:3000/api/fetch-news?key=YOUR_SECRET_KEY&count=10"
```

**パラメータ**:
- `key` (必須): `ADMIN_SECRET_KEY`の値
- `count` (オプション): 取得件数（1-10、デフォルト: 1）

**レスポンス例**:
```json
{
  "success": true,
  "message": "ニュースの取得と保存が完了しました",
  "count": 3,
  "data": [
    {
      "title": "ChatGPTの新機能",
      "link": "https://example.com/article",
      "description": "OpenAIが...",
      "pubDate": "2026-01-15",
      "ogpImage": "https://drive.google.com/...",
      "category": "言語生成AI"
    }
  ],
  "debug": {
    "generatedImages": 2,
    "totalImages": 3
  }
}
```

### 2. ニュース一覧取得API

```bash
curl "http://localhost:3000/api/news"
```

**レスポンス例**:
```json
{
  "success": true,
  "count": 10,
  "data": [...]
}
```

### 3. OAuth認証API

```bash
# 認証URL取得
curl "http://localhost:3000/api/auth"

# コールバック（自動リダイレクト）
# ブラウザで /api/auth/callback?code=xxx にアクセス
```

---

## 🧪 テストとデバッグ

### 環境変数の確認

```bash
curl "http://localhost:3000/api/test-env"
```

設定されている環境変数を確認できます（値は表示されません）

### ログの確認

開発サーバーのコンソールで以下のログが表示されます:

```
ニュース取得を開始...
RSSから取得した記事: 50件
既存記事数: 10件
重複を除いた新しい記事: 45件
処理する記事: 3件（指定: 3件）
処理中: ChatGPTの新機能が発表
  カテゴリ分類中...
  ✓ 分類結果: 言語生成AI
========== 画像生成開始: ChatGPTの新機能が発表 ==========
✓ 画像データ取得成功（base64長: 123456）
→ Google Driveにアップロード中: ChatGPT_1737123456.png
✓ 画像生成・アップロード成功: https://drive.google.com/...
========== 画像生成完了 ==========
```

### エラーデバッグ

**よくあるエラーと対処法**:

| エラーメッセージ | 原因 | 対処法 |
|----------------|------|--------|
| `ADMIN_SECRET_KEYが設定されていません` | 環境変数未設定 | `.env.local`に追加 |
| `認証エラー: 無効なシークレットキーです` | シークレットキーが間違っている | `.env.local`の値を確認 |
| `環境変数が設定されていません` | Google関連の環境変数未設定 | `GOOGLE_CLIENT_ID`等を設定 |
| `GEMINI_API_KEYが設定されていません` | Gemini API key未設定 | Google AI Studioで取得して設定 |
| `429 Too Many Requests` | APIレート制限 | 時間を置いて再実行 |
| `OAuth token expired` | トークン期限切れ | リフレッシュトークンを再取得 |

---

## 🔄 処理フロー

### ニュース取得処理の全体フロー

```
1. APIエンドポイント呼び出し
   ↓
2. シークレットキー認証
   ↓
3. 既存記事の取得（重複チェック用）
   ↓
4. Google News RSSから最新記事を取得（最大50件）
   ↓
5. 重複記事を除外
   ↓
6. 指定件数に絞る（count パラメータ）
   ↓
7. 各記事に対して以下を実行:
   ├─ a. Google NewsのURLを実際の記事URLに解決
   ├─ b. Gemini 2.5でカテゴリ分類
   ├─ c. Gemini 2.0で画像生成
   ├─ d. 生成画像をGoogle Driveにアップロード
   └─ e. 失敗時はOGP画像を取得（フォールバック）
   ↓
8. スプレッドシートに保存
   ↓
9. レスポンス返却
```

### AI画像生成のフロー

```
1. ニュースタイトルを受け取る
   ↓
2. プロンプト生成
   「『{タイトル}』に関連する画像を生成してください。
    洗練されたスタイルで、プロフェッショナルな雰囲気...」
   ↓
3. Gemini 2.0 Flash Experimental に送信
   (Imagen 3モデル使用)
   ↓
4. レスポンスから画像データを抽出
   ↓
5. Base64デコード → PNG形式
   ↓
6. 返却（string | null）
```

### エラー時のリトライロジック

```typescript
// lib/gemini.ts の実装例
let lastError: Error | null = null;

for (let attempt = 1; attempt <= maxRetries; attempt++) {
  try {
    const result = await generateContent(...);
    return result; // 成功
  } catch (error) {
    lastError = error;

    if (attempt < maxRetries) {
      const delay = attempt * 2000; // 2秒、4秒、6秒...
      await new Promise(resolve => setTimeout(resolve, delay));
      console.log(`リトライ ${attempt}/${maxRetries}...`);
    }
  }
}

throw lastError; // 全リトライ失敗
```

---

## 🎨 カスタマイズ

### RSS検索クエリの変更

`app/api/fetch-news/route.ts` の73行目:

```typescript
// 現在
const newsItems = await fetchGoogleNewsRSS('生成AI OR AI生成', 50);

// カスタマイズ例
const newsItems = await fetchGoogleNewsRSS('ChatGPT OR Claude OR Gemini', 100);
```

### カテゴリの追加・変更

`lib/classify.ts` を編集:

```typescript
// カテゴリ定義を追加
const categories = [
  '言語生成AI',
  '画像生成AI',
  '動画生成AI',
  '音声生成AI',
  'ロボティクス',  // 新しいカテゴリ
  'その他'
] as const;

// プロンプトにも追加
const prompt = `
以下のニュース記事を分析して、最も適切なカテゴリを選択してください。

カテゴリ:
1. 言語生成AI
2. 画像生成AI
3. 動画生成AI
4. 音声生成AI
5. ロボティクス
6. その他
...
`;
```

### AI画像生成プロンプトのカスタマイズ

`lib/gemini.ts` の `generateImageWithGemini` 関数を編集:

```typescript
const prompt = `
「${newsTitle}」に関連する画像を生成してください。

スタイル要件:
- モダンでミニマリスト
- ビジネス向けのプロフェッショナルな雰囲気
- 色使いは落ち着いたトーン
- テキストは含めない

// カスタマイズ例: より具体的な指示
- 16:9の横長構図
- 技術的なイメージを強調
- ブルーとホワイトを基調とした配色
`;
```

### 取得件数の上限変更

`app/api/fetch-news/route.ts` の39行目:

```typescript
// 現在: 最大10件
const count = countParam ? Math.min(Math.max(parseInt(countParam, 10), 1), 10) : 1;

// 最大20件に変更
const count = countParam ? Math.min(Math.max(parseInt(countParam, 10), 1), 20) : 1;
```

⚠️ 注意: Vercelの無料プランは5分の実行時間制限があるため、あまり多くすると途中で切れる可能性があります。

---

## 🚢 デプロイ前のチェックリスト

### Vercelデプロイ前

- [ ] 全ての環境変数が`.env.local`に設定されている
- [ ] OAuth認証が完了し、`GOOGLE_REFRESH_TOKEN`が取得できている
- [ ] ローカル環境で正常に動作することを確認
- [ ] `GOOGLE_REDIRECT_URI`を本番URLに変更（例: `https://your-app.vercel.app/api/auth/callback`）
- [ ] Google Cloud Consoleで本番URLを承認済みリダイレクトURIに追加
- [ ] Gemini APIキーの取得と設定
- [ ] `ADMIN_SECRET_KEY`の生成と設定

### Vercelダッシュボードで設定する環境変数

```
GOOGLE_CLIENT_ID=xxx
GOOGLE_CLIENT_SECRET=xxx
GOOGLE_REDIRECT_URI=https://your-app.vercel.app/api/auth/callback
SPREADSHEET_ID=xxx
GOOGLE_REFRESH_TOKEN=xxx
GEMINI_API_KEY=xxx
ADMIN_SECRET_KEY=xxx
```

### GitHub Actions設定前

- [ ] リポジトリがGitHubにpush済み
- [ ] Vercelへのデプロイが完了
- [ ] GitHub Secretsに`APP_URL`を設定（末尾の`/`なし）
- [ ] GitHub Secretsに`ADMIN_SECRET_KEY`を設定
- [ ] `.github/workflows/fetch-news.yml`がリポジトリに含まれている

---

## 📊 パフォーマンス最適化

### 処理時間の短縮

1. **並列処理の導入**（現在は未実装）:
```typescript
// 複数記事を並列処理
const results = await Promise.all(
  itemsToProcess.map(async (item) => {
    // 各記事の処理
  })
);
```

⚠️ 注意: Gemini APIのレート制限に引っかかる可能性があるため慎重に実装

2. **キャッシュの活用**:
```typescript
// Next.jsの revalidate を活用
export const revalidate = 300; // 5分間キャッシュ
```

3. **画像生成のスキップオプション**:
```typescript
// クエリパラメータで制御
const skipImageGeneration = searchParams.get('skipImage') === 'true';
```

---

## 🔐 セキュリティベストプラクティス

1. **環境変数の管理**:
   - `.env.local`を絶対にgitにコミットしない
   - `.gitignore`に`.env.local`が含まれていることを確認

2. **APIキーの保護**:
   - フロントエンドにAPIキーを露出しない
   - サーバーサイド（API Routes）でのみ使用

3. **認証の強化**:
   - `ADMIN_SECRET_KEY`は十分に複雑なものを使用
   - 定期的にローテーション

4. **レート制限の実装**（今後の拡張候補）:
```typescript
// 同一IPからのリクエスト制限
const rateLimiter = new RateLimiter({
  windowMs: 15 * 60 * 1000, // 15分
  max: 5 // 最大5リクエスト
});
```

---

## 🐛 トラブルシューティング

### よくある問題の診断フロー

```
問題が発生
  ↓
環境変数は正しく設定されているか？
  → NO → .env.localを確認・修正
  → YES ↓

OAuth認証は完了しているか？
  → NO → /api/authでトークン取得
  → YES ↓

APIエンドポイントは正しいか？
  → NO → URLとパラメータを確認
  → YES ↓

Gemini APIキーは有効か？
  → NO → Google AI Studioで確認
  → YES ↓

レート制限に達していないか？
  → YES → 時間を置いて再実行
  → NO ↓

ログを確認して詳細なエラーを特定
```

### ログの読み方

**正常な場合**:
```
✓ カテゴリ分類成功
✓ 画像生成・アップロード成功
✓ ニュース取得が完了しました
```

**エラーの場合**:
```
✗✗✗ 画像生成エラー ✗✗✗
エラーメッセージ: [詳細]
→ OGP画像を取得します
```

---

## 📞 サポートとリソース

### 公式ドキュメント

- [Next.js App Router](https://nextjs.org/docs/app)
- [Gemini API](https://ai.google.dev/docs)
- [Google Sheets API](https://developers.google.com/sheets/api)
- [Google Drive API](https://developers.google.com/drive/api)

### 関連ドキュメント

- `PROJECT_DOCUMENTATION.md` - プロジェクト全体像
- `README.md` - クイックスタート
- `SETUP.md` - セットアップ詳細
- `SETUP_GITHUB_ACTIONS.md` - 自動実行設定

---

**最終更新**: 2026-01-15
