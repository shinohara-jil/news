/**
 * ニュース取得とスプレッドシート保存用のAPIエンドポイント
 * 手動実行用（デモ時）
 */
import { NextResponse } from 'next/server';
import { fetchGoogleNewsRSS } from '@/lib/rss';
import { fetchOGPImage, resolveGoogleNewsUrl } from '@/lib/ogp';
import { classifyNewsCategory } from '@/lib/classify';
import { saveNewsToSheet, type NewsData } from '@/lib/sheets';
import { readNewsFromSheet } from '@/lib/sheets-read';

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
    
    // 0. 既存の記事を取得（重複チェック用）
    let existingNews: NewsData[] = [];
    try {
      existingNews = await readNewsFromSheet();
      console.log(`既存の記事: ${existingNews.length}件`);
    } catch (error) {
      console.warn('既存記事の取得に失敗（初回実行の可能性）:', error);
    }
    
    const existingLinks = new Set(
      existingNews.map((item) => item.link.trim()).filter(Boolean)
    );
    const existingTitles = new Set(
      existingNews.map((item) => item.title.trim()).filter(Boolean)
    );
    
    // 1. RSSからニュースを取得（多めに取得して、新しいものを選ぶ）
    const newsItems = await fetchGoogleNewsRSS('生成AI OR AI生成', 20);
    console.log(`${newsItems.length}件のニュースを取得しました`);
    
    // 既存記事と重複しない記事をフィルタリング
    const newNewsItems = newsItems.filter((item) => {
      // タイトルとリンクの両方で重複チェック
      const title = item.title.trim();
      const link = item.link.trim();
      return !existingTitles.has(title) && !existingLinks.has(link);
    });
    
    console.log(`重複を除いた新しい記事: ${newNewsItems.length}件`);
    
    // 最新の3件に絞る
    const itemsToProcess = newNewsItems.slice(0, 3);
    console.log(`処理する記事: ${itemsToProcess.length}件`);

    // 2. OGP画像とカテゴリを取得
    const newsData: NewsData[] = [];
    
    for (const item of itemsToProcess) {
      console.log(`処理中: ${item.title}`);
      
      // GoogleニュースのURLの場合は実際の記事URLを取得
      let actualLink = item.link;
      if (item.link.includes('news.google.com')) {
        console.log(`  GoogleニュースURLを解決中: ${item.link}`);
        actualLink = await resolveGoogleNewsUrl(item.link).catch(() => item.link);
        console.log(`  解決後のURL: ${actualLink}`);
      }
      
      // OGP画像を取得（タイムアウトを考慮して並列処理は制限）
      const ogpImage = await fetchOGPImage(actualLink).catch(() => null);
      
      // カテゴリを分類
      const category = classifyNewsCategory(item.title);

      newsData.push({
        title: item.title,
        link: actualLink, // 実際の記事URLを保存
        description: item.description,
        pubDate: item.pubDate,
        ogpImage,
        category,
      });
    }

    console.log('OGP画像とカテゴリの取得が完了しました');
    console.log(`保存予定のデータ: ${JSON.stringify(newsData.map(item => ({ title: item.title, link: item.link })), null, 2)}`);

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
