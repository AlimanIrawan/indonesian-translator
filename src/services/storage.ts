/**
 * 存储服务
 * 生产环境：使用 Vercel KV 云端存储
 * 开发环境：使用 localStorage 本地存储
 */

import { WordParse } from './openai';

// 历史记录接口
export interface HistoryItem {
  id: string;
  timestamp: string;
  indonesian: string;
  chinese: string;
  wordParses: WordParse[];
  imageUrl?: string; // 可选的图片URL
}

// 单词卡片接口
export interface FlashcardItem extends WordParse {
  id: number;
  pronunciation: string;
  example: string;
  exampleTranslation: string;
  status: 'learned' | 'learning' | 'not-learned';
  imageUrl?: string;
  addedAt: string; // 添加时间
}

// 存储键名
const HISTORY_KEY = 'translation_history';
const FLASHCARD_KEY = 'flashcard_words';

// 判断是否为生产环境
const isProduction = import.meta.env.PROD;

// API 调用辅助函数
async function callStorageAPI(type: 'history' | 'flashcard', action: string, data?: any) {
  const isGetAction = action === 'getAll';
  const response = await fetch(`/api/storage?type=${type}&action=${action}`, {
    method: isGetAction ? 'GET' : 'POST',
    headers: { 'Content-Type': 'application/json' },
    ...(isGetAction ? {} : { body: JSON.stringify(data || {}) }),
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error('Storage API error:', errorText);
    throw new Error(`Storage API call failed: ${errorText}`);
  }
  
  return await response.json();
}

/**
 * 历史记录服务
 */
export class HistoryService {
  // 获取所有历史记录
  static async getAll(): Promise<HistoryItem[]> {
    try {
      if (isProduction) {
        return await callStorageAPI('history', 'getAll');
      } else {
        const data = localStorage.getItem(HISTORY_KEY);
        return data ? JSON.parse(data) : [];
      }
    } catch (error) {
      console.error('读取历史记录失败:', error);
      return [];
    }
  }

  // 添加新的历史记录
  static async add(item: Omit<HistoryItem, 'id' | 'timestamp'>): Promise<HistoryItem> {
    try {
      if (isProduction) {
        return await callStorageAPI('history', 'add', { item });
      } else {
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

        const history = await this.getAll();
        history.unshift(newItem);
        
        const limitedHistory = history.slice(0, 100);
        localStorage.setItem(HISTORY_KEY, JSON.stringify(limitedHistory));

        return newItem;
      }
    } catch (error) {
      console.error('保存历史记录失败:', error);
      throw error;
    }
  }

  // 删除单条历史记录
  static async delete(id: string): Promise<boolean> {
    try {
      if (isProduction) {
        await callStorageAPI('history', 'delete', { id });
        return true;
      } else {
        const history = await this.getAll();
        const filteredHistory = history.filter(item => item.id !== id);
        localStorage.setItem(HISTORY_KEY, JSON.stringify(filteredHistory));
        return true;
      }
    } catch (error) {
      console.error('删除历史记录失败:', error);
      return false;
    }
  }

  // 清空所有历史记录
  static async clear(): Promise<boolean> {
    try {
      if (isProduction) {
        await callStorageAPI('history', 'clear');
        return true;
      } else {
        localStorage.setItem(HISTORY_KEY, JSON.stringify([]));
        return true;
      }
    } catch (error) {
      console.error('清空历史记录失败:', error);
      return false;
    }
  }

  // 搜索历史记录
  static async search(keyword: string): Promise<HistoryItem[]> {
    const history = await this.getAll();
    if (!keyword) return history;

    const lowerKeyword = keyword.toLowerCase();
    return history.filter(item =>
      item.indonesian.toLowerCase().includes(lowerKeyword) ||
      item.chinese.toLowerCase().includes(lowerKeyword)
    );
  }
}

/**
 * 单词卡片服务
 */
export class FlashcardService {
  // 获取所有单词卡片
  static async getAll(): Promise<FlashcardItem[]> {
    try {
      if (isProduction) {
        return await callStorageAPI('flashcard', 'getAll');
      } else {
        const data = localStorage.getItem(FLASHCARD_KEY);
        return data ? JSON.parse(data) : [];
      }
    } catch (error) {
      console.error('读取单词卡片失败:', error);
      return [];
    }
  }

  // 添加新单词（从词汇解析转换）
  static async addFromWordParse(
    wordParse: WordParse,
    example: string,
    exampleTranslation: string
  ): Promise<FlashcardItem> {
    try {
      if (isProduction) {
        return await callStorageAPI('flashcard', 'add', { wordParse, example, exampleTranslation });
      } else {
        const cards = await this.getAll();
        
        const existing = cards.find(card => card.word === wordParse.word);
        if (existing) {
          return existing;
        }

        const newCard: FlashcardItem = {
          ...wordParse,
          id: Date.now() + Math.random(),
          pronunciation: this.generatePronunciation(wordParse.word),
          example,
          exampleTranslation,
          status: 'not-learned',
          addedAt: new Date().toISOString(),
        };

        cards.push(newCard);
        localStorage.setItem(FLASHCARD_KEY, JSON.stringify(cards));

        return newCard;
      }
    } catch (error) {
      console.error('保存单词卡片失败:', error);
      throw error;
    }
  }

  // 批量添加单词（从翻译结果）
  static async addBatch(
    wordParses: WordParse[],
    indonesianText: string,
    chineseTranslation: string
  ): Promise<FlashcardItem[]> {
    try {
      if (isProduction) {
        return await callStorageAPI('flashcard', 'addBatch', { 
          wordParses, 
          indonesianText, 
          chineseTranslation 
        });
      } else {
        const newCards: FlashcardItem[] = [];

        const indoSentences = indonesianText.split(/[.!?。！？]/).filter(s => s.trim());
        const cnSentences = chineseTranslation.split(/[.!?。！？]/).filter(s => s.trim());

        for (const wordParse of wordParses) {
          const sentenceIndex = indoSentences.findIndex(s => 
            s.toLowerCase().includes(wordParse.word.toLowerCase())
          );
          
          const exampleSentence = sentenceIndex >= 0 
            ? indoSentences[sentenceIndex].trim() 
            : wordParse.word;
          
          const exampleTranslation = sentenceIndex >= 0 && cnSentences[sentenceIndex]
            ? cnSentences[sentenceIndex].trim()
            : wordParse.meaning;

          const card = await this.addFromWordParse(
            wordParse,
            exampleSentence,
            exampleTranslation
          );
          
          newCards.push(card);
        }

        return newCards;
      }
    } catch (error) {
      console.error('批量添加单词失败:', error);
      return [];
    }
  }

  // 更新单词状态
  static async updateStatus(id: number, status: FlashcardItem['status']): Promise<boolean> {
    try {
      if (isProduction) {
        await callStorageAPI('flashcard', 'updateStatus', { id, status });
        return true;
      } else {
        const cards = await this.getAll();
        const card = cards.find(c => c.id === id);
        if (card) {
          card.status = status;
          localStorage.setItem(FLASHCARD_KEY, JSON.stringify(cards));
          return true;
        }
        return false;
      }
    } catch (error) {
      console.error('更新单词状态失败:', error);
      return false;
    }
  }

  // 删除单词卡片
  static async delete(id: number): Promise<boolean> {
    try {
      if (isProduction) {
        await callStorageAPI('flashcard', 'delete', { id });
        return true;
      } else {
        const cards = await this.getAll();
        const filtered = cards.filter(c => c.id !== id);
        localStorage.setItem(FLASHCARD_KEY, JSON.stringify(filtered));
        return true;
      }
    } catch (error) {
      console.error('删除单词卡片失败:', error);
      return false;
    }
  }

  // 生成简单的发音标注（可以后续优化）
  private static generatePronunciation(word: string): string {
    return `/${word}/`;
  }

  // 获取学习进度
  static async getProgress(): Promise<{
    total: number;
    learned: number;
    learning: number;
    notLearned: number;
    percentage: number;
  }> {
    const cards = await this.getAll();
    const total = cards.length;
    const learned = cards.filter(c => c.status === 'learned').length;
    const learning = cards.filter(c => c.status === 'learning').length;
    const notLearned = cards.filter(c => c.status === 'not-learned').length;
    const percentage = total > 0 ? (learned / total) * 100 : 0;

    return { total, learned, learning, notLearned, percentage };
  }
}

