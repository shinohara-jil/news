/**
 * Gemini API（Nano Banana）で画像生成するユーティリティ
 * REST APIを直接使用
 */

/**
 * Gemini APIで画像を生成（リトライロジック付き）
 * @param title 記事のタイトル
 * @param maxRetries 最大リトライ回数（デフォルト: 3）
 * @returns 生成された画像のbase64データ（PNG形式）
 */
export async function generateImageWithGemini(
  title: string,
  maxRetries: number = 3
): Promise<string | null> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error('GEMINI_API_KEYが設定されていません');
  }

  const prompt = `「${title}」のニュース記事のトップページに載せるのにふさわしい画像を、手書き風のイラストで作成してください。日本語の文字等は入れないこと。`;

  // Gemini API v1beta エンドポイント
  // 公式ドキュメント: https://ai.google.dev/gemini-api/docs/image-generation
  // v1betaを使用（v1ではモデルが見つからない）
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${apiKey}`;

  // 公式ドキュメントに基づいたリクエスト形式
  // gemini-2.5-flash-imageではimageSizeは不要（固定で1024px）
  // gemini-3-pro-image-previewでのみimageSizeを指定可能
  const requestBody = {
    contents: [{
      parts: [{
        text: prompt,
      }],
    }],
    generationConfig: {
      imageConfig: {
        aspectRatio: '16:9',
        // imageSizeはgemini-2.5-flash-imageでは使用不可
      },
    },
  };

  // リトライロジック
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      if (attempt > 0) {
        // リトライ前の待機時間（指数バックオフ）
        const waitTime = Math.min(1000 * Math.pow(2, attempt - 1), 30000); // 最大30秒
        console.log(`⏳ リトライ前の待機: ${waitTime}ms (試行 ${attempt + 1}/${maxRetries + 1})`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }

      // デバッグ: リクエスト情報を表示
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`📤 Gemini API リクエスト送信 (試行 ${attempt + 1}/${maxRetries + 1})`);
      console.log('URL:', url.replace(apiKey, '***'));
      console.log('プロンプト:', prompt.substring(0, 100) + '...');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      // 429エラー（レート制限）の特別処理
      if (response.status === 429) {
        const errorText = await response.text();
        console.warn('⚠️ レート制限エラー (429) が発生しました');
        
        // Retry-Afterヘッダーを確認
        const retryAfter = response.headers.get('Retry-After');
        if (retryAfter) {
          const waitSeconds = parseInt(retryAfter, 10);
          console.log(`⏳ Retry-Afterヘッダーに基づいて ${waitSeconds}秒待機します`);
          await new Promise(resolve => setTimeout(resolve, waitSeconds * 1000));
        }

        // 最後の試行でなければリトライ
        if (attempt < maxRetries) {
          console.log(`🔄 リトライします...`);
          continue;
        } else {
          console.error('❌ 最大リトライ回数に達しました。画像生成をスキップします。');
          return null;
        }
      }

      if (!response.ok) {
        const errorText = await response.text();
        console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.error('❌ Gemini API エラーレスポンス');
        console.error('ステータス:', response.status, response.statusText);
        console.error('エラー内容:', errorText);
        console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        
        // 5xxエラーの場合はリトライ
        if (response.status >= 500 && attempt < maxRetries) {
          console.log(`🔄 サーバーエラーのためリトライします...`);
          continue;
        }
        
        throw new Error(`Gemini API エラー: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('📥 Gemini API レスポンス受信');
      console.log('レスポンス構造:', JSON.stringify(data, null, 2).substring(0, 1000));
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

      // レスポンスから画像データを取得
      if (data.candidates && data.candidates[0] && data.candidates[0].content) {
        console.log('レスポンスのparts:', data.candidates[0].content.parts);
        for (const part of data.candidates[0].content.parts) {
          if (part.inlineData && part.inlineData.data) {
            console.log('✓ 画像データを取得しました（長さ:', part.inlineData.data.length, ')');
            return part.inlineData.data; // base64データ
          }
        }
        console.warn('画像データが見つかりませんでした');
      } else {
        console.warn('レスポンスにcandidatesがありません:', data);
      }

      return null;
    } catch (error) {
      // ネットワークエラーなどの場合はリトライ
      if (attempt < maxRetries && error instanceof Error) {
        console.warn(`⚠️ エラーが発生しました: ${error.message}`);
        console.log(`🔄 リトライします...`);
        continue;
      }
      
      // 最後の試行でもエラーが発生した場合
      console.error('❌ Gemini画像生成エラー:', error);
      throw error;
    }
  }

  return null;
}
