/**
 * 本地存储服务
 * 管理历史记录和单词卡片数据
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

/**
 * 历史记录服务
 */
export class HistoryService {
  // 获取所有历史记录
  static getAll(): HistoryItem[] {
    try {
      const data = localStorage.getItem(HISTORY_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('读取历史记录失败:', error);
      return [];
    }
  }

  // 添加新的历史记录
  static add(item: Omit<HistoryItem, 'id' | 'timestamp'>): HistoryItem {
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

    const history = this.getAll();
    history.unshift(newItem); // 添加到开头
    
    // 限制历史记录数量（最多保存 100 条）
    const limitedHistory = history.slice(0, 100);
    
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(limitedHistory));
    } catch (error) {
      console.error('保存历史记录失败:', error);
    }

    return newItem;
  }

  // 删除单条历史记录
  static delete(id: string): boolean {
    try {
      const history = this.getAll();
      const filteredHistory = history.filter(item => item.id !== id);
      localStorage.setItem(HISTORY_KEY, JSON.stringify(filteredHistory));
      return true;
    } catch (error) {
      console.error('删除历史记录失败:', error);
      return false;
    }
  }

  // 清空所有历史记录
  static clear(): boolean {
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify([]));
      return true;
    } catch (error) {
      console.error('清空历史记录失败:', error);
      return false;
    }
  }

  // 搜索历史记录
  static search(keyword: string): HistoryItem[] {
    const history = this.getAll();
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
  static getAll(): FlashcardItem[] {
    try {
      const data = localStorage.getItem(FLASHCARD_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('读取单词卡片失败:', error);
      return [];
    }
  }

  // 添加新单词（从词汇解析转换）
  static addFromWordParse(
    wordParse: WordParse,
    example: string,
    exampleTranslation: string
  ): FlashcardItem {
    const cards = this.getAll();
    
    // 检查是否已存在
    const existing = cards.find(card => card.word === wordParse.word);
    if (existing) {
      return existing;
    }

    const newCard: FlashcardItem = {
      ...wordParse,
      id: Date.now() + Math.random(), // 使用时间戳 + 随机数确保唯一
      pronunciation: this.generatePronunciation(wordParse.word),
      example,
      exampleTranslation,
      status: 'not-learned',
      addedAt: new Date().toISOString(),
    };

    cards.push(newCard);
    
    try {
      localStorage.setItem(FLASHCARD_KEY, JSON.stringify(cards));
    } catch (error) {
      console.error('保存单词卡片失败:', error);
    }

    return newCard;
  }

  // 批量添加单词（从翻译结果）
  static addBatch(
    wordParses: WordParse[],
    indonesianText: string,
    chineseTranslation: string
  ): FlashcardItem[] {
    const newCards: FlashcardItem[] = [];

    // 分割印尼语和中文为句子数组
    const indoSentences = indonesianText.split(/[.!?。！？]/).filter(s => s.trim());
    const cnSentences = chineseTranslation.split(/[.!?。！？]/).filter(s => s.trim());

    wordParses.forEach(wordParse => {
      // 尝试从原文中找到包含该单词的句子作为例句
      const sentenceIndex = indoSentences.findIndex(s => 
        s.toLowerCase().includes(wordParse.word.toLowerCase())
      );
      
      const exampleSentence = sentenceIndex >= 0 
        ? indoSentences[sentenceIndex].trim() 
        : wordParse.word; // 如果找不到，就用单词本身
      
      // 使用对应索引的中文句子，如果没有就用单词的意思
      const exampleTranslation = sentenceIndex >= 0 && cnSentences[sentenceIndex]
        ? cnSentences[sentenceIndex].trim()
        : wordParse.meaning;

      const card = this.addFromWordParse(
        wordParse,
        exampleSentence,
        exampleTranslation
      );
      
      newCards.push(card);
    });

    return newCards;
  }

  // 更新单词状态
  static updateStatus(id: number, status: FlashcardItem['status']): boolean {
    try {
      const cards = this.getAll();
      const card = cards.find(c => c.id === id);
      if (card) {
        card.status = status;
        localStorage.setItem(FLASHCARD_KEY, JSON.stringify(cards));
        return true;
      }
      return false;
    } catch (error) {
      console.error('更新单词状态失败:', error);
      return false;
    }
  }

  // 删除单词卡片
  static delete(id: number): boolean {
    try {
      const cards = this.getAll();
      const filtered = cards.filter(c => c.id !== id);
      localStorage.setItem(FLASHCARD_KEY, JSON.stringify(filtered));
      return true;
    } catch (error) {
      console.error('删除单词卡片失败:', error);
      return false;
    }
  }

  // 生成简单的发音标注（可以后续优化）
  private static generatePronunciation(word: string): string {
    // 这里可以接入发音 API，暂时返回简单格式
    return `/${word}/`;
  }

  // 获取学习进度
  static getProgress(): {
    total: number;
    learned: number;
    learning: number;
    notLearned: number;
    percentage: number;
  } {
    const cards = this.getAll();
    const total = cards.length;
    const learned = cards.filter(c => c.status === 'learned').length;
    const learning = cards.filter(c => c.status === 'learning').length;
    const notLearned = cards.filter(c => c.status === 'not-learned').length;
    const percentage = total > 0 ? (learned / total) * 100 : 0;

    return { total, learned, learning, notLearned, percentage };
  }
}

