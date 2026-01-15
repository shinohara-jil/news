/**
 * タグ分類用のユーティリティ
 */

export type NewsCategory = 
  | '調査・記事系' 
  | '新規サービス系' 
  | '顧客事例系' 
  | 'リスク系';

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
    // 必ず4つのカテゴリのいずれかに分類する
    const prompt = `記事を分類してください。必ず以下の4つのカテゴリのいずれかを選んでください。

【カテゴリ】
1. 調査・記事系: 市場調査、レポート、分析記事、統計データ、トレンド分析、業界動向、調査結果
2. 新規サービス系: 新サービス発表、新機能リリース、製品ローンチ、サービス開始、アップデート
3. 顧客事例系: 導入事例、成功事例、ユーザーストーリー、活用事例、実績紹介、ケーススタディ
4. リスク系: セキュリティ問題、データ漏洩、規制・法規制、リスク警告、問題提起、懸念事項

【記事】
タイトル: ${title}
${description ? `内容: ${description.substring(0, 200)}` : ''}

【重要】最も適切なカテゴリ名のみを1行で返してください。番号や説明は不要です。
例: 調査・記事系`;

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
        '調査・記事系',
        '新規サービス系',
        '顧客事例系',
        'リスク系'
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
      
      // キーワードベースの判定
      const lowerText = text.toLowerCase();
      const lowerTitle = title.toLowerCase();
      const lowerDescription = description?.toLowerCase() || '';
      const combinedText = `${lowerTitle} ${lowerDescription} ${lowerText}`;
      
      // リスク系のキーワード（最優先でチェック）
      if (combinedText.includes('リスク') || combinedText.includes('セキュリティ') ||
          combinedText.includes('データ漏洩') || combinedText.includes('情報漏洩') ||
          combinedText.includes('規制') || combinedText.includes('法規制') ||
          combinedText.includes('問題') || combinedText.includes('懸念') ||
          combinedText.includes('警告') || combinedText.includes('危険') ||
          combinedText.includes('脆弱性') || combinedText.includes('攻撃')) {
        console.log(`✓ キーワードで分類: リスク系`);
        return 'リスク系';
      }
      
      // 顧客事例系のキーワード
      if (combinedText.includes('事例') || combinedText.includes('導入事例') ||
          combinedText.includes('成功事例') || combinedText.includes('活用事例') ||
          combinedText.includes('ユーザーストーリー') || combinedText.includes('ケーススタディ') ||
          combinedText.includes('実績') || combinedText.includes('導入実績') ||
          combinedText.includes('導入企業') || combinedText.includes('活用企業')) {
        console.log(`✓ キーワードで分類: 顧客事例系`);
        return '顧客事例系';
      }
      
      // 新規サービス系のキーワード
      if (combinedText.includes('新サービス') || combinedText.includes('新機能') ||
          combinedText.includes('リリース') || combinedText.includes('ローンチ') ||
          combinedText.includes('発表') || combinedText.includes('開始') ||
          combinedText.includes('アップデート') || combinedText.includes('アップグレード') ||
          combinedText.includes('新製品') || combinedText.includes('新商品')) {
        console.log(`✓ キーワードで分類: 新規サービス系`);
        return '新規サービス系';
      }
      
      // 調査・記事系のキーワード（デフォルト）
      if (combinedText.includes('調査') || combinedText.includes('レポート') ||
          combinedText.includes('分析') || combinedText.includes('統計') ||
          combinedText.includes('トレンド') || combinedText.includes('動向') ||
          combinedText.includes('業界') || combinedText.includes('市場')) {
        console.log(`✓ キーワードで分類: 調査・記事系`);
        return '調査・記事系';
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
    '調査・記事系': 0,
    '新規サービス系': 0,
    '顧客事例系': 0,
    'リスク系': 0,
  };
  
  // リスク系のキーワード
  const riskKeywords = ['リスク', 'セキュリティ', 'データ漏洩', '情報漏洩', '規制', '法規制', '問題', '懸念', '警告', '危険', '脆弱性', '攻撃', '脅威', '不正', '違反'];
  riskKeywords.forEach(keyword => {
    if (combinedText.includes(keyword)) scores['リスク系']++;
  });
  
  // 顧客事例系のキーワード
  const caseKeywords = ['事例', '導入事例', '成功事例', '活用事例', 'ユーザーストーリー', 'ケーススタディ', '実績', '導入実績', '導入企業', '活用企業', '導入効果', '活用方法'];
  caseKeywords.forEach(keyword => {
    if (combinedText.includes(keyword)) scores['顧客事例系']++;
  });
  
  // 新規サービス系のキーワード
  const serviceKeywords = ['新サービス', '新機能', 'リリース', 'ローンチ', '発表', '開始', 'アップデート', 'アップグレード', '新製品', '新商品', '提供開始', '公開'];
  serviceKeywords.forEach(keyword => {
    if (combinedText.includes(keyword)) scores['新規サービス系']++;
  });
  
  // 調査・記事系のキーワード
  const researchKeywords = ['調査', 'レポート', '分析', '統計', 'トレンド', '動向', '業界', '市場', '研究', '結果', 'データ', '報告'];
  researchKeywords.forEach(keyword => {
    if (combinedText.includes(keyword)) scores['調査・記事系']++;
  });
  
  // スコアが最も高いカテゴリを返す
  const maxScore = Math.max(...Object.values(scores));
  const bestCategory = Object.entries(scores).find(([_, score]) => score === maxScore)?.[0] as NewsCategory;
  
  // スコアが0の場合は、デフォルトで「調査・記事系」を返す（最も一般的なカテゴリ）
  if (maxScore === 0) {
    console.log('→ キーワードマッチなし。デフォルトで「調査・記事系」に分類');
    return '調査・記事系';
  }
  
  console.log(`→ キーワードスコアで分類: ${bestCategory} (スコア: ${maxScore})`);
  return bestCategory;
}
