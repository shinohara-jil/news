/**
 * OAuth 2.0認証コールバック用のAPIエンドポイント
 * 初回認証時にリフレッシュトークンを取得
 */
import { NextResponse } from 'next/server';
import { google } from 'googleapis';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');

  if (!code) {
    return NextResponse.json(
      { error: '認証コードが取得できませんでした' },
      { status: 400 }
    );
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    return NextResponse.json(
      { error: '環境変数が設定されていません' },
      { status: 500 }
    );
  }

  try {
    const oauth2Client = new google.auth.OAuth2(
      clientId,
      clientSecret,
      redirectUri
    );

    const { tokens } = await oauth2Client.getToken(code);

    if (!tokens.refresh_token) {
      return NextResponse.json(
        {
          error: 'リフレッシュトークンが取得できませんでした',
          access_token: tokens.access_token ? '取得済み' : '未取得',
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: '認証が完了しました',
      refresh_token: tokens.refresh_token,
      instructions: 'このリフレッシュトークンを .env.local の GOOGLE_REFRESH_TOKEN に設定してください',
    });
  } catch (error) {
    console.error('認証エラー:', error);
    return NextResponse.json(
      {
        error: '認証エラー',
        message: error instanceof Error ? error.message : '不明なエラー',
      },
      { status: 500 }
    );
  }
}
