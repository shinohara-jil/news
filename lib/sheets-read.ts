/**
 * Google Sheets APIからデータを読み取るユーティリティ
 */
import { google } from 'googleapis';

export interface NewsData {
  title: string;
  link: string;
  description: string;
  pubDate: string;
  ogpImage: string | null;
  category: string;
}

/**
 * OAuth 2.0クライアントを取得
 */
function getOAuth2Client() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error('Google OAuth 2.0認証情報が設定されていません');
  }

  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

/**
 * アクセストークンを取得（リフレッシュトークンを使用）
 */
async function getAccessToken(): Promise<string> {
  const oauth2Client = getOAuth2Client();
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;

  if (!refreshToken) {
    throw new Error('リフレッシュトークンが設定されていません。初回認証が必要です。');
  }

  oauth2Client.setCredentials({
    refresh_token: refreshToken,
  });

  const { credentials } = await oauth2Client.refreshAccessToken();
  
  if (!credentials.access_token) {
    throw new Error('アクセストークンの取得に失敗しました');
  }

  return credentials.access_token;
}

/**
 * スプレッドシートからニュースデータを読み取る
 * @returns ニュースデータの配列
 */
export async function readNewsFromSheet(): Promise<NewsData[]> {
  const spreadsheetId = process.env.SPREADSHEET_ID;
  
  if (!spreadsheetId) {
    throw new Error('SPREADSHEET_IDが設定されていません');
  }

  const accessToken = await getAccessToken();
  const oauth2Client = getOAuth2Client();
  oauth2Client.setCredentials({
    access_token: accessToken,
  });

  const sheets = google.sheets({ version: 'v4', auth: oauth2Client });

  try {
    const sheetName = 'シート1';
    const range = `${sheetName}!A2:F`; // ヘッダー行を除く

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range,
    });

    const rows = response.data.values || [];
    
    // データをパース
    const newsData: NewsData[] = rows
      .filter((row) => row.length >= 6) // 必要な列が揃っているかチェック
      .map((row) => ({
        title: row[0] || '',
        link: row[1] || '',
        description: row[2] || '',
        pubDate: row[3] || '',
        ogpImage: row[4] || null,
        category: row[5] || '新規BtoCサービス',
      }));

    return newsData;
  } catch (error) {
    console.error('スプレッドシート読み取りエラー:', error);
    throw error;
  }
}
