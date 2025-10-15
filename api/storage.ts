import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@vercel/kv';

// 创建 KV 客户端，显式指定环境变量
const kv = createClient({
  url: process.env.KV_KV_REST_API_URL!,
  token: process.env.KV_KV_REST_API_TOKEN!,
});

// 数据类型定义
interface WordParse {
  word: string;
  meaning: string;
  partOfSpeech: string;
  root: string;
}

interface HistoryItem {
  id: string;
  timestamp: string;
  indonesian: string;
  chinese: string;
  wordParses: WordParse[];
}

interface FlashcardItem extends WordParse {
  id: number;
  pronunciation: string;
  example: string;
  exampleTranslation: string;
  status: 'learned' | 'learning' | 'not-learned';
  addedAt: string;
}

// KV 存储键名
const HISTORY_KEY = 'translation_history';
const FLASHCARD_KEY = 'flashcard_words';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // 设置 CORS 头（如果需要）
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { action, type } = req.query;

  try {
    // 历史记录操作
    if (type === 'history') {
      switch (action) {
        case 'getAll':
          const history = await kv.get<HistoryItem[]>(HISTORY_KEY) || [];
          return res.status(200).json(history);

        case 'add':
          const { item } = req.body;
          const newItem: HistoryItem = {
            ...item,
            id: Date.now().toString(),
            timestamp: new Date().toLocaleString('zh-CN', {
              year: 'numeric',
              month: '2-digit',
              day: '2-digit',
              hour: '2-digit',
              minute: '2-digit',
            }),
          };
          
          const currentHistory = await kv.get<HistoryItem[]>(HISTORY_KEY) || [];
          currentHistory.unshift(newItem);
          
          // 限制历史记录数量（最多 100 条）
          const limitedHistory = currentHistory.slice(0, 100);
          await kv.set(HISTORY_KEY, limitedHistory);
          
          return res.status(200).json(newItem);

        case 'delete':
          const { id } = req.body;
          const historyToDelete = await kv.get<HistoryItem[]>(HISTORY_KEY) || [];
          const filteredHistory = historyToDelete.filter(h => h.id !== id);
          await kv.set(HISTORY_KEY, filteredHistory);
          return res.status(200).json({ success: true });

        case 'clear':
          await kv.set(HISTORY_KEY, []);
          return res.status(200).json({ success: true });

        default:
          return res.status(400).json({ error: 'Invalid action' });
      }
    }

    // 单词卡片操作
    if (type === 'flashcard') {
      switch (action) {
        case 'getAll':
          const cards = await kv.get<FlashcardItem[]>(FLASHCARD_KEY) || [];
          return res.status(200).json(cards);

        case 'add':
          const { wordParse, example, exampleTranslation } = req.body;
          const currentCards = await kv.get<FlashcardItem[]>(FLASHCARD_KEY) || [];
          
          // 检查是否已存在
          const existing = currentCards.find(c => c.word === wordParse.word);
          if (existing) {
            return res.status(200).json(existing);
          }

          const newCard: FlashcardItem = {
            ...wordParse,
            id: Date.now() + Math.random(),
            pronunciation: `/${wordParse.word}/`,
            example,
            exampleTranslation,
            status: 'not-learned',
            addedAt: new Date().toISOString(),
          };

          currentCards.push(newCard);
          await kv.set(FLASHCARD_KEY, currentCards);
          
          return res.status(200).json(newCard);

        case 'addBatch':
          const { wordParses, indonesianText, chineseTranslation } = req.body;
          const cards2 = await kv.get<FlashcardItem[]>(FLASHCARD_KEY) || [];
          const newCards: FlashcardItem[] = [];

          // 分割印尼语和中文为句子数组
          const indoSentences = indonesianText.split(/[.!?。！？]/).filter((s: string) => s.trim());
          const cnSentences = chineseTranslation.split(/[.!?。！？]/).filter((s: string) => s.trim());

          for (const wordParse of wordParses) {
            // 检查是否已存在
            const existing = cards2.find(c => c.word === wordParse.word);
            if (existing) {
              newCards.push(existing);
              continue;
            }

            // 找到包含该单词的句子作为例句
            const sentenceIndex = indoSentences.findIndex((s: string) => 
              s.toLowerCase().includes(wordParse.word.toLowerCase())
            );
            
            const exampleSentence = sentenceIndex >= 0 
              ? indoSentences[sentenceIndex].trim() 
              : wordParse.word;
            
            const exampleTrans = sentenceIndex >= 0 && cnSentences[sentenceIndex]
              ? cnSentences[sentenceIndex].trim()
              : wordParse.meaning;

            const newCard: FlashcardItem = {
              ...wordParse,
              id: Date.now() + Math.random(),
              pronunciation: `/${wordParse.word}/`,
              example: exampleSentence,
              exampleTranslation: exampleTrans,
              status: 'not-learned',
              addedAt: new Date().toISOString(),
            };

            cards2.push(newCard);
            newCards.push(newCard);
          }

          await kv.set(FLASHCARD_KEY, cards2);
          return res.status(200).json(newCards);

        case 'updateStatus':
          const { id: cardId, status } = req.body;
          const cardsToUpdate = await kv.get<FlashcardItem[]>(FLASHCARD_KEY) || [];
          const card = cardsToUpdate.find(c => c.id === cardId);
          if (card) {
            card.status = status;
            await kv.set(FLASHCARD_KEY, cardsToUpdate);
            return res.status(200).json({ success: true });
          }
          return res.status(404).json({ error: 'Card not found' });

        case 'delete':
          const { id: deleteId } = req.body;
          const cardsToDelete = await kv.get<FlashcardItem[]>(FLASHCARD_KEY) || [];
          const filteredCards = cardsToDelete.filter(c => c.id !== deleteId);
          await kv.set(FLASHCARD_KEY, filteredCards);
          return res.status(200).json({ success: true });

        default:
          return res.status(400).json({ error: 'Invalid action' });
      }
    }

    return res.status(400).json({ error: 'Invalid type' });

  } catch (error) {
    console.error('Storage API error:', error);
    console.error('Request details:', {
      method: req.method,
      type,
      action,
      body: req.body
    });
    return res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Storage operation failed',
      details: error instanceof Error ? error.stack : 'Unknown error'
    });
  }
}

