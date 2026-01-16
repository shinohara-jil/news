# API リファレンス

このドキュメントでは、全てのAPIエンドポイントの詳細仕様を説明します。

---

## 📌 ベースURL

- **開発環境**: `http://localhost:3000`
- **本番環境**: `https://your-app.vercel.app`

---

## 🔐 認証

一部のエンドポイントは認証が必要です。

### ADMIN_SECRET_KEY認証

クエリパラメータ `key` に `ADMIN_SECRET_KEY` を指定します。

```
GET /api/fetch-news?key=YOUR_SECRET_KEY
```

---

## 📋 エンドポイント一覧

| エンドポイント | メソッド | 認証 | 用途 |
|--------------|---------|------|------|
| `/api/fetch-news` | GET | 必須 | ニュース取得・保存 |
| `/api/news` | GET | 不要 | ニュース一覧取得 |
| `/api/auth` | GET | 不要 | OAuth認証URL生成 |
| `/api/auth/callback` | GET | 不要 | OAuth認証コールバック |
| `/api/test-env` | GET | 不要 | 環境変数確認 |

---

## 📖 エンドポイント詳細

### 1. ニュース取得・保存API

Google Newsからニュースを取得し、AI画像を生成してスプレッドシートに保存します。

#### エンドポイント

```
GET /api/fetch-news
```

#### 認証

必須（`ADMIN_SECRET_KEY`）

#### パラメータ

| パラメータ | 型 | 必須 | デフォルト | 説明 |
|-----------|-----|------|-----------|------|
| `key` | string | ✅ | - | 管理者シークレットキー |
| `count` | integer | ❌ | 1 | 取得件数（1-10） |

#### リクエスト例

```bash
# 1件取得
curl "http://localhost:3000/api/fetch-news?key=YOUR_SECRET_KEY"

# 3件取得
curl "http://localhost:3000/api/fetch-news?key=YOUR_SECRET_KEY&count=3"

# 最大10件
curl "http://localhost:3000/api/fetch-news?key=YOUR_SECRET_KEY&count=10"
```

#### レスポンス

**成功時（200 OK）**:

```json
{
  "success": true,
  "message": "ニュースの取得と保存が完了しました",
  "count": 3,
  "data": [
    {
      "title": "ChatGPTの新機能が発表",
      "link": "https://example.com/article",
      "description": "OpenAIが新しい機能を発表しました...",
      "pubDate": "2026-01-15T10:00:00Z",
      "ogpImage": "https://drive.google.com/uc?id=xxx",
      "category": "言語生成AI"
    },
    {
      "title": "Midjourneyが新バージョンをリリース",
      "link": "https://example.com/article2",
      "description": "画像生成AIのMidjourneyが...",
      "pubDate": "2026-01-15T09:30:00Z",
      "ogpImage": "https://example.com/ogp.jpg",
      "category": "画像生成AI"
    }
  ],
  "debug": {
    "generatedImages": 1,
    "totalImages": 2,
    "rssItemsCount": 50,
    "existingItemsCount": 10,
    "newItemsCount": 45
  }
}
```

**新しい記事がない場合（200 OK）**:

```json
{
  "success": true,
  "message": "新しい記事がありませんでした（全て既存記事と重複しています）",
  "count": 0,
  "data": [],
  "debug": {
    "rssItemsCount": 50,
    "existingItemsCount": 50,
    "newItemsCount": 0
  }
}
```

**認証エラー（401 Unauthorized）**:

```json
{
  "error": "認証エラー: 無効なシークレットキーです"
}
```

**環境変数未設定（500 Internal Server Error）**:

```json
{
  "error": "環境変数が設定されていません"
}
```

**その他のエラー（500 Internal Server Error）**:

```json
{
  "error": "ニュース取得エラー",
  "message": "詳細なエラーメッセージ"
}
```

#### 処理時間

- 1件: 約15-30秒
- 3件: 約1-2分
- 10件: 約3-5分

#### レート制限

Gemini APIのレート制限に依存します。429エラーが発生した場合は自動リトライします（最大3回）。

---

### 2. ニュース一覧取得API

スプレッドシートに保存されているニュース一覧を取得します。

#### エンドポイント

```
GET /api/news
```

#### 認証

不要

#### パラメータ

なし

#### リクエスト例

```bash
curl "http://localhost:3000/api/news"
```

#### レスポンス

**成功時（200 OK）**:

```json
{
  "success": true,
  "count": 10,
  "data": [
    {
      "title": "ChatGPTの新機能が発表",
      "link": "https://example.com/article",
      "description": "OpenAIが新しい機能を発表しました...",
      "pubDate": "2026-01-15T10:00:00Z",
      "ogpImage": "https://drive.google.com/uc?id=xxx",
      "category": "言語生成AI"
    }
  ]
}
```

**エラー時（500 Internal Server Error）**:

```json
{
  "error": "ニュース取得エラー",
  "message": "詳細なエラーメッセージ"
}
```

#### キャッシュ

- キャッシュ時間: 30秒
- Next.jsの `revalidate` を使用
- `Cache-Control: public, s-maxage=30, stale-while-revalidate=60`

---

### 3. OAuth認証URL生成API

Google OAuth 2.0の認証URLを生成します。

#### エンドポイント

```
GET /api/auth
```

#### 認証

不要

#### パラメータ

なし

#### リクエスト例

```bash
curl "http://localhost:3000/api/auth"
```

#### レスポンス

**成功時（200 OK）**:

```json
{
  "authUrl": "https://accounts.google.com/o/oauth2/v2/auth?client_id=xxx&redirect_uri=xxx&response_type=code&scope=xxx&access_type=offline&prompt=consent"
}
```

#### 使い方

1. `authUrl` をブラウザで開く
2. Googleアカウントでログイン
3. 権限を承認
4. `/api/auth/callback` にリダイレクトされる

---

### 4. OAuth認証コールバックAPI

Google OAuth 2.0の認証コールバックを処理します。

#### エンドポイント

```
GET /api/auth/callback
```

#### 認証

不要

#### パラメータ

| パラメータ | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| `code` | string | ✅ | Googleから返される認証コード |

#### リクエスト例

```
# ブラウザで自動的にリダイレクトされます
GET /api/auth/callback?code=4/0AfJohXn...
```

#### レスポンス

**成功時（200 OK）**:

ブラウザにトークン情報が表示されます:

```json
{
  "access_token": "ya29.a0AfH6...",
  "refresh_token": "1//0gd8s-L9Ir...",
  "scope": "https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive.file",
  "token_type": "Bearer",
  "expires_in": 3599
}
```

**重要**: `refresh_token` を `.env.local` の `GOOGLE_REFRESH_TOKEN` に設定してください。

**エラー時（400 Bad Request）**:

```json
{
  "error": "認証コードが提供されていません"
}
```

**エラー時（500 Internal Server Error）**:

```json
{
  "error": "トークンの取得に失敗しました",
  "details": "詳細なエラーメッセージ"
}
```

---

### 5. 環境変数確認API

設定されている環境変数を確認します（値は表示されません）。

#### エンドポイント

```
GET /api/test-env
```

#### 認証

不要

#### パラメータ

なし

#### リクエスト例

```bash
curl "http://localhost:3000/api/test-env"
```

#### レスポンス

**成功時（200 OK）**:

```json
{
  "env": {
    "GOOGLE_CLIENT_ID": "設定済み（xxx...com）",
    "GOOGLE_CLIENT_SECRET": "設定済み",
    "GOOGLE_REDIRECT_URI": "設定済み（http://localhost:3000/api/auth/callback）",
    "SPREADSHEET_ID": "設定済み（1abc...）",
    "GOOGLE_REFRESH_TOKEN": "設定済み",
    "GEMINI_API_KEY": "設定済み",
    "ADMIN_SECRET_KEY": "設定済み"
  }
}
```

**一部未設定の場合**:

```json
{
  "env": {
    "GOOGLE_CLIENT_ID": "設定済み（xxx...com）",
    "GOOGLE_CLIENT_SECRET": "設定済み",
    "GOOGLE_REDIRECT_URI": "設定済み（http://localhost:3000/api/auth/callback）",
    "SPREADSHEET_ID": "設定済み（1abc...）",
    "GOOGLE_REFRESH_TOKEN": "未設定",
    "GEMINI_API_KEY": "未設定",
    "ADMIN_SECRET_KEY": "設定済み"
  }
}
```

---

## 🚨 エラーコード

### HTTPステータスコード

| コード | 説明 | 対処法 |
|--------|------|--------|
| 200 | 成功 | - |
| 400 | リクエストが不正 | パラメータを確認 |
| 401 | 認証エラー | `ADMIN_SECRET_KEY` を確認 |
| 500 | サーバーエラー | ログを確認、環境変数を確認 |

### エラーメッセージ一覧

| エラーメッセージ | 原因 | 対処法 |
|----------------|------|--------|
| `ADMIN_SECRET_KEYが設定されていません` | 環境変数未設定 | `.env.local` に追加 |
| `認証エラー: 無効なシークレットキーです` | キーが間違っている | 正しい値を確認 |
| `環境変数が設定されていません` | Google関連の環境変数未設定 | セットアップ手順を確認 |
| `ニュース取得エラー` | 様々な原因 | ログで詳細を確認 |
| `トークンの取得に失敗しました` | OAuth認証失敗 | 再度認証フローを実行 |

---

## 📝 データ型定義

### NewsData

```typescript
interface NewsData {
  title: string;           // ニュースタイトル
  link: string;            // 記事URL（実際の記事URL、Google NewsのURLではない）
  description: string;     // 記事の説明文
  pubDate: string;         // 公開日（ISO 8601形式）
  ogpImage: string | null; // 画像URL（AI生成画像 or OGP画像）
  category: string;        // カテゴリ（'言語生成AI' | '画像生成AI' | '動画生成AI' | '音声生成AI' | 'その他'）
}
```

### カテゴリ型

```typescript
type NewsCategory =
  | '言語生成AI'
  | '画像生成AI'
  | '動画生成AI'
  | '音声生成AI'
  | 'その他';
```

---

## 🔄 使用例

### シナリオ1: 初回セットアップ

```bash
# 1. 環境変数の確認
curl "http://localhost:3000/api/test-env"

# 2. OAuth認証URL取得
curl "http://localhost:3000/api/auth"
# → authUrlをブラウザで開いて認証

# 3. リフレッシュトークンを.env.localに設定

# 4. 開発サーバーを再起動
npm run dev

# 5. ニュースを1件取得してテスト
curl "http://localhost:3000/api/fetch-news?key=YOUR_SECRET_KEY&count=1"
```

### シナリオ2: 定期実行（GitHub Actions）

```yaml
# .github/workflows/fetch-news.yml
- name: ニュース取得
  run: |
    curl -L "https://your-app.vercel.app/api/fetch-news?key=${{ secrets.ADMIN_SECRET_KEY }}&count=3"
```

### シナリオ3: ニュース一覧の表示

```typescript
// React Component
const NewsList = () => {
  const [news, setNews] = useState([]);

  useEffect(() => {
    fetch('/api/news')
      .then(res => res.json())
      .then(data => setNews(data.data));
  }, []);

  return (
    <div>
      {news.map(item => (
        <div key={item.link}>
          <h2>{item.title}</h2>
          <img src={item.ogpImage} alt={item.title} />
          <p>{item.description}</p>
          <span>{item.category}</span>
        </div>
      ))}
    </div>
  );
};
```

---

## 🛡️ セキュリティ

### ベストプラクティス

1. **ADMIN_SECRET_KEYの管理**:
   - 十分に複雑な文字列を使用（最低32文字推奨）
   - 生成方法: `openssl rand -hex 32`
   - 定期的にローテーション

2. **環境変数の保護**:
   - `.env.local` を絶対にコミットしない
   - 本番環境では Vercel Environment Variables を使用

3. **HTTPS の使用**:
   - 本番環境では必ずHTTPSを使用
   - Vercelは自動的にHTTPSを提供

4. **レート制限**（今後の実装予定）:
   - 同一IPからのリクエスト制限
   - APIキーごとの使用量制限

---

## 📊 パフォーマンス

### レスポンスタイム（目安）

| エンドポイント | 平均レスポンスタイム | 最大実行時間 |
|--------------|-------------------|-------------|
| `/api/fetch-news?count=1` | 15-30秒 | 300秒（5分） |
| `/api/fetch-news?count=3` | 60-120秒 | 300秒（5分） |
| `/api/news` | 100-500ms | 10秒 |
| `/api/auth` | 50-100ms | 10秒 |
| `/api/auth/callback` | 1-2秒 | 10秒 |
| `/api/test-env` | 10-50ms | 10秒 |

### 最適化のヒント

1. **キャッシュの活用**:
   - `/api/news` は30秒間キャッシュされます
   - 頻繁に変更されない場合はキャッシュ時間を延長可能

2. **並列処理**（今後の実装）:
   - 複数記事を並列処理してレスポンスタイムを短縮

3. **取得件数の調整**:
   - 必要最小限の件数を指定
   - Vercelの5分制限を考慮して最大10件程度が推奨

---

## 🐛 トラブルシューティング

### よくある問題

#### 問題1: 401エラーが返る

```json
{
  "error": "認証エラー: 無効なシークレットキーです"
}
```

**原因**: `ADMIN_SECRET_KEY` が間違っている

**解決策**:
1. `.env.local` の値を確認
2. GitHub Secrets の値を確認
3. URLエンコードが必要な特殊文字が含まれていないか確認

#### 問題2: 500エラーが返る

```json
{
  "error": "環境変数が設定されていません"
}
```

**原因**: 必須の環境変数が未設定

**解決策**:
1. `/api/test-env` で設定状況を確認
2. 未設定の環境変数を `.env.local` に追加
3. 開発サーバーを再起動

#### 問題3: タイムアウトエラー

**原因**: 処理時間が5分を超えた

**解決策**:
1. `count` パラメータを減らす（例: 3件 → 1件）
2. Gemini APIのレスポンスタイムを確認
3. ログで処理が止まっている箇所を特定

#### 問題4: 画像生成が全て失敗する

**原因**: `GEMINI_API_KEY` が未設定または無効

**解決策**:
1. Google AI Studio でAPIキーを確認
2. `.env.local` に正しい値を設定
3. APIキーのクォータ制限を確認

---

## 📚 関連ドキュメント

- [PROJECT_DOCUMENTATION.md](./PROJECT_DOCUMENTATION.md) - プロジェクト全体構成
- [DEVELOPMENT_GUIDE.md](./DEVELOPMENT_GUIDE.md) - 開発者ガイド
- [ARCHITECTURE.md](./ARCHITECTURE.md) - システムアーキテクチャ
- [SETUP.md](./SETUP.md) - セットアップ手順

---

**最終更新**: 2026-01-15
**APIバージョン**: 1.0.0
