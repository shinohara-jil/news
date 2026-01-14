/**
 * Google Drive APIで画像をアップロードするユーティリティ
 */
import { google } from 'googleapis';
import { Readable } from 'stream';

const DRIVE_FOLDER_ID = '14JLobpKuv675WjxUNs4CgUd9iukrKcMd';

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
 * base64画像データをGoogle Driveにアップロード
 * @param imageData base64エンコードされた画像データ
 * @param fileName ファイル名
 * @returns アップロードされたファイルの共有可能なURL
 */
export async function uploadImageToDrive(
  imageData: string,
  fileName: string
): Promise<string> {
  const accessToken = await getAccessToken();
  const oauth2Client = getOAuth2Client();
  oauth2Client.setCredentials({
    access_token: accessToken,
  });

  const drive = google.drive({ version: 'v3', auth: oauth2Client });

  try {
    // base64データをBufferに変換
    const buffer = Buffer.from(imageData, 'base64');

    // ファイルをアップロード
    const fileMetadata = {
      name: fileName,
      parents: [DRIVE_FOLDER_ID],
    };

    // googleapisはStreamを期待するため、BufferをReadableストリームに変換
    const stream = Readable.from(buffer);

    const media = {
      mimeType: 'image/png',
      body: stream,
    };

    const file = await drive.files.create({
      requestBody: fileMetadata,
      media: media,
      fields: 'id, webViewLink',
    });

    if (!file.data.id) {
      throw new Error('ファイルのアップロードに失敗しました');
    }

    // ファイルを共有可能にする
    await drive.permissions.create({
      fileId: file.data.id,
      requestBody: {
        role: 'reader',
        type: 'anyone',
      },
    });

    // 共有可能なURLを取得（画像として直接表示可能）
    // Google Driveの画像を直接表示するためのURL形式
    // thumbnail?id= 形式を使用（より確実に表示される）
    const imageUrl = `https://drive.google.com/thumbnail?id=${file.data.id}&sz=w800`;

    console.log(`画像をアップロードしました: ${imageUrl}`);
    console.log(`ファイルID: ${file.data.id}`);
    console.log(`代替URL（uc形式）: https://drive.google.com/uc?export=view&id=${file.data.id}`);
    
    return imageUrl;
  } catch (error) {
    console.error('Google Driveアップロードエラー:', error);
    throw error;
  }
}
