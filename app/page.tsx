'use client';

import { useState, useEffect, useMemo } from 'react';

interface NewsItem {
  title: string;
  link: string;
  description: string;
  pubDate: string;
  ogpImage: string | null;
  category: string;
}

type SortByCategory = 'all' | '言語生成AI' | '画像生成AI' | '動画生成AI' | 'その他';
type SortByWeek = 'all' | '今週' | '先週' | '2週間前' | '3週間前' | 'それ以前';

export default function Home() {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fetchLoading, setFetchLoading] = useState(false);
  const [fetchResult, setFetchResult] = useState<string | null>(null);
  const [sortByCategory, setSortByCategory] = useState<SortByCategory>('all');
  const [sortByWeek, setSortByWeek] = useState<SortByWeek>('all');

  // ニュースデータを取得
  useEffect(() => {
    loadNews();
  }, []);

  const loadNews = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/news');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'エラーが発生しました');
      }

      setNews(data.data || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : '不明なエラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  const handleFetchNews = async () => {
    setFetchLoading(true);
    setFetchResult(null);
    setError(null);

    try {
      const response = await fetch('/api/fetch-news');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'エラーが発生しました');
      }

      setFetchResult(`成功: ${data.count}件のニュースを取得してスプレッドシートに保存しました`);
      // データを再読み込み
      await loadNews();
    } catch (err) {
      setError(err instanceof Error ? err.message : '不明なエラーが発生しました');
    } finally {
      setFetchLoading(false);
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case '言語生成AI':
        return 'bg-blue-100 text-blue-800';
      case '画像生成AI':
        return 'bg-purple-100 text-purple-800';
      case '動画生成AI':
        return 'bg-pink-100 text-pink-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('ja-JP', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return dateString;
    }
  };

  // 週単位の分類を取得
  const getWeekCategory = (dateString: string): SortByWeek => {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffTime = now.getTime() - date.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays < 0) return '今週'; // 未来の日付
      if (diffDays <= 7) return '今週';
      if (diffDays <= 14) return '先週';
      if (diffDays <= 21) return '2週間前';
      if (diffDays <= 28) return '3週間前';
      return 'それ以前';
    } catch {
      return 'それ以前';
    }
  };

  // フィルタリングとソート
  const filteredNews = useMemo(() => {
    let filtered = [...news];

    // カテゴリでフィルタ
    if (sortByCategory !== 'all') {
      filtered = filtered.filter((item) => item.category === sortByCategory);
    }

    // 週でフィルタ
    if (sortByWeek !== 'all') {
      filtered = filtered.filter((item) => getWeekCategory(item.pubDate) === sortByWeek);
    }

    // 日付でソート（新しい順）
    filtered.sort((a, b) => {
      const dateA = new Date(a.pubDate).getTime();
      const dateB = new Date(b.pubDate).getTime();
      return dateB - dateA;
    });

    return filtered;
  }, [news, sortByCategory, sortByWeek]);

  return (
    <main className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold text-gray-900">
              生成AIニュースキュレーション
            </h1>
            <button
              onClick={handleFetchNews}
              disabled={fetchLoading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {fetchLoading ? '取得中...' : 'ニュースを取得'}
            </button>
          </div>
          {fetchResult && (
            <div className="mt-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded text-sm">
              {fetchResult}
            </div>
          )}
        </div>
      </header>

      {/* ソートフィルター */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700">タグ:</label>
              <select
                value={sortByCategory}
                onChange={(e) => setSortByCategory(e.target.value as SortByCategory)}
                className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">すべて</option>
                <option value="言語生成AI">言語生成AI</option>
                <option value="画像生成AI">画像生成AI</option>
                <option value="動画生成AI">動画生成AI</option>
                <option value="その他">その他</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700">公開タイミング:</label>
              <select
                value={sortByWeek}
                onChange={(e) => setSortByWeek(e.target.value as SortByWeek)}
                className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">すべて</option>
                <option value="今週">今週</option>
                <option value="先週">先週</option>
                <option value="2週間前">2週間前</option>
                <option value="3週間前">3週間前</option>
                <option value="それ以前">それ以前</option>
              </select>
            </div>

            <div className="text-sm text-gray-500">
              {filteredNews.length}件表示
            </div>
          </div>
        </div>
      </div>

      {/* メインコンテンツ */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-4 text-gray-600">読み込み中...</p>
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <div className="p-4 bg-red-100 border border-red-400 text-red-700 rounded">
              エラー: {error}
            </div>
          </div>
        ) : filteredNews.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-600">該当するニュースがありません。</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredNews.map((item, index) => (
              <a
                key={index}
                href={item.link}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow overflow-hidden"
              >
                {/* 画像 */}
                {item.ogpImage && !item.ogpImage.includes('googleusercontent.com') ? (
                  <div className="w-full h-48 bg-gray-200 overflow-hidden">
                    <img
                      src={item.ogpImage}
                      alt={item.title}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                        (e.target as HTMLImageElement).parentElement!.classList.add('bg-gradient-to-br', 'from-blue-400', 'to-purple-500', 'flex', 'items-center', 'justify-center');
                        (e.target as HTMLImageElement).parentElement!.innerHTML = '<span class="text-white text-4xl">📰</span>';
                      }}
                    />
                  </div>
                ) : (
                  <div className="w-full h-48 bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center">
                    <span className="text-white text-4xl">📰</span>
                  </div>
                )}

                {/* カード内容 */}
                <div className="p-5">
                  {/* カテゴリ */}
                  <div className="mb-3">
                    <span className={`inline-block px-2 py-1 rounded-full text-xs font-semibold ${getCategoryColor(item.category)}`}>
                      {item.category}
                    </span>
                  </div>

                  {/* タイトル */}
                  <h2 className="text-lg font-bold text-gray-900 mb-3 line-clamp-2">
                    {item.title}
                  </h2>

                  {/* 日付 */}
                  <div className="flex items-center text-xs text-gray-500">
                    <span>📅</span>
                    <span className="ml-1">{formatDate(item.pubDate)}</span>
                  </div>
                </div>
              </a>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
