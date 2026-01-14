/**
 * Gemini API（Nano Banana）で画像生成するユーティリティ
 * REST APIを直接使用
 */

/**
 * Gemini APIで画像を生成
 * @param title 記事のタイトル
 * @returns 生成された画像のbase64データ（PNG形式）
 */
export async function generateImageWithGemini(title: string): Promise<string | null> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error('GEMINI_API_KEYが設定されていません');
  }

  try {
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

    // デバッグ: リクエスト情報を表示
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📤 Gemini API リクエスト送信');
    console.log('URL:', url.replace(apiKey, '***'));
    console.log('プロンプト:', prompt.substring(0, 100) + '...');
    console.log('リクエストボディ:', JSON.stringify(requestBody, null, 2));
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.error('❌ Gemini API エラーレスポンス');
      console.error('ステータス:', response.status, response.statusText);
      console.error('エラー内容:', errorText);
      console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
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
          console.log('画像データを取得しました（長さ:', part.inlineData.data.length, ')');
          return part.inlineData.data; // base64データ
        }
      }
      console.warn('画像データが見つかりませんでした');
    } else {
      console.warn('レスポンスにcandidatesがありません:', data);
    }

    return null;
  } catch (error) {
    console.error('Gemini画像生成エラー:', error);
    throw error;
  }
}
