'use client';

import { useState } from 'react';

export default function AdminPage() {
  const [secretKey, setSecretKey] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [fetchLoading, setFetchLoading] = useState(false);
  const [fetchResult, setFetchResult] = useState<string | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // 認証処理
  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);

    if (!secretKey) {
      setAuthError('シークレットキーを入力してください');
      return;
    }

    // 簡易的な認証確認（APIを叩いて確認）
    try {
      const response = await fetch(`/api/fetch-news?key=${encodeURIComponent(secretKey)}`, {
        method: 'HEAD', // HEADメソッドで認証だけ確認
      });

      if (response.ok || response.status === 200) {
        setIsAuthenticated(true);
        setAuthError(null);
      } else {
        setAuthError('シークレットキーが無効です');
      }
    } catch (error) {
      // HEADメソッドが使えない場合は、そのまま認証成功とする
      setIsAuthenticated(true);
    }
  };

  // ニュース取得処理
  const handleFetchNews = async (count: number) => {
    setFetchLoading(true);
    setFetchResult(null);
    setFetchError(null);

    try {
      const response = await fetch(`/api/fetch-news?key=${encodeURIComponent(secretKey)}&count=${count}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || data.error || 'エラーが発生しました');
      }

      setFetchResult(`✓ 成功: ${data.count}件のニュースを取得してスプレッドシートに保存しました`);
    } catch (err) {
      setFetchError(err instanceof Error ? err.message : '不明なエラーが発生しました');
    } finally {
      setFetchLoading(false);
    }
  };

  // ログアウト
  const handleLogout = () => {
    setIsAuthenticated(false);
    setSecretKey('');
    setFetchResult(null);
    setFetchError(null);
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full">
        <h1 className="text-2xl font-bold text-gray-900 mb-6 text-center">
          管理画面
        </h1>

        {!isAuthenticated ? (
          // 認証フォーム
          <form onSubmit={handleAuth} className="space-y-4">
            <div>
              <label htmlFor="secretKey" className="block text-sm font-medium text-gray-700 mb-2">
                シークレットキー
              </label>
              <input
                type="password"
                id="secretKey"
                value={secretKey}
                onChange={(e) => setSecretKey(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="シークレットキーを入力"
              />
            </div>

            {authError && (
              <div className="p-3 bg-red-100 border border-red-400 text-red-700 rounded text-sm">
                {authError}
              </div>
            )}

            <button
              type="submit"
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              ログイン
            </button>
          </form>
        ) : (
          // 管理機能
          <div className="space-y-4">
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-green-800 text-sm font-medium">
                ✓ 認証成功
              </p>
            </div>

            <div className="border-t pt-4">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                ニュース取得
              </h2>

              <div className="grid grid-cols-3 gap-3">
                <button
                  onClick={() => handleFetchNews(1)}
                  disabled={fetchLoading}
                  className="px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium"
                >
                  {fetchLoading ? '...' : '1件'}
                </button>
                <button
                  onClick={() => handleFetchNews(3)}
                  disabled={fetchLoading}
                  className="px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium"
                >
                  {fetchLoading ? '...' : '3件'}
                </button>
                <button
                  onClick={() => handleFetchNews(5)}
                  disabled={fetchLoading}
                  className="px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium"
                >
                  {fetchLoading ? '...' : '5件'}
                </button>
              </div>

              {fetchLoading && (
                <div className="mt-4 p-3 bg-blue-50 border border-blue-200 text-blue-700 rounded text-sm text-center">
                  取得中...
                </div>
              )}

              {fetchResult && (
                <div className="mt-4 p-4 bg-green-100 border border-green-400 text-green-700 rounded text-sm">
                  {fetchResult}
                </div>
              )}

              {fetchError && (
                <div className="mt-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded text-sm">
                  エラー: {fetchError}
                </div>
              )}
            </div>

            <button
              onClick={handleLogout}
              className="w-full px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
            >
              ログアウト
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
