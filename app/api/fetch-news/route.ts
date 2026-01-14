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
import { generateImageWithGemini } from '@/lib/gemini';
import { uploadImageToDrive } from '@/lib/drive';

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

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { error: 'GEMINI_API_KEYが設定されていません' },
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
    
    // 新しい記事がない場合、テスト用に既存記事を1件選んで画像生成を試す
    let itemsToProcess: typeof newsItems = [];
    let isTestMode = false;
    if (newNewsItems.length === 0) {
      console.log('⚠️ 新しい記事がないため、テスト用に既存記事を1件選んで画像生成を試します');
      // 既存記事から1件選ぶ（最新のもの）
      if (existingNews.length > 0) {
        const testItem = existingNews[0];
        // RSSから取得した記事の形式に変換
        itemsToProcess = [{
          title: testItem.title,
          link: testItem.link,
          description: testItem.description,
          pubDate: testItem.pubDate,
        }];
        isTestMode = true;
        console.log(`テスト用記事: ${testItem.title}`);
        console.log('⚠️ テストモード: 画像生成のみ実行し、スプレッドシートには保存しません');
      }
    } else {
      // 最新の3件に絞る
      itemsToProcess = newNewsItems.slice(0, 3);
    }
    
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
      
      // カテゴリを分類
      const category = classifyNewsCategory(item.title);

      // Gemini APIで画像を生成（優先）
      let generatedImageUrl: string | null = null;
      try {
        console.log(`\n========== 画像生成開始: ${item.title} ==========`);
        const imageData = await generateImageWithGemini(item.title);
        
        if (imageData) {
          console.log(`✓ 画像データ取得成功（base64長: ${imageData.length}）`);
          // ファイル名を生成（タイトルから安全なファイル名を作成）
          const safeFileName = item.title
            .replace(/[^a-zA-Z0-9\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/g, '_')
            .substring(0, 50) + '_' + Date.now() + '.png';
          
          console.log(`→ Google Driveにアップロード中: ${safeFileName}`);
          // Google Driveにアップロード
          generatedImageUrl = await uploadImageToDrive(imageData, safeFileName);
          console.log(`✓ 画像生成・アップロード成功: ${generatedImageUrl}`);
          console.log(`========== 画像生成完了 ==========\n`);
        } else {
          console.warn(`✗ 画像データがnullでした`);
          console.log(`========== 画像生成失敗（null） ==========\n`);
        }
      } catch (error) {
        console.error(`\n✗✗✗ 画像生成エラー ✗✗✗`);
        console.error(`記事タイトル: ${item.title}`);
        if (error instanceof Error) {
          console.error(`エラーメッセージ: ${error.message}`);
          // スタックトレースは最初の数行だけ表示
          if (error.stack) {
            const stackLines = error.stack.split('\n').slice(0, 3);
            console.error(`エラー位置: ${stackLines.join('\n')}`);
          }
        } else {
          console.error(`エラーオブジェクト:`, error);
        }
        console.error(`→ OGP画像を取得します`);
        console.error(`========== 画像生成エラー終了 ==========\n`);
      }

      // 生成画像が取得できなかった場合のみ、OGP画像を取得（フォールバック）
      let finalImageUrl: string | null = generatedImageUrl;
      if (!finalImageUrl) {
        console.log(`  OGP画像を取得中（フォールバック）...`);
        finalImageUrl = await fetchOGPImage(actualLink).catch(() => null);
        if (finalImageUrl) {
          console.log(`  ✓ OGP画像を取得しました`);
        } else {
          console.log(`  ✗ OGP画像も取得できませんでした`);
        }
      }

      newsData.push({
        title: item.title,
        link: actualLink, // 実際の記事URLを保存
        description: item.description,
        pubDate: item.pubDate,
        ogpImage: finalImageUrl,
        category,
      });
    }

    console.log('OGP画像とカテゴリの取得が完了しました');
    console.log(`保存予定のデータ: ${JSON.stringify(newsData.map(item => ({ title: item.title, link: item.link, image: item.ogpImage ? 'あり' : 'なし' })), null, 2)}`);

    // 3. スプレッドシートに保存（テストモードの場合はスキップ）
    if (!isTestMode && newsData.length > 0) {
      await saveNewsToSheet(newsData);
      console.log('スプレッドシートへの保存が完了しました');
    } else if (isTestMode) {
      console.log('⚠️ テストモードのため、スプレッドシートには保存しませんでした');
    }

    return NextResponse.json({
      success: true,
      message: 'ニュースの取得と保存が完了しました',
      count: newsData.length,
      data: newsData,
      debug: {
        generatedImages: newsData.filter(item => item.ogpImage && !item.ogpImage.includes('googleusercontent.com')).length,
        totalImages: newsData.filter(item => item.ogpImage).length,
      },
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
