/**
 * OGP画像抽出用のユーティリティ
 */
import * as cheerio from 'cheerio';

/**
 * Googleニュースのリンクから実際の記事URLを抽出
 * @param url GoogleニュースのURL
 * @returns 実際の記事URL、取得できない場合は元のURL
 */
export async function resolveGoogleNewsUrl(url: string): Promise<string> {
  // GoogleニュースのURLでない場合はそのまま返す
  if (!url.includes('news.google.com')) {
    return url;
  }

  try {
    // HTMLを取得して実際の記事URLを探す
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });

    if (!response.ok) {
      return url;
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // Googleニュースのページ内から実際の記事URLを探す
    // 通常、articleタグやaタグに実際のURLが含まれている
    const articleLink = $('article a[href^="http"]').first().attr('href') ||
                        $('a[href^="http"]:not([href*="google.com"])').first().attr('href') ||
                        $('c-wiz a[href^="http"]').first().attr('href');

    if (articleLink && !articleLink.includes('news.google.com')) {
      return articleLink;
    }

    // メタタグからURLを取得
    const metaUrl = $('meta[property="og:url"]').attr('content');
    if (metaUrl && !metaUrl.includes('news.google.com')) {
      return metaUrl;
    }

    // 見つからない場合は元のURLを返す
    return url;
  } catch (error) {
    console.warn(`GoogleニュースURL解決エラー (${url}):`, error);
    return url;
  }
}

/**
 * 記事のURLからOGP画像を取得
 * @param url 記事のURL
 * @returns OGP画像のURL、取得できない場合はnull
 */
export async function fetchOGPImage(url: string): Promise<string | null> {
  try {
    // GoogleニュースのURLの場合は実際の記事URLを取得
    const finalUrl = await resolveGoogleNewsUrl(url);
    
    // Googleの画像URLやニュースページのURLの場合はスキップ
    if (finalUrl.includes('googleusercontent.com') || 
        (finalUrl.includes('google.com') && finalUrl.includes('news.google.com'))) {
      console.warn(`GoogleのURLをスキップ: ${finalUrl}`);
      return null;
    }

    const response = await fetch(finalUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });

    if (!response.ok) {
      console.warn(`OGP画像取得エラー (${finalUrl}): ${response.status}`);
      return null;
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // og:imageを優先的に取得
    const ogImage = $('meta[property="og:image"]').attr('content') ||
                    $('meta[name="og:image"]').attr('content');

    if (ogImage) {
      // Googleの画像URLの場合はスキップ
      if (ogImage.includes('googleusercontent.com') || ogImage.includes('google.com')) {
        console.warn(`GoogleのOGP画像をスキップ: ${ogImage}`);
        // 次の方法を試す
      } else {
        // 相対URLの場合は絶対URLに変換
        if (ogImage.startsWith('http://') || ogImage.startsWith('https://')) {
          return ogImage;
        } else {
          const baseUrl = new URL(finalUrl);
          return new URL(ogImage, baseUrl.origin).toString();
        }
      }
    }

    // og:imageがない場合、twitter:imageを試す
    const twitterImage = $('meta[name="twitter:image"]').attr('content') ||
                         $('meta[property="twitter:image"]').attr('content');

    if (twitterImage) {
      // Googleの画像URLの場合はスキップ
      if (twitterImage.includes('googleusercontent.com') || twitterImage.includes('google.com')) {
        console.warn(`GoogleのTwitter画像をスキップ: ${twitterImage}`);
      } else {
        if (twitterImage.startsWith('http://') || twitterImage.startsWith('https://')) {
          return twitterImage;
        } else {
          const baseUrl = new URL(finalUrl);
          return new URL(twitterImage, baseUrl.origin).toString();
        }
      }
    }

    // その他の画像タグを試す（imgタグの最初の画像など）
    const firstImage = $('article img, .article img, main img').first().attr('src');
    if (firstImage) {
      if (firstImage.startsWith('http://') || firstImage.startsWith('https://')) {
        // Googleの画像URLの場合はスキップ
        if (!firstImage.includes('googleusercontent.com') && !firstImage.includes('google.com')) {
          return firstImage;
        }
      } else {
        const baseUrl = new URL(finalUrl);
        const absoluteImageUrl = new URL(firstImage, baseUrl.origin).toString();
        if (!absoluteImageUrl.includes('googleusercontent.com') && !absoluteImageUrl.includes('google.com')) {
          return absoluteImageUrl;
        }
      }
    }

    return null;
  } catch (error) {
    console.error(`OGP画像取得エラー (${url}):`, error);
    return null;
  }
}
