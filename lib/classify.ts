/**
 * タグ分類用のユーティリティ
 */

export type NewsCategory = '言語生成AI' | '画像生成AI' | '動画生成AI' | 'その他';

/**
 * タイトルからカテゴリを分類
 * @param title 記事のタイトル
 * @returns カテゴリ
 */
export function classifyNewsCategory(title: string): NewsCategory {
  const lowerTitle = title.toLowerCase();

  // 言語生成AIのキーワード
  const languageAIKeywords = [
    'chatgpt', 'gpt', 'claude', 'gemini', 'bard', 'llm', '大言語モデル',
    '言語モデル', 'テキスト生成', '文章生成', '対話ai', '会話ai',
    'openai', 'anthropic', 'google ai', '言語ai'
  ];

  // 画像生成AIのキーワード
  const imageAIKeywords = [
    'midjourney', 'stable diffusion', 'dall-e', 'dalle', '画像生成',
    'ai画像', '画像ai', 'イラスト生成', '絵生成', '画像作成ai',
    'imagen', 'firefly', 'adobe firefly', '画像生成ai'
  ];

  // 動画生成AIのキーワード
  const videoAIKeywords = [
    'sora', 'runway', 'pika', '動画生成', 'ai動画', '動画ai',
    'ビデオ生成', '動画作成ai', 'video generation', '動画生成ai'
  ];

  // キーワードチェック
  for (const keyword of languageAIKeywords) {
    if (lowerTitle.includes(keyword)) {
      return '言語生成AI';
    }
  }

  for (const keyword of imageAIKeywords) {
    if (lowerTitle.includes(keyword)) {
      return '画像生成AI';
    }
  }

  for (const keyword of videoAIKeywords) {
    if (lowerTitle.includes(keyword)) {
      return '動画生成AI';
    }
  }

  // どのカテゴリにも該当しない場合は「その他」
  return 'その他';
}
