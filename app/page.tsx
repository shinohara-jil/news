'use client';

import { useState, useEffect } from 'react';

interface NewsItem {
  title: string;
  link: string;
  description: string;
  pubDate: string;
  ogpImage: string | null;
  category: string;
}

export default function Home() {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fetchLoading, setFetchLoading] = useState(false);
  const [fetchResult, setFetchResult] = useState<string | null>(null);

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
        ) : news.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-600">ニュースがありません。上記の「ニュースを取得」ボタンをクリックしてください。</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {news.map((item, index) => (
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
                  <h2 className="text-lg font-bold text-gray-900 mb-2 line-clamp-2">
                    {item.title}
                  </h2>

                  {/* 説明 */}
                  {item.description && (
                    <p className="text-sm text-gray-600 mb-3 line-clamp-3">
                      {item.description}
                    </p>
                  )}

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
