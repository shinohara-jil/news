/**
 * RSS取得とパース用のユーティリティ
 */

export interface NewsItem {
  title: string;
  link: string;
  description: string;
  pubDate: string;
}

/**
 * GoogleニュースRSSから記事を取得
 * @param query 検索クエリ（例: "生成AI"）
 * @param maxResults 最大取得件数
 */
export async function fetchGoogleNewsRSS(
  query: string,
  maxResults: number = 20
): Promise<NewsItem[]> {
  // GoogleニュースRSSのURL（日本語版）
  // when=1d: 過去24時間の記事に絞る（最新記事を優先）
  const rssUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(
    query
  )}&hl=ja&gl=JP&ceid=JP:ja&when=1d`;

  try {
    const response = await fetch(rssUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
      cache: 'no-store', // キャッシュを無視して最新データを取得
    });

    if (!response.ok) {
      throw new Error(`RSS取得エラー: ${response.status}`);
    }

    const xmlText = await response.text();
    const items = parseRSSXML(xmlText);

    // 日付でソート（新しい順）
    items.sort((a, b) => {
      const dateA = new Date(a.pubDate).getTime();
      const dateB = new Date(b.pubDate).getTime();
      return dateB - dateA; // 新しい順
    });

    return items.slice(0, maxResults);
  } catch (error) {
    console.error('RSS取得エラー:', error);
    throw error;
  }
}

/**
 * RSS XMLをパースして記事リストを取得
 */
function parseRSSXML(xmlText: string): NewsItem[] {
  const items: NewsItem[] = [];
  
  // 簡易的なXMLパース（正規表現を使用）
  // より堅牢な実装にはxml2jsなどのライブラリを使用することを推奨
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match;

  while ((match = itemRegex.exec(xmlText)) !== null) {
    const itemXml = match[1];
    
    const titleMatch = itemXml.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>|<title>(.*?)<\/title>/);
    const linkMatch = itemXml.match(/<link>(.*?)<\/link>/);
    const descriptionMatch = itemXml.match(/<description><!\[CDATA\[(.*?)\]\]><\/description>|<description>(.*?)<\/description>/);
    const pubDateMatch = itemXml.match(/<pubDate>(.*?)<\/pubDate>/);

    if (titleMatch && linkMatch) {
      items.push({
        title: (titleMatch[1] || titleMatch[2] || '').trim(),
        link: linkMatch[1].trim(),
        description: (descriptionMatch?.[1] || descriptionMatch?.[2] || '').trim(),
        pubDate: pubDateMatch?.[1]?.trim() || new Date().toISOString(),
      });
    }
  }

  return items;
}
