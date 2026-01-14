/**
 * スプレッドシートからニュースデータを取得するAPIエンドポイント
 */
import { NextResponse } from 'next/server';
import { readNewsFromSheet } from '@/lib/sheets-read';

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

    return NextResponse.json({
      success: true,
      count: newsData.length,
      data: newsData,
    });
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
