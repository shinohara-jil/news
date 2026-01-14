/**
 * タグ分類用のユーティリティ
 */

export type NewsCategory = 
  | '言語生成AI' 
  | '画像生成AI' 
  | '動画生成AI' 
  | '新規企業向けサービス' 
  | '新規BtoCサービス' 
  | 'HRサービス';

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
    console.warn('GEMINI_API_KEYが設定されていません。キーワードベースで分類します。');
    // APIキーがない場合はキーワードベースで分類
    return classifyByKeywords(title, description);
  }

  try {
    // より明確で簡潔なプロンプトを構築
    // 必ず6つのカテゴリのいずれかに分類する
    const prompt = `記事を分類してください。必ず以下の6つのカテゴリのいずれかを選んでください。

【カテゴリ】
1. 言語生成AI: ChatGPT、Claude、Gemini、LLM、テキスト生成、対話AI
2. 画像生成AI: Midjourney、Stable Diffusion、DALL-E、画像生成
3. 動画生成AI: Sora、Runway、Pika、動画生成
4. 新規企業向けサービス: 企業向けAIサービス、BtoBソリューション
5. 新規BtoCサービス: 消費者向けAIサービス、個人向けAIアプリ
6. HRサービス: 採用、人材管理、人事、HR Tech

【記事】
タイトル: ${title}
${description ? `内容: ${description.substring(0, 200)}` : ''}

【重要】最も適切なカテゴリ名のみを1行で返してください。番号や説明は不要です。
例: 言語生成AI`;

    // Gemini 2.5 Flash APIエンドポイント
    const url = `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    const requestBody = {
      contents: [{
        parts: [{
          text: prompt,
        }],
      }],
      generationConfig: {
        temperature: 0.2, // 少し上げて柔軟性を持たせる
        maxOutputTokens: 15, // カテゴリ名のみなので短く（長いカテゴリ名に対応）
        topP: 0.95,
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
      // エラー時はキーワードベースで分類
      console.log('→ キーワードベースで分類を試みます');
      return classifyByKeywords(title, description);
    }

    const data = await response.json();

    // デバッグ: レスポンス全体をログ出力
    console.log('Gemini カテゴリ分類レスポンス:', JSON.stringify(data, null, 2));

    // レスポンスからテキストを取得
    if (data.candidates && data.candidates[0] && data.candidates[0].content) {
      let text = data.candidates[0].content.parts[0]?.text?.trim() || '';
      const finishReason = data.candidates[0].finishReason;
      
      console.log('Gemini カテゴリ分類結果テキスト:', text);
      console.log('finishReason:', finishReason);
      
      // finishReasonがMAX_TOKENSの場合でも、取得できた部分から判定を試みる
      if (finishReason === 'MAX_TOKENS') {
        console.warn('MAX_TOKENSに達しましたが、取得できた部分から判定を試みます。');
      }
      
      // マークダウンコードブロックや余分な文字を除去
      text = text
        .replace(/```json\s*/g, '')
        .replace(/```\s*/g, '')
        .replace(/^[0-9]\.\s*/g, '') // 番号を除去
        .replace(/^カテゴリ[：:]\s*/g, '') // 「カテゴリ:」を除去
        .trim();
      
      // 最初の行のみを取得（複数行の場合）
      const firstLine = text.split('\n')[0].trim();
      text = firstLine;
      
      // 有効なカテゴリリスト
      const validCategories: NewsCategory[] = [
        '言語生成AI',
        '画像生成AI',
        '動画生成AI',
        '新規企業向けサービス',
        '新規BtoCサービス',
        'HRサービス'
      ];
      
      // 完全一致をチェック（最優先）
      for (const category of validCategories) {
        if (text === category) {
          console.log(`✓ 完全一致で分類: ${category}`);
          return category;
        }
      }
      
      // 部分一致をチェック（カテゴリ名が含まれているか）
      for (const category of validCategories) {
        if (text.includes(category)) {
          console.log(`✓ 部分一致で分類: ${category}`);
          return category;
        }
      }
      
      // キーワードベースの判定（「その他」を避けるため、積極的に分類）
      const lowerText = text.toLowerCase();
      const lowerTitle = title.toLowerCase();
      const lowerDescription = description?.toLowerCase() || '';
      const combinedText = `${lowerTitle} ${lowerDescription} ${lowerText}`;
      
      // 言語生成AIのキーワード
      if (combinedText.includes('chatgpt') || combinedText.includes('claude') || 
          combinedText.includes('gemini') || combinedText.includes('llm') || 
          combinedText.includes('大言語モデル') || combinedText.includes('言語モデル') ||
          combinedText.includes('テキスト生成') || combinedText.includes('文章生成') ||
          combinedText.includes('対話ai') || combinedText.includes('会話ai')) {
        console.log(`✓ キーワードで分類: 言語生成AI`);
        return '言語生成AI';
      }
      
      // 画像生成AIのキーワード
      if (combinedText.includes('midjourney') || combinedText.includes('stable diffusion') ||
          combinedText.includes('dall-e') || combinedText.includes('dalle') ||
          combinedText.includes('画像生成') || combinedText.includes('ai画像') ||
          combinedText.includes('イラスト生成') || combinedText.includes('絵生成')) {
        console.log(`✓ キーワードで分類: 画像生成AI`);
        return '画像生成AI';
      }
      
      // 動画生成AIのキーワード
      if (combinedText.includes('sora') || combinedText.includes('runway') ||
          combinedText.includes('pika') || combinedText.includes('動画生成') ||
          combinedText.includes('ai動画') || combinedText.includes('ビデオ生成')) {
        console.log(`✓ キーワードで分類: 動画生成AI`);
        return '動画生成AI';
      }
      
      // 新規企業向けサービスのキーワード
      if (combinedText.includes('企業向け') || combinedText.includes('btob') ||
          combinedText.includes('b to b') || combinedText.includes('法人向け') ||
          combinedText.includes('ビジネス向け') || combinedText.includes('エンタープライズ')) {
        console.log(`✓ キーワードで分類: 新規企業向けサービス`);
        return '新規企業向けサービス';
      }
      
      // 新規BtoCサービスのキーワード
      if (combinedText.includes('btoc') || combinedText.includes('b to c') ||
          combinedText.includes('消費者向け') || combinedText.includes('個人向け') ||
          combinedText.includes('一般向け') || combinedText.includes('エンドユーザー')) {
        console.log(`✓ キーワードで分類: 新規BtoCサービス`);
        return '新規BtoCサービス';
      }
      
      // HRサービスのキーワード
      if (combinedText.includes('採用') || combinedText.includes('人材') ||
          combinedText.includes('人事') || combinedText.includes('hr tech') ||
          combinedText.includes('hrサービス') || combinedText.includes('人材マッチング') ||
          combinedText.includes('採用支援')) {
        console.log(`✓ キーワードで分類: HRサービス`);
        return 'HRサービス';
      }
      
      // 上記に該当しない場合は、キーワードベースで再判定
      console.warn(`⚠️ キーワードマッチなし。テキスト: "${text}"、タイトル: "${title.substring(0, 50)}..."`);
      console.log(`→ キーワードベースで再分類を試みます`);
      return classifyByKeywords(title, description);
    }

    console.warn('Gemini API レスポンスにカテゴリ情報がありません。キーワードベースで分類します。');
    return classifyByKeywords(title, description);
  } catch (error) {
    console.error('Gemini カテゴリ分類エラー:', error);
    // エラー時はキーワードベースで分類
    return classifyByKeywords(title, description);
  }
}

/**
 * キーワードベースでカテゴリを分類（フォールバック用）
 * 必ず6つのカテゴリのいずれかを返す
 */
function classifyByKeywords(
  title: string,
  description?: string
): NewsCategory {
  const lowerTitle = title.toLowerCase();
  const lowerDescription = description?.toLowerCase() || '';
  const combinedText = `${lowerTitle} ${lowerDescription}`;
  
  // 各カテゴリのスコアを計算
  const scores: { [key in NewsCategory]: number } = {
    '言語生成AI': 0,
    '画像生成AI': 0,
    '動画生成AI': 0,
    '新規企業向けサービス': 0,
    '新規BtoCサービス': 0,
    'HRサービス': 0,
  };
  
  // 言語生成AIのキーワード
  const languageKeywords = ['chatgpt', 'claude', 'gemini', 'llm', '大言語モデル', '言語モデル', 'テキスト生成', '文章生成', '対話ai', '会話ai', 'openai', 'anthropic'];
  languageKeywords.forEach(keyword => {
    if (combinedText.includes(keyword)) scores['言語生成AI']++;
  });
  
  // 画像生成AIのキーワード
  const imageKeywords = ['midjourney', 'stable diffusion', 'dall-e', 'dalle', '画像生成', 'ai画像', 'イラスト生成', '絵生成', 'imagen', 'firefly'];
  imageKeywords.forEach(keyword => {
    if (combinedText.includes(keyword)) scores['画像生成AI']++;
  });
  
  // 動画生成AIのキーワード
  const videoKeywords = ['sora', 'runway', 'pika', '動画生成', 'ai動画', 'ビデオ生成'];
  videoKeywords.forEach(keyword => {
    if (combinedText.includes(keyword)) scores['動画生成AI']++;
  });
  
  // 新規企業向けサービスのキーワード
  const b2bKeywords = ['企業向け', 'btob', 'b to b', '法人向け', 'ビジネス向け', 'エンタープライズ', '企業ソリューション'];
  b2bKeywords.forEach(keyword => {
    if (combinedText.includes(keyword)) scores['新規企業向けサービス']++;
  });
  
  // 新規BtoCサービスのキーワード
  const b2cKeywords = ['btoc', 'b to c', '消費者向け', '個人向け', '一般向け', 'エンドユーザー', '個人アプリ'];
  b2cKeywords.forEach(keyword => {
    if (combinedText.includes(keyword)) scores['新規BtoCサービス']++;
  });
  
  // HRサービスのキーワード
  const hrKeywords = ['採用', '人材', '人事', 'hr tech', 'hrサービス', '人材マッチング', '採用支援', 'recruiting'];
  hrKeywords.forEach(keyword => {
    if (combinedText.includes(keyword)) scores['HRサービス']++;
  });
  
  // スコアが最も高いカテゴリを返す
  const maxScore = Math.max(...Object.values(scores));
  const bestCategory = Object.entries(scores).find(([_, score]) => score === maxScore)?.[0] as NewsCategory;
  
  // スコアが0の場合は、デフォルトで「新規BtoCサービス」を返す（最も一般的なカテゴリ）
  if (maxScore === 0) {
    console.log('→ キーワードマッチなし。デフォルトで「新規BtoCサービス」に分類');
    return '新規BtoCサービス';
  }
  
  console.log(`→ キーワードスコアで分類: ${bestCategory} (スコア: ${maxScore})`);
  return bestCategory;
}
