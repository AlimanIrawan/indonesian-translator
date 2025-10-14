

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import styles from './styles.module.css';
import { FlashcardService, type FlashcardItem } from '../../services/storage';

const FlashcardPage: React.FC = () => {
  const [isFlashcardFlipped, setIsFlashcardFlipped] = useState(false);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showSuccessToast, setShowSuccessToast] = useState(false);

  // 从本地存储读取单词数据
  const [wordsData, setWordsData] = useState<FlashcardItem[]>([]);

  // 设置页面标题和加载数据
  useEffect(() => {
    const originalTitle = document.title;
    document.title = '单词卡片 - 印中图译通';
    loadWords();
    return () => { document.title = originalTitle; };
  }, []);

  // 加载单词数据
  const loadWords = () => {
    const cards = FlashcardService.getAll();
    const sortedWords = [...cards].sort((a, b) => {
      const statusOrder = { 'not-learned': 0, 'learning': 1, 'learned': 2 };
      return statusOrder[a.status] - statusOrder[b.status];
    });
    setWordsData(sortedWords);

    // 定位到第一个未学会的单词
    const firstUnlearnedIndex = sortedWords.findIndex(word => word.status !== 'learned');
    setCurrentCardIndex(firstUnlearnedIndex !== -1 ? firstUnlearnedIndex : 0);
  };

  // 获取当前单词
  const getCurrentWord = (): FlashcardItem | undefined => {
    return wordsData[currentCardIndex];
  };

  // 获取词性的英文表示
  const getPartOfSpeechEnglish = (chinese: string): string => {
    const posMap: { [key: string]: string } = {
      '名词': 'noun',
      '动词': 'verb',
      '形容词': 'adjective',
      '副词': 'adverb',
      '代词': 'pronoun',
      '介词': 'preposition',
      '连词': 'conjunction',
      '感叹词': 'interjection'
    };
    return posMap[chinese] || '';
  };

  // 翻转卡片
  const handleFlipCard = () => {
    setIsFlashcardFlipped(!isFlashcardFlipped);
  };

  // 上一张卡片（只在未学会的单词中循环）
  const handlePrevCard = () => {
    const unlearnedWords = wordsData.filter(word => word.status !== 'learned');
    if (unlearnedWords.length > 0) {
      const currentUnlearnedIndex = unlearnedWords.findIndex(word => word.id === getCurrentWord().id);
      const newUnlearnedIndex = (currentUnlearnedIndex - 1 + unlearnedWords.length) % unlearnedWords.length;
      const newCardIndex = wordsData.findIndex(word => word.id === unlearnedWords[newUnlearnedIndex].id);
      setCurrentCardIndex(newCardIndex);
      setIsFlashcardFlipped(false);
    }
  };

  // 下一张卡片（只在未学会的单词中循环）
  const handleNextCard = () => {
    const unlearnedWords = wordsData.filter(word => word.status !== 'learned');
    if (unlearnedWords.length > 0) {
      const currentUnlearnedIndex = unlearnedWords.findIndex(word => word.id === getCurrentWord().id);
      const newUnlearnedIndex = (currentUnlearnedIndex + 1) % unlearnedWords.length;
      const newCardIndex = wordsData.findIndex(word => word.id === unlearnedWords[newUnlearnedIndex].id);
      setCurrentCardIndex(newCardIndex);
      setIsFlashcardFlipped(false);
    }
  };

  // 标记单词学习状态
  const handleMarkLearned = () => {
    const currentWord = getCurrentWord();
    if (!currentWord) return;

    const newStatus: FlashcardItem['status'] = 
      currentWord.status === 'learned' ? 'not-learned' : 'learned';
    
    const success = FlashcardService.updateStatus(currentWord.id, newStatus);
    if (success) {
      loadWords(); // 重新加载
      showSuccessToastMessage();
    }
  };


  // 单词列表项点击事件
  const handleWordItemClick = (wordId: number) => {
    const wordIndex = wordsData.findIndex(word => word.id === wordId);
    if (wordIndex !== -1) {
      setCurrentCardIndex(wordIndex);
      setIsFlashcardFlipped(false);
      
      // 滚动到卡片区域
      const flashcardSection = document.querySelector('#flashcard-section');
      if (flashcardSection) {
        flashcardSection.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  // 删除单词
  const handleDeleteWord = (wordId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('确定要删除这个单词吗？')) {
      const success = FlashcardService.delete(wordId);
      if (success) {
        loadWords(); // 重新加载
        showSuccessToastMessage();
      }
    }
  };

  // 显示成功提示
  const showSuccessToastMessage = () => {
    setShowSuccessToast(true);
    setTimeout(() => {
      setShowSuccessToast(false);
    }, 2000);
  };

  // 获取学习进度
  const progress = FlashcardService.getProgress();
  const currentWord = getCurrentWord();

  return (
    <div className={styles.pageWrapper}>
      {/* 顶部导航栏 */}
      <header id="main-header" className="bg-white shadow-sm border-b border-border-light sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo和产品名称 */}
            <div id="logo-section" className="flex items-center space-x-3">
              <img src="/logo.svg" alt="印中图译通" className="w-10 h-10 rounded-lg shadow-md" />
              <h1 className="text-xl font-bold text-text-primary">印中图译通</h1>
            </div>
            
            {/* 移动端菜单按钮 */}
            <button 
              id="mobile-menu-btn" 
              className="md:hidden p-2 rounded-lg hover:bg-gray-100"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              <i className="fas fa-bars text-text-secondary"></i>
            </button>
            
            {/* 桌面端导航 */}
            <nav id="main-nav" className={`${isMobileMenuOpen ? 'flex' : 'hidden'} md:flex items-center space-x-8`}>
              <Link to="/home" id="nav-home" className={`${styles.navItem} text-text-secondary hover:text-primary py-2`}>首页</Link>
              <Link to="/history" id="nav-history" className={`${styles.navItem} text-text-secondary hover:text-primary py-2`}>历史记录</Link>
              <Link to="/flashcard" id="nav-flashcard" className={`${styles.navItem} ${styles.active} text-primary font-medium py-2`}>单词卡片</Link>
            </nav>
          </div>
        </div>
      </header>

      {/* 主内容区 */}
      <main id="main-content" className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* 页面头部 */}
        <section id="page-header" className="mb-6">
          <h2 id="page-title" className="text-xl sm:text-2xl font-bold text-text-primary mb-3">单词卡片学习</h2>
          <p id="page-description" className="text-text-secondary text-sm sm:text-base">
            通过单词卡片方式学习印尼语词汇，提高记忆效率
          </p>
        </section>

        {/* 学习进度 */}
        <section id="learning-progress" className="bg-white rounded-2xl shadow-card p-4 mb-6">
          <div className="flex flex-col justify-between items-center">
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-text-primary mb-1">学习进度</h3>
              <p className="text-text-secondary text-sm">
                已学习 <span id="learned-count" className="font-medium text-primary">{progress.learned}</span>/
                <span id="total-count" className="font-medium">{progress.total}</span> 个单词
              </p>
            </div>
            <div className="w-full max-w-xs">
              <div className={styles.progressBar}>
                <div 
                  id="progress-fill" 
                  className={styles.progressFill} 
                  style={{ width: `${progress.percentage}%` }}
                ></div>
              </div>
            </div>
          </div>
        </section>

        {/* 单词卡片 */}
        <section id="flashcard-section" className="flex flex-col items-center justify-center mb-12">
          {wordsData.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-card p-12 text-center w-full max-w-md">
              <i className="fas fa-book-open text-6xl text-gray-300 mb-4"></i>
              <h3 className="text-lg font-semibold text-text-primary mb-2">暂无单词卡片</h3>
              <p className="text-text-secondary mb-6">
                开始翻译图片，自动生成单词卡片吧！
              </p>
              <Link
                to="/home"
                className="inline-block bg-primary text-white px-6 py-3 rounded-lg hover:bg-blue-600 transition-colors"
              >
                开始翻译
              </Link>
            </div>
          ) : (
          <>
          <div 
            id="flashcard" 
            className={`${styles.flashcard} ${isFlashcardFlipped ? styles.flipped : ''} mb-8`}
            onClick={handleFlipCard}
          >
            <div id="flashcard-inner" className={styles.flashcardInner}>
              {/* 卡片正面（印尼语单词） */}
              <div id="flashcard-front" className={styles.flashcardFront}>
                {currentWord?.imageUrl && (
                  <div className="mb-4 w-full max-h-32 overflow-hidden rounded-lg">
                    <img 
                      src={currentWord.imageUrl} 
                      alt="单词图片" 
                      className="w-full h-full object-contain"
                      data-category="学习资料"
                    />
                  </div>
                )}
                <div id="word-tags" className="mb-4">
                  <span className={styles.wordTag}>{currentWord?.partOfSpeech}</span>
                </div>
                <h3 id="indonesian-word" className="text-3xl font-bold text-text-primary">{currentWord?.word.toLowerCase()}</h3>
              </div>
              
              {/* 卡片背面（中文翻译和解析） */}
              <div id="flashcard-back" className={styles.flashcardBack}>
                <h3 id="chinese-meaning" className="text-2xl font-bold text-text-primary mb-4">{currentWord?.meaning}</h3>
                <div id="word-details" className="text-left w-full">
                  <p className="text-text-secondary mb-2">
                    <span className="font-medium">词性：</span>{currentWord?.partOfSpeech} ({currentWord && getPartOfSpeechEnglish(currentWord.partOfSpeech)})
                  </p>
                  <div className="text-text-secondary mb-2">
                    <p className="mb-1"><span className="font-medium">例句：</span>{currentWord?.example}</p>
                    <p className="ml-12 text-sm">{currentWord?.exampleTranslation}</p>
                  </div>
                  <p className="text-text-secondary">
                    <span className="font-medium">词根：</span>{currentWord?.root}
                  </p>
                </div>
              </div>
            </div>
          </div>
          
          {/* 卡片操作按钮 */}
          <div id="flashcard-actions" className="flex flex-wrap justify-center gap-3 w-full">
            <button 
              id="prev-card-btn" 
              className={`${styles.btnSecondary} text-white px-6 py-3 rounded-lg font-medium flex items-center justify-center space-x-2 flex-1 min-w-[120px]`}
              onClick={handlePrevCard}
            >
              <i className="fas fa-chevron-left"></i>
              <span>上一张</span>
            </button>
            <button 
              id="next-card-btn" 
              className={`${styles.btnSecondary} text-white px-6 py-3 rounded-lg font-medium flex items-center justify-center space-x-2 flex-1 min-w-[120px]`}
              onClick={handleNextCard}
            >
              <span>下一张</span>
              <i className="fas fa-chevron-right"></i>
            </button>
            <button 
              id="mark-learned-btn" 
              className={`${styles.btnTertiary} text-white px-6 py-3 rounded-lg font-medium flex items-center justify-center space-x-2 flex-1 min-w-[150px]`}
              onClick={handleMarkLearned}
            >
              <i className="fas fa-check-circle"></i>
              <span>{currentWord?.status === 'learned' ? '标记为未学会' : '标记为已学会'}</span>
            </button>
            <button 
              id="flip-card-btn" 
              className={`${styles.btnPrimary} text-white px-8 py-3 rounded-lg font-medium flex items-center justify-center space-x-2 flex-1 min-w-[150px]`}
              onClick={handleFlipCard}
            >
              <i className="fas fa-sync-alt"></i>
              <span>{isFlashcardFlipped ? '查看单词' : '翻转卡片'}</span>
            </button>
          </div>
          </>
          )}
        </section>

        {/* 单词列表 */}
        <section id="word-list-section" className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-text-primary flex items-center space-x-2">
              <i className="fas fa-list-ul text-primary"></i>
              <span>单词列表</span>
            </h3>
          </div>
          
          <div id="word-list" className="bg-white rounded-2xl shadow-card overflow-hidden">
            {wordsData.map((word, index) => (
              <div 
                key={word.id}
                id={`word-item-${word.id}`} 
                className={`${styles.wordItem} p-4 ${index < wordsData.length - 1 ? 'border-b border-border-light' : ''} flex justify-between items-center hover:bg-gray-50 transition-colors cursor-pointer`}
                onClick={() => handleWordItemClick(word.id)}
              >
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-lg font-medium text-text-primary">{word.word.toLowerCase()}</span>
                    <span className={styles.wordTag}>{word.partOfSpeech}</span>
                  </div>
                  <p className="text-text-secondary text-sm">{word.meaning}</p>
                </div>
                <div className="flex items-center space-x-3">
                  <button 
                    id={`delete-word-${word.id}-btn`} 
                    className="text-text-secondary hover:text-danger transition-colors p-1"
                    onClick={(e) => handleDeleteWord(word.id, e)}
                    title="删除单词"
                  >
                    <i className="fas fa-trash-alt"></i>
                  </button>
                  <div className={`w-2 h-2 rounded-full ${
                    word.status === 'learned' ? 'bg-success' : 
                    word.status === 'learning' ? 'bg-warning' : 'bg-gray-300'
                  }`}></div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* 底部导航栏（移动端） */}
      <nav id="mobile-nav" className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-border-light z-40">
        <div className="flex justify-around items-center h-16 px-4">
          <Link to="/home" id="mobile-nav-home" className={`${styles.navItem} flex flex-col items-center space-y-1 py-2 text-text-secondary`}>
            <i className="fas fa-home text-lg"></i>
            <span className="text-xs">首页</span>
          </Link>
          <Link to="/history" id="mobile-nav-history" className={`${styles.navItem} flex flex-col items-center space-y-1 py-2 text-text-secondary`}>
            <i className="fas fa-history text-lg"></i>
            <span className="text-xs">历史</span>
          </Link>
          <Link to="/flashcard" id="mobile-nav-flashcard" className={`${styles.navItem} ${styles.active} flex flex-col items-center space-y-1 py-2`}>
            <i className="fas fa-clone text-lg"></i>
            <span className="text-xs">单词卡</span>
          </Link>
        </div>
      </nav>

      {/* 操作成功提示 */}
      <div 
        id="success-toast" 
        className={`fixed top-20 right-4 bg-success text-white px-4 py-2 rounded-lg shadow-lg transform transition-transform duration-300 z-50 ${
          showSuccessToast ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <i className="fas fa-check mr-2"></i>
        <span>操作成功</span>
      </div>
    </div>
  );
};

export default FlashcardPage;

