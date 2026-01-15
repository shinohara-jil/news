'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';

// ニュースカードコンポーネント（画像エラー処理用）
function NewsCard({ item, index }: { item: NewsItem; index: number }) {
  const [imageError, setImageError] = useState(false);
  
  // エラーハンドラーをメモ化（複数回呼ばれるのを防ぐ）
  const handleImageError = useCallback(() => {
    setImageError(true);
  }, []);
  
  // ソースをURLから抽出
  const getSource = (url: string) => {
    try {
      const urlObj = new URL(url);
      const hostname = urlObj.hostname.replace('www.', '');
      // 主要なニュースサイトのドメインを整理
      if (hostname.includes('techcrunch')) return 'TechCrunch';
      if (hostname.includes('theverge')) return 'The Verge';
      if (hostname.includes('wired')) return 'WIRED';
      if (hostname.includes('reuters')) return 'Reuters';
      if (hostname.includes('bloomberg')) return 'Bloomberg';
      if (hostname.includes('nikkei')) return '日経新聞';
      if (hostname.includes('asahi')) return '朝日新聞';
      if (hostname.includes('yomiuri')) return '読売新聞';
      if (hostname.includes('mainichi')) return '毎日新聞';
      // ドメイン名をそのまま返す（最初の部分のみ）
      return hostname.split('.')[0].charAt(0).toUpperCase() + hostname.split('.')[0].slice(1);
    } catch {
      return 'ニュース';
    }
  };

  // カテゴリの色を取得
  const getCategoryColor = (category: string) => {
    switch (category) {
      case '調査・記事系':
        return 'bg-blue-100 text-blue-800';
      case '新規サービス系':
        return 'bg-green-100 text-green-800';
      case '顧客事例系':
        return 'bg-purple-100 text-purple-800';
      case 'リスク系':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // 日付をフォーマット
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
    <a
      href={item.link}
      target="_blank"
      rel="noopener noreferrer"
      className="bg-white rounded-lg shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden border border-gray-100 hover:border-gray-200 group"
    >
      {/* 画像 */}
      {item.ogpImage && !imageError ? (
        <div className="w-full h-48 bg-gray-200 overflow-hidden">
          <img
            src={item.ogpImage}
            alt={item.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading={index < 3 ? "eager" : "lazy"}
            fetchPriority={index < 3 ? "high" : "low"}
            decoding="async"
            onError={handleImageError}
          />
        </div>
      ) : (
        <div className="w-full h-48 bg-gray-300 flex items-center justify-center">
          <span className="text-gray-600 text-lg font-medium">no image</span>
        </div>
      )}

      {/* カード内容 */}
      <div className="p-5">
        {/* カテゴリ */}
        <div className="mb-3">
          <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold ${getCategoryColor(item.category)}`}>
            {item.category}
          </span>
        </div>

        {/* タイトル */}
        <h2 className="text-base font-bold text-gray-900 mb-4 line-clamp-3 leading-relaxed group-hover:text-blue-600 transition-colors duration-200">
          {item.title}
        </h2>

        {/* ソースと日付 */}
        <div className="flex items-center justify-between pt-3 border-t border-gray-100">
          <span className="text-xs font-semibold text-gray-700">
            {getSource(item.link)}
          </span>
          <span className="text-xs text-gray-500">
            {formatDate(item.pubDate)}
          </span>
        </div>
      </div>
    </a>
  );
}

interface NewsItem {
  title: string;
  link: string;
  description: string;
  pubDate: string;
  ogpImage: string | null;
  category: string;
}

type SortByCategory = 
  | 'all' 
  | '調査・記事系' 
  | '新規サービス系' 
  | '顧客事例系' 
  | 'リスク系';
type SortByWeek = 'all' | '1日以内' | '今週' | '先週' | '2週間前' | '3週間前' | 'それ以前';

export default function Home() {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortByCategory, setSortByCategory] = useState<SortByCategory>('all');
  const [sortByWeek, setSortByWeek] = useState<SortByWeek>('all');

  // ニュースデータを取得
  useEffect(() => {
    loadNews();
    
    // 30秒ごとに最新データを取得
    const interval = setInterval(() => {
      loadNews(true); // キャッシュを無視して最新データを取得
    }, 30 * 1000); // 30秒

    // ページがフォーカスされた時に最新データを取得
    const handleFocus = () => {
      loadNews(true);
    };
    window.addEventListener('focus', handleFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  const loadNews = async (forceRefresh = false) => {
    try {
      // 強制リフレッシュ時のみローディング表示
      if (forceRefresh) {
        setLoading(true);
      }
      
      // キャッシュの確認（30秒間有効）
      const CACHE_KEY = 'news_cache';
      const CACHE_TIMESTAMP_KEY = 'news_cache_timestamp';
      const CACHE_DURATION = 30 * 1000; // 30秒

      if (!forceRefresh && typeof window !== 'undefined') {
        const cachedData = localStorage.getItem(CACHE_KEY);
        const cachedTimestamp = localStorage.getItem(CACHE_TIMESTAMP_KEY);
        
        if (cachedData && cachedTimestamp) {
          const timestamp = parseInt(cachedTimestamp, 10);
          const now = Date.now();
          
          if (now - timestamp < CACHE_DURATION) {
            // キャッシュが有効な場合、即座に表示
            setNews(JSON.parse(cachedData));
            setError(null);
            setLoading(false);
            
            // バックグラウンドで最新データを取得（キャッシュを無視）
            fetch('/api/news', {
              cache: 'no-store',
            })
              .then(res => res.json())
              .then(data => {
                if (data.success && data.data) {
                  localStorage.setItem(CACHE_KEY, JSON.stringify(data.data));
                  localStorage.setItem(CACHE_TIMESTAMP_KEY, Date.now().toString());
                  setNews(data.data);
                }
              })
              .catch(() => {
                // バックグラウンド更新の失敗は無視
              });
            return;
          }
        }
      }

      // キャッシュがない、または期限切れの場合、APIから取得（常にキャッシュを無視）
      const response = await fetch('/api/news', {
        cache: 'no-store', // 常に最新データを取得
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'エラーが発生しました');
      }

      const newsData = data.data || [];
      setNews(newsData);
      setError(null);

      // キャッシュに保存
      if (typeof window !== 'undefined') {
        localStorage.setItem(CACHE_KEY, JSON.stringify(newsData));
        localStorage.setItem(CACHE_TIMESTAMP_KEY, Date.now().toString());
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '不明なエラーが発生しました');
      
      // エラー時はキャッシュから読み込む（フォールバック）
      if (typeof window !== 'undefined') {
        const cachedData = localStorage.getItem('news_cache');
        if (cachedData) {
          setNews(JSON.parse(cachedData));
        }
      }
    } finally {
      setLoading(false);
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
      case '新規企業向けサービス':
        return 'bg-green-100 text-green-800';
      case '新規BtoCサービス':
        return 'bg-yellow-100 text-yellow-800';
      case 'HRサービス':
        return 'bg-indigo-100 text-indigo-800';
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

      if (diffDays < 0) return '1日以内'; // 未来の日付は1日以内として扱う
      if (diffDays <= 1) return '1日以内';
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

  const [heroImageError, setHeroImageError] = useState(false);

  return (
    <main className="min-h-screen bg-gray-50">
      {/* ヒーロー画像（16:9フルスクリーン） */}
      {!heroImageError ? (
        <div className="relative w-full aspect-[16/9] overflow-hidden">
          <img
            src="/hero-image.png"
            alt="GENERATIVE AI CURATION MEDIA"
            className="w-full h-full object-cover"
            onError={() => {
              setHeroImageError(true);
            }}
          />
        </div>
      ) : (
        <div className="relative w-full aspect-[16/9] overflow-hidden bg-gradient-to-br from-orange-200 via-orange-400 to-orange-600 flex items-center justify-center">
          <div className="text-white text-4xl md:text-6xl font-bold text-center px-4">
            GENERATIVE AI<br/>CURATION MEDIA
          </div>
        </div>
      )}

      {/* ソートフィルター */}
      <div className="bg-white border-b shadow-md sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
          <div className="flex flex-wrap gap-6 items-center">
            <div className="flex items-center gap-3">
              <label className="text-base font-bold text-gray-800">タグ:</label>
              <select
                value={sortByCategory}
                onChange={(e) => setSortByCategory(e.target.value as SortByCategory)}
                className="px-4 py-2 border-2 border-gray-300 rounded-lg text-base font-medium bg-white hover:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors cursor-pointer"
              >
                <option value="all">すべて</option>
                <option value="調査・記事系">調査・記事系</option>
                <option value="新規サービス系">新規サービス系</option>
                <option value="顧客事例系">顧客事例系</option>
                <option value="リスク系">リスク系</option>
              </select>
            </div>

            <div className="flex items-center gap-3">
              <label className="text-base font-bold text-gray-800">公開タイミング:</label>
              <select
                value={sortByWeek}
                onChange={(e) => setSortByWeek(e.target.value as SortByWeek)}
                className="px-4 py-2 border-2 border-gray-300 rounded-lg text-base font-medium bg-white hover:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors cursor-pointer"
              >
                <option value="all">すべて</option>
                <option value="1日以内">1日以内</option>
                <option value="今週">今週</option>
                <option value="先週">先週</option>
                <option value="2週間前">2週間前</option>
                <option value="3週間前">3週間前</option>
                <option value="それ以前">それ以前</option>
              </select>
            </div>

            <div className="text-base font-semibold text-gray-700 ml-auto">
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
              <NewsCard key={item.link || index} item={item} index={index} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
