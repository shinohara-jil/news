/**
 * ニュース取得とスプレッドシート保存用のAPIエンドポイント
 * 手動実行用（デモ時）
 */
import { NextResponse } from 'next/server';
import { fetchGoogleNewsRSS } from '@/lib/rss';
import { fetchOGPImage } from '@/lib/ogp';
import { classifyNewsCategory } from '@/lib/classify';
import { saveNewsToSheet, type NewsData } from '@/lib/sheets';

export const maxDuration = 300; // 5分（Vercelの制限）

export async function GET() {
  try {
    // 環境変数のチェック
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.SPREADSHEET_ID) {
      return NextResponse.json(
        { error: '環境変数が設定されていません' },
        { status: 500 }
      );
    }

    console.log('ニュース取得を開始...');
    
    // 1. RSSからニュースを取得
    const newsItems = await fetchGoogleNewsRSS('生成AI OR AI生成', 20);
    console.log(`${newsItems.length}件のニュースを取得しました`);

    // 2. OGP画像とカテゴリを取得
    const newsData: NewsData[] = [];
    
    for (const item of newsItems) {
      console.log(`処理中: ${item.title}`);
      
      // OGP画像を取得（タイムアウトを考慮して並列処理は制限）
      const ogpImage = await fetchOGPImage(item.link).catch(() => null);
      
      // カテゴリを分類
      const category = classifyNewsCategory(item.title);

      newsData.push({
        title: item.title,
        link: item.link,
        description: item.description,
        pubDate: item.pubDate,
        ogpImage,
        category,
      });
    }

    console.log('OGP画像とカテゴリの取得が完了しました');

    // 3. スプレッドシートに保存
    await saveNewsToSheet(newsData);
    console.log('スプレッドシートへの保存が完了しました');

    return NextResponse.json({
      success: true,
      message: 'ニュースの取得と保存が完了しました',
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
