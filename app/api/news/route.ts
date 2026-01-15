/**
 * スプレッドシートからニュースデータを取得するAPIエンドポイント
 */
import { NextResponse } from 'next/server';
import { readNewsFromSheet } from '@/lib/sheets-read';

// キャッシュ設定: 30秒間キャッシュ（最新情報を優先）
export const revalidate = 30;

export async function GET() {
  try {
    // 環境変数のチェック
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.SPREADSHEET_ID) {
      return NextResponse.json(
        { error: '環境変数が設定されていません' },
        { status: 500 }
      );
    }

    const newsData = await readNewsFromSheet();

    const response = NextResponse.json({
      success: true,
      count: newsData.length,
      data: newsData,
    });

    // キャッシュヘッダーを設定（30秒間キャッシュ、最新情報を優先）
    response.headers.set('Cache-Control', 'public, s-maxage=30, stale-while-revalidate=60');

    return response;
  } catch (error) {
    console.error('エラー:', error);
    return NextResponse.json(
      {
        error: 'ニュース取得エラー',
        message: error instanceof Error ? error.message : '不明なエラー',
      },
      { status: 500 }
    );
  }
}
