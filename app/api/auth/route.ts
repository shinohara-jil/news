/**
 * OAuth 2.0認証開始用のAPIエンドポイント
 * 初回認証時にこのエンドポイントにアクセスしてGoogle認証を開始
 */
import { NextResponse } from 'next/server';
import { google } from 'googleapis';

export async function GET() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    return NextResponse.json(
      { error: '環境変数が設定されていません' },
      { status: 500 }
    );
  }

  const oauth2Client = new google.auth.OAuth2(
    clientId,
    clientSecret,
    redirectUri
  );

  // スコープを設定（スプレッドシートの読み書き + Google Drive）
  const scopes = [
    'https://www.googleapis.com/auth/spreadsheets',
    'https://www.googleapis.com/auth/drive.file', // Google Driveへのファイルアップロード
  ];

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: scopes,
    prompt: 'consent', // リフレッシュトークンを取得するために必要
  });

  return NextResponse.json({
    authUrl,
    instructions: 'このURLにブラウザでアクセスして認証を完了してください',
  });
}
