# セットアップ手順

## 1. Google CloudコンソールでAPIキーを取得する手順

### Step 1: Google Cloudプロジェクトの作成
1. [Google Cloud Console](https://console.cloud.google.com/)にアクセス
2. プロジェクトを選択するか、新しいプロジェクトを作成
   - 画面左上のプロジェクト選択ドロップダウンをクリック
   - 「新しいプロジェクト」をクリック
   - プロジェクト名を入力（例：「news-curation-site」）
   - 「作成」をクリック

### Step 2: Google Sheets APIの有効化
1. 左側メニューから「APIとサービス」→「ライブラリ」を選択
2. 検索バーで「Google Sheets API」を検索
3. 「Google Sheets API」をクリック
4. 「有効にする」ボタンをクリック

### Step 3: 認証情報の作成
1. 左側メニューから「APIとサービス」→「認証情報」を選択
2. 画面上部の「認証情報を作成」をクリック
3. 「サービスアカウント」を選択
   - サービスアカウント名を入力（例：「news-site-service」）
   - サービスアカウントIDが自動生成されます
   - 「作成して続行」をクリック
4. ロールの割り当て（スキップ可、後で変更可能）
5. 「完了」をクリック

### Step 4: 認証方法の選択

**⚠️ 注意：組織ポリシーによりサービスアカウントキーが作成できない場合があります。**

その場合は、以下の**方法A（OAuth 2.0）**を使用してください。

---

#### 方法A: OAuth 2.0認証（推奨・組織ポリシー適用時）

**まず、OAuth同意画面を設定する必要があります（初回のみ）：**

1. 左側メニューから「APIとサービス」→「OAuth同意画面」を選択
2. ユーザータイプで「外部」を選択し、「作成」をクリック
3. **アプリ情報**を入力：
   - **アプリ名**: 「News Site」など任意の名前を入力
   - **ユーザーサポートメール**（⚠️ 必須）:
     - ドロップダウンをクリックして、自分のGoogleアカウントのメールアドレスを選択
     - エラーメッセージ「メールアドレスを選択する必要があります」が消えるまで選択してください
   - **デベロッパーの連絡先情報**: 自分のメールアドレスを入力
   - 「次へ」をクリック
4. **スコープ**の設定：
   - 「スコープを追加または削除」をクリック
   - `https://www.googleapis.com/auth/spreadsheets` を追加（スプレッドシートの読み書き用）
   - 「更新」→「保存して次へ」をクリック
5. **テストユーザー**の追加（開発中は必須）：
   - 「ユーザーを追加」をクリック
   - 自分のGoogleアカウントのメールアドレスを追加
   - 「保存して次へ」をクリック
6. 概要を確認して完了

**次に、OAuth 2.0クライアントIDを作成：**

1. 左側メニューから「APIとサービス」→「認証情報」を選択
2. 画面上部の「認証情報を作成」をクリック
3. **「OAuth クライアント ID」**を選択
4. アプリケーションの種類で「ウェブアプリケーション」を選択
5. 名前を入力（例：「News Site」）
6. **承認済みのリダイレクト URI**：
   - 開発環境: `http://localhost:3000/api/auth/callback`
   - 「+ URIを追加」で追加
7. 「作成」をクリック
8. **重要：** 表示されるダイアログで以下をコピーして保存：
   - **クライアント ID**（例：`123456789-abc.apps.googleusercontent.com`）
   - **クライアント シークレット**（例：`GOCSPX-xxxxxxxxxxxxx`）
   - ⚠️ これらは一度しか表示されません！必ず保存してください
   - これらは後で環境変数に設定します

**重要：** OAuth 2.0を使用する場合、初回認証時にブラウザでGoogleアカウントにログインする必要があります。
開発環境でのみ使用するか、Vercelのサーバーサイドで実行する場合に適しています。

---

#### 方法B: サービスアカウントキー（組織ポリシーがない場合）

組織ポリシーが適用されていない場合は、この方法を使用できます：

1. Step 3で作成したサービスアカウントをクリック
2. 「キー」タブを選択
3. 「キーを追加」→「新しいキーを作成」を選択
4. キーのタイプで「JSON」を選択
5. 「作成」をクリック
   - JSONファイルが自動的にダウンロードされます
   - **このファイルは安全に保管してください（後で使用します）**

### Step 5: Googleスプレッドシートの共有設定

#### 方法A（OAuth 2.0）を使用する場合
- 共有設定は不要です（自分のGoogleアカウントで作成したスプレッドシートにアクセス）

#### 方法B（サービスアカウント）を使用する場合
1. 使用するGoogleスプレッドシートを開く
2. 右上の「共有」ボタンをクリック
3. Step 4でダウンロードしたJSONファイル内の`client_email`の値をコピー
4. そのメールアドレスをスプレッドシートに追加（編集権限で）
5. 「送信」をクリック

## 2. Next.jsプロジェクトの作成

プロジェクトルートで以下のコマンドを実行してください：

```bash
# Next.jsプロジェクトの作成（App Router使用）
npx create-next-app@latest . --typescript --tailwind --app --no-src-dir --import-alias "@/*" --yes

# 必要なパッケージのインストール
npm install googleapis cheerio
npm install --save-dev @types/cheerio
```

### パッケージの説明
- `googleapis`: Google Sheets APIを使用するための公式ライブラリ
- `cheerio`: HTMLパースとOGP画像抽出用（jQueryライクな操作が可能）
- `@types/cheerio`: TypeScriptの型定義

## 3. 環境変数の設定

プロジェクトルートに `.env.local` ファイルを作成し、以下を設定：

### 方法A: OAuth 2.0認証を使用する場合

```env
# OAuth 2.0認証情報（Step 4-Aで取得）
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/callback

# スプレッドシートID（スプレッドシートのURLから取得）
# 例: https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit
SPREADSHEET_ID=your-spreadsheet-id
```

### 方法B: サービスアカウントキーを使用する場合

```env
# Google Sheets認証情報（JSONファイルの内容を環境変数として設定）
GOOGLE_SERVICE_ACCOUNT_EMAIL=your-service-account-email@project-id.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour-Private-Key\n-----END PRIVATE KEY-----"
GOOGLE_PROJECT_ID=your-project-id

# または、JSONファイルのパスを指定（サーバーサイドでのみ使用可能）
GOOGLE_APPLICATION_CREDENTIALS=./path/to/service-account-key.json

# スプレッドシートID（スプレッドシートのURLから取得）
# 例: https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit
SPREADSHEET_ID=your-spreadsheet-id
```

### 環境変数の取得方法

#### 方法A（OAuth 2.0）の場合：
1. Step 4-Aでコピーした**クライアント ID** → `GOOGLE_CLIENT_ID`
2. Step 4-Aでコピーした**クライアント シークレット** → `GOOGLE_CLIENT_SECRET`
3. `GOOGLE_REDIRECT_URI` は開発環境では `http://localhost:3000/api/auth/callback` を使用
4. スプレッドシートのURLから `SPREADSHEET_ID` を取得

#### 方法B（サービスアカウント）の場合：
1. ダウンロードしたJSONファイルを開く
2. 以下の値を `.env.local` に設定：
   - `client_email` → `GOOGLE_SERVICE_ACCOUNT_EMAIL`
   - `private_key` → `GOOGLE_PRIVATE_KEY`（改行は `\n` で表現）
   - `project_id` → `GOOGLE_PROJECT_ID`
3. スプレッドシートのURLから `SPREADSHEET_ID` を取得
   - URL形式: `https://docs.google.com/spreadsheets/d/[SPREADSHEET_ID]/edit`

## 4. Vercelデプロイ時の環境変数設定

Vercelにデプロイする際は、以下を設定：

### 方法A（OAuth 2.0）を使用する場合：
1. **Google Cloud ConsoleでリダイレクトURIを追加**
   - 「APIとサービス」→「認証情報」→ OAuth クライアント ID を編集
   - 「承認済みのリダイレクト URI」に以下を追加：
     - `https://your-domain.vercel.app/api/auth/callback`
2. **Vercelダッシュボードで環境変数を設定**
   - Vercelダッシュボード → プロジェクト → Settings → Environment Variables
   - 以下の環境変数を追加：
     - `GOOGLE_CLIENT_ID`
     - `GOOGLE_CLIENT_SECRET`
     - `GOOGLE_REDIRECT_URI`（本番環境のURLに変更）
     - `SPREADSHEET_ID`

### 方法B（サービスアカウント）を使用する場合：
1. Vercelダッシュボード → プロジェクト → Settings → Environment Variables
2. 上記の環境変数を全て追加
3. `.env.local` は本番環境では使用しない（Vercelの環境変数を使用）

## 次のステップ

セットアップが完了したら、次は以下の実装に進みます：
- RSS取得機能
- OGP画像抽出機能
- タグ分類機能
- スプレッドシートへの保存機能
