/**
 * スプレッドシートからニュースデータを取得するAPIエンドポイント
 */
import { NextResponse } from 'next/server';
import { readNewsFromSheet } from '@/lib/sheets-read';

// キャッシュ設定: 60秒間キャッシュ（本番環境では効果的）
export const revalidate = 60;

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

    // キャッシュヘッダーを設定（60秒間キャッシュ）
    response.headers.set('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');

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
