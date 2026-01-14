/**
 * Google Sheets API連携用のユーティリティ
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
 * スプレッドシートにニュースデータを保存
 * @param newsData 保存するニュースデータの配列
 */
export async function saveNewsToSheet(newsData: NewsData[]): Promise<void> {
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

  // ヘッダー行を準備
  const headers = ['タイトル', 'リンク', '説明', '公開日', 'OGP画像', 'カテゴリ'];
  
  // データ行を準備
  const values = newsData.map((item) => [
    item.title,
    item.link,
    item.description,
    item.pubDate,
    item.ogpImage || '',
    item.category,
  ]);

  // 既存のデータを確認して、新しいデータのみ追加
  try {
    // シート名（デフォルトは「シート1」）
    const sheetName = 'シート1';

    // ヘッダー行を確認
    const headerData = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${sheetName}!A1:F1`,
    });

    const hasHeader = headerData.data.values && headerData.data.values.length > 0;
    console.log(`ヘッダー行の存在: ${hasHeader ? 'あり' : 'なし'}`);

    // 既存のデータを取得（ヘッダー行を除く）
    const existingData = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${sheetName}!A2:F`,
    });

    const existingRows = existingData.data.values || [];
    const existingLinks = new Set(
      existingRows.map((row) => (row[1] as string)?.trim() || '').filter(Boolean)
    );

    console.log(`既存のデータ: ${existingRows.length}件`);
    console.log(`取得したデータ: ${values.length}件`);
    console.log(`既存のリンク数: ${existingLinks.size}`);

    // 新しいデータのみフィルタリング
    const newData = values.filter((row) => {
      const link = (row[1] as string)?.trim() || '';
      const isNew = !existingLinks.has(link);
      if (!isNew) {
        console.log(`重複スキップ: ${link}`);
      }
      return isNew;
    });

    console.log(`新しいデータ: ${newData.length}件`);

    if (newData.length === 0) {
      console.log('新しいデータはありません（全て重複しています）');
      return;
    }

    // ヘッダーが存在しない場合は追加
    if (!hasHeader) {
      console.log('ヘッダー行が存在しないため、追加します');
      
      if (existingRows.length > 0) {
        // 既存データがある場合: 1行目にヘッダーを挿入するため、既存データを下にシフト
        // insertDimension APIを使用して1行挿入
        await sheets.spreadsheets.batchUpdate({
          spreadsheetId,
          requestBody: {
            requests: [
              {
                insertDimension: {
                  range: {
                    sheetId: 0, // シート1のID（通常は0）
                    dimension: 'ROWS',
                    startIndex: 0,
                    endIndex: 1,
                  },
                },
              },
            ],
          },
        });
        
        // 1行目にヘッダーを追加
        await sheets.spreadsheets.values.update({
          spreadsheetId,
          range: `${sheetName}!A1:F1`,
          valueInputOption: 'USER_ENTERED',
          requestBody: {
            values: [headers],
          },
        });
        
        console.log('ヘッダー行を1行目に挿入しました（既存データは2行目以降にシフト）');
      } else {
        // 既存データがない場合は、ヘッダーと新しいデータを一緒に追加
        await sheets.spreadsheets.values.append({
          spreadsheetId,
          range: `${sheetName}!A1`,
          valueInputOption: 'USER_ENTERED',
          requestBody: {
            values: [headers, ...newData],
          },
        });
        console.log(`ヘッダーと${newData.length}件のデータを追加しました`);
        return; // 既にデータを追加したので終了
      }
    }
    
    // 新しいデータを追加（ヘッダー行がある場合、またはヘッダーを追加した後）
    const nextRow = existingRows.length + 2; // ヘッダー行(1) + 既存データ行数 + 1
    console.log(`次の行に追加: ${nextRow}行目`);
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `${sheetName}!A${nextRow}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: newData,
      },
    });
    console.log(`${newData.length}件のデータを${nextRow}行目に追加しました`);

    console.log(`${newData.length}件のニュースをスプレッドシートに保存しました`);
  } catch (error) {
    console.error('スプレッドシート保存エラー:', error);
    throw error;
  }
}
