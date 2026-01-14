/**
 * タグ分類用のユーティリティ
 */

export type NewsCategory = 
  | '言語生成AI' 
  | '画像生成AI' 
  | '動画生成AI' 
  | '新規企業向けサービス' 
  | '新規BtoCサービス' 
  | 'HRサービス' 
  | 'その他';

/**
 * Gemini 2.5 Flashを使用してタイトルからカテゴリを分類
 * @param title 記事のタイトル
 * @param description 記事の説明（オプション）
 * @returns カテゴリ
 */
export async function classifyNewsCategory(
  title: string,
  description?: string
): Promise<NewsCategory> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    console.warn('GEMINI_API_KEYが設定されていません。フォールバックとして「その他」を返します。');
    return 'その他';
  }

  try {
    // 簡潔なプロンプトを構築（直接カテゴリ名を返すように指示）
    const prompt = `ニュース記事を以下の7つのカテゴリのいずれかに分類してください。

カテゴリ:
1. 言語生成AI
2. 画像生成AI
3. 動画生成AI
4. 新規企業向けサービス
5. 新規BtoCサービス
6. HRサービス
7. その他

タイトル: ${title}
${description ? `説明: ${description}` : ''}

カテゴリ名のみを返してください（例: 言語生成AI）。説明や余分な文字は不要です。`;

    // Gemini 2.5 Flash APIエンドポイント
    const url = `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    const requestBody = {
      contents: [{
        parts: [{
          text: prompt,
        }],
      }],
      generationConfig: {
        temperature: 0.1, // 低い温度で一貫性のある回答を
        maxOutputTokens: 20, // カテゴリ名のみなので短く
      },
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API カテゴリ分類エラー:', response.status, errorText);
      // エラー時はフォールバック
      return 'その他';
    }

    const data = await response.json();

    // デバッグ: レスポンス全体をログ出力
    console.log('Gemini カテゴリ分類レスポンス:', JSON.stringify(data, null, 2));

    // レスポンスからテキストを取得
    if (data.candidates && data.candidates[0] && data.candidates[0].content) {
      let text = data.candidates[0].content.parts[0]?.text?.trim() || '';
      
      // finishReasonがMAX_TOKENSの場合、テキストが途中で切れている可能性がある
      const finishReason = data.candidates[0].finishReason;
      if (finishReason === 'MAX_TOKENS') {
        console.warn('MAX_TOKENSに達しました。レスポンスが途中で切れている可能性があります。');
      }
      
      console.log('Gemini カテゴリ分類結果テキスト:', text);
      console.log('finishReason:', finishReason);
      
      // マークダウンコードブロックを除去
      text = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
      
      // JSON形式の場合はパース
      try {
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const result = JSON.parse(jsonMatch[0]);
          if (result.category) {
            const validCategories: NewsCategory[] = [
              '言語生成AI',
              '画像生成AI',
              '動画生成AI',
              '新規企業向けサービス',
              '新規BtoCサービス',
              'HRサービス',
              'その他'
            ];
            if (validCategories.includes(result.category as NewsCategory)) {
              return result.category as NewsCategory;
            }
          }
        }
      } catch (parseError) {
        // JSONパースに失敗した場合は無視してテキストから直接判定
      }
      
      // テキストから直接カテゴリを判定
      const validCategories: NewsCategory[] = [
        '言語生成AI',
        '画像生成AI',
        '動画生成AI',
        '新規企業向けサービス',
        '新規BtoCサービス',
        'HRサービス',
        'その他'
      ];
      
      // 完全一致をチェック
      for (const category of validCategories) {
        if (text === category || text.includes(category)) {
          return category;
        }
      }
      
      // 部分一致で判定
      const lowerText = text.toLowerCase();
      if (lowerText.includes('言語生成ai') || lowerText.includes('言語生成') || 
          lowerText.includes('llm') || lowerText.includes('chatgpt') || lowerText.includes('claude')) {
        return '言語生成AI';
      } else if (lowerText.includes('画像生成ai') || lowerText.includes('画像生成') || 
                 lowerText.includes('midjourney') || lowerText.includes('dall-e')) {
        return '画像生成AI';
      } else if (lowerText.includes('動画生成ai') || lowerText.includes('動画生成') || 
                 lowerText.includes('sora') || lowerText.includes('runway')) {
        return '動画生成AI';
      } else if (lowerText.includes('新規企業向け') || lowerText.includes('btob') || 
                 lowerText.includes('企業向けサービス') || lowerText.includes('b to b')) {
        return '新規企業向けサービス';
      } else if (lowerText.includes('新規btoc') || lowerText.includes('新規b to c') || 
                 lowerText.includes('消費者向けサービス') || lowerText.includes('b to c')) {
        return '新規BtoCサービス';
      } else if (lowerText.includes('hrサービス') || lowerText.includes('hr service') || 
                 lowerText.includes('採用') || lowerText.includes('人材') || lowerText.includes('人事')) {
        return 'HRサービス';
      } else if (lowerText.includes('その他')) {
        return 'その他';
      }
      
      console.warn(`予期しないカテゴリ分類結果: ${text}`);
      return 'その他';
    }

    console.warn('Gemini API レスポンスにカテゴリ情報がありません');
    return 'その他';
  } catch (error) {
    console.error('Gemini カテゴリ分類エラー:', error);
    // エラー時はフォールバック
    return 'その他';
  }
}
