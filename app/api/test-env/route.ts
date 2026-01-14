import { NextResponse } from 'next/server';

/**
 * 環境変数の設定確認用API
 * 開発環境でのみ使用してください
 */
export async function GET() {
  // 本番環境では実行しない
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { error: 'このエンドポイントは開発環境でのみ使用できます' },
      { status: 403 }
    );
  }

  const envCheck = {
    // OAuth 2.0認証情報
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID
      ? `設定済み (${process.env.GOOGLE_CLIENT_ID.substring(0, 20)}...)`
      : '❌ 未設定',
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET
      ? '設定済み (***)'
      : '❌ 未設定',
    GOOGLE_REDIRECT_URI: process.env.GOOGLE_REDIRECT_URI || '❌ 未設定',
    
    // スプレッドシートID
    SPREADSHEET_ID: process.env.SPREADSHEET_ID || '❌ 未設定',
    
    // リフレッシュトークン（オプション）
    GOOGLE_REFRESH_TOKEN: process.env.GOOGLE_REFRESH_TOKEN
      ? '設定済み'
      : '未設定（初回認証後に設定されます）',
  };

  // 必須項目のチェック
  const required = [
    'GOOGLE_CLIENT_ID',
    'GOOGLE_CLIENT_SECRET',
    'GOOGLE_REDIRECT_URI',
    'SPREADSHEET_ID',
  ];

  const missing = required.filter(
    (key) => !process.env[key]
  );

  const status = {
    allSet: missing.length === 0,
    missing: missing,
    envCheck,
  };

  return NextResponse.json(status, {
    status: missing.length === 0 ? 200 : 400,
  });
}
