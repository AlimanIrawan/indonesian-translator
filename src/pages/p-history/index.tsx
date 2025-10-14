

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import styles from './styles.module.css';
import { HistoryService, type HistoryItem } from '../../services/storage';

const HistoryPage: React.FC = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [viewingItem, setViewingItem] = useState<HistoryItem | null>(null); // 正在查看的历史记录

  const itemsPerPage = 10;
  const totalPages = Math.ceil(historyItems.length / itemsPerPage);

  // 加载历史记录
  useEffect(() => {
    const originalTitle = document.title;
    document.title = '历史记录 - 印中图译通';
    loadHistory();
    return () => { 
      document.title = originalTitle; 
    };
  }, []);

  // 加载历史记录数据
  const loadHistory = async () => {
    const history = searchText 
      ? await HistoryService.search(searchText)
      : await HistoryService.getAll();
    console.log('加载历史记录:', history.length, '条');
    setHistoryItems(history);
  };

  // 搜索变化时重新加载
  useEffect(() => {
    loadHistory();
    setCurrentPage(1); // 重置到第一页
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchText]);

  const handleMobileMenuToggle = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const handleClearHistory = () => {
    setShowConfirmDialog(true);
    setSelectedItemId(null); // 清空是删除所有
  };

  const handleConfirmClear = async () => {
    if (selectedItemId) {
      // 删除单条记录
      const success = await HistoryService.delete(selectedItemId);
      if (success) {
        await loadHistory(); // 重新加载
        showSuccessMessage();
      }
    } else {
      // 清空所有记录
      const success = await HistoryService.clear();
      if (success) {
        await loadHistory(); // 重新加载
        showSuccessMessage();
      }
    }
    setShowConfirmDialog(false);
    setSelectedItemId(null);
  };

  const handleCancelClear = () => {
    setShowConfirmDialog(false);
    setSelectedItemId(null);
  };

  const showSuccessMessage = () => {
    setShowSuccessToast(true);
    setTimeout(() => {
      setShowSuccessToast(false);
    }, 2000);
  };

  const handleViewHistoryItem = (itemId: string) => {
    const item = historyItems.find(h => h.id === itemId);
    if (item) {
      setViewingItem(item);
    }
  };

  const handleCloseDetailDialog = () => {
    setViewingItem(null);
  };

  const handleDeleteHistoryItem = (itemId: string) => {
    setSelectedItemId(itemId);
    setShowConfirmDialog(true);
  };

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  // 获取当前页的数据
  const getCurrentPageItems = () => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return historyItems.slice(startIndex, endIndex);
  };

  const currentPageItems = getCurrentPageItems();

  return (
    <div className={styles.pageWrapper}>
      {/* 顶部导航栏 */}
      <header className="bg-white shadow-sm border-b border-border-light sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo和产品名称 */}
            <div className="flex items-center space-x-3">
              <img src="/logo.svg" alt="印中图译通" className="w-10 h-10 rounded-lg shadow-md" />
              <h1 className="text-xl font-bold text-text-primary">印中图译通</h1>
            </div>
            
            {/* 移动端菜单按钮 */}
            <button 
              onClick={handleMobileMenuToggle}
              className="md:hidden p-2 rounded-lg hover:bg-gray-100"
            >
              <i className="fas fa-bars text-text-secondary"></i>
            </button>
            
            {/* 桌面端导航 */}
            <nav className={`${isMobileMenuOpen ? 'block' : 'hidden'} md:flex items-center space-x-8`}>
              <Link to="/home" className={`${styles.navItem} text-text-secondary hover:text-primary py-2`}>
                首页
              </Link>
              <Link to="/history" className={`${styles.navItem} ${styles.active} text-primary font-medium py-2`}>
                历史记录
              </Link>
              <Link to="/flashcard" className={`${styles.navItem} text-text-secondary hover:text-primary py-2`}>
                单词卡片
              </Link>
            </nav>
          </div>
        </div>
      </header>

      {/* 主内容区 */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* 页面头部 */}
        <section className="mb-6">
          <h2 className="text-xl sm:text-2xl font-bold text-text-primary mb-3">翻译历史记录</h2>
          <p className="text-text-secondary text-sm sm:text-base">
            查看您的翻译历史，快速回顾和管理之前的翻译结果
          </p>
        </section>

        {/* 历史记录筛选和操作 */}
        <section className="bg-white rounded-2xl shadow-card p-4 mb-6">
          <div className="flex flex-col gap-4">
            <div className="w-full">
              <div className="relative">
                <input 
                  type="text" 
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  placeholder="搜索翻译内容..." 
                  className="pl-10 pr-4 py-3 border border-border-light rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary w-full"
                />
                <i className="fas fa-search absolute left-3 top-1/2 transform -translate-y-1/2 text-text-secondary"></i>
              </div>
            </div>
            <div className="flex justify-center">
              <button 
                onClick={handleClearHistory}
                className="border border-danger text-danger px-6 py-3 rounded-lg font-medium flex items-center space-x-2 hover:bg-danger/10 transition-colors w-full max-w-xs"
              >
                <i className="fas fa-trash-alt"></i>
                <span>清空历史</span>
              </button>
            </div>
          </div>
        </section>

        {/* 历史记录列表 */}
        <section className="space-y-4">
          {currentPageItems.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-card p-12 text-center">
              <i className="fas fa-inbox text-6xl text-gray-300 mb-4"></i>
              <h3 className="text-lg font-semibold text-text-primary mb-2">暂无历史记录</h3>
              <p className="text-text-secondary">
                {searchText ? '没有找到匹配的记录' : '开始翻译图片，建立你的学习记录吧！'}
              </p>
              {!searchText && (
                <Link
                  to="/home"
                  className="mt-4 inline-block bg-primary text-white px-6 py-2 rounded-lg hover:bg-blue-600 transition-colors"
                >
                  开始翻译
                </Link>
              )}
            </div>
          ) : (
            currentPageItems.map((item) => (
            <div key={item.id} className={`${styles.historyCard} ${styles.fadeIn} p-6`}>
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center space-x-2">
                  <i className="fas fa-history text-primary"></i>
                  <span className="text-sm text-text-secondary">{item.timestamp}</span>
                </div>
                <div className="flex space-x-2">
                  <button 
                    onClick={() => handleViewHistoryItem(item.id)}
                    className="text-primary hover:text-blue-700 transition-colors p-1"
                  >
                    <i className="fas fa-eye"></i>
                  </button>
                  <button 
                    onClick={() => handleDeleteHistoryItem(item.id)}
                    className="text-text-secondary hover:text-danger transition-colors p-1"
                  >
                    <i className="fas fa-trash-alt"></i>
                  </button>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-start">
                  <span className="text-sm font-medium text-text-secondary w-16">印尼语：</span>
                  <p className="text-text-primary flex-1 line-clamp-2">{item.indonesian}</p>
                </div>
                <div className="flex items-start">
                  <span className="text-sm font-medium text-text-secondary w-16">中文：</span>
                  <p className="text-text-primary flex-1 line-clamp-2">{item.chinese}</p>
                </div>
              </div>
            </div>
          ))
          )}
        </section>

        {/* 分页控件 */}
        {totalPages > 1 && (
        <section className="mt-6 flex justify-center">
          <div className="flex items-center space-x-1 sm:space-x-2 overflow-x-auto pb-2">
            <button 
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className={`w-10 h-10 flex items-center justify-center rounded-lg border border-border-light text-text-secondary hover:border-primary hover:text-primary transition-colors ${
                currentPage === 1 ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              <i className="fas fa-chevron-left"></i>
            </button>
            <button 
              onClick={() => handlePageChange(1)}
              className={`w-10 h-10 flex items-center justify-center rounded-lg ${
                currentPage === 1 ? 'bg-primary text-white' : 'border border-border-light text-text-secondary hover:border-primary hover:text-primary transition-colors'
              }`}
            >
              1
            </button>
            <button 
              onClick={() => handlePageChange(2)}
              className={`w-10 h-10 flex items-center justify-center rounded-lg ${
                currentPage === 2 ? 'bg-primary text-white' : 'border border-border-light text-text-secondary hover:border-primary hover:text-primary transition-colors'
              }`}
            >
              2
            </button>
            <button 
              onClick={() => handlePageChange(3)}
              className={`w-10 h-10 flex items-center justify-center rounded-lg ${
                currentPage === 3 ? 'bg-primary text-white' : 'border border-border-light text-text-secondary hover:border-primary hover:text-primary transition-colors'
              }`}
            >
              3
            </button>
            <span className="text-text-secondary whitespace-nowrap">...</span>
            <button 
              onClick={() => handlePageChange(10)}
              className={`w-10 h-10 flex items-center justify-center rounded-lg ${
                currentPage === 10 ? 'bg-primary text-white' : 'border border-border-light text-text-secondary hover:border-primary hover:text-primary transition-colors'
              }`}
            >
              10
            </button>
            <button 
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className={`w-10 h-10 flex items-center justify-center rounded-lg border border-border-light text-text-secondary hover:border-primary hover:text-primary transition-colors ${
                currentPage === totalPages ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              <i className="fas fa-chevron-right"></i>
            </button>
          </div>
        </section>
        )}
      </main>

      {/* 底部导航栏（移动端） */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-border-light z-40">
        <div className="flex justify-around items-center h-16 px-4">
          <Link to="/home" className={`${styles.navItem} flex flex-col items-center space-y-1 py-2 text-text-secondary`}>
            <i className="fas fa-home text-lg"></i>
            <span className="text-xs">首页</span>
          </Link>
          <Link to="/history" className={`${styles.navItem} ${styles.active} flex flex-col items-center space-y-1 py-2`}>
            <i className="fas fa-history text-lg"></i>
            <span className="text-xs">历史</span>
          </Link>
          <Link to="/flashcard" className={`${styles.navItem} flex flex-col items-center space-y-1 py-2 text-text-secondary`}>
            <i className="fas fa-clone text-lg"></i>
            <span className="text-xs">单词卡</span>
          </Link>
        </div>
      </nav>

      {/* 确认对话框 */}
      {showConfirmDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-text-primary mb-4">确认操作</h3>
            <p className="text-text-secondary mb-6">
              {selectedItemId 
                ? '您确定要删除这条历史记录吗？此操作无法撤销。' 
                : '您确定要清空所有历史记录吗？此操作无法撤销。'
              }
            </p>
            <div className="flex justify-end space-x-4">
              <button 
                onClick={handleCancelClear}
                className="px-6 py-2 border border-border-light rounded-lg text-text-secondary hover:bg-gray-50 transition-colors"
              >
                取消
              </button>
              <button 
                onClick={handleConfirmClear}
                className="px-6 py-2 bg-danger text-white rounded-lg hover:bg-red-600 transition-colors"
              >
                确认
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 历史记录详情弹窗 */}
      {viewingItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={handleCloseDetailDialog}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-white border-b border-border-light p-6 flex justify-between items-center">
              <h3 className="text-xl font-bold text-text-primary">翻译详情</h3>
              <button onClick={handleCloseDetailDialog} className="text-text-secondary hover:text-text-primary transition-colors">
                <i className="fas fa-times text-xl"></i>
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              <div className="flex items-center text-sm text-text-secondary">
                <i className="fas fa-clock mr-2"></i>
                <span>{viewingItem.timestamp}</span>
              </div>
              
              <div>
                <h4 className="text-sm font-semibold text-text-secondary mb-2">印尼语原文：</h4>
                <p className="text-text-primary whitespace-pre-wrap leading-relaxed">{viewingItem.indonesian}</p>
              </div>
              
              <div>
                <h4 className="text-sm font-semibold text-text-secondary mb-2">中文翻译：</h4>
                <p className="text-text-primary whitespace-pre-wrap leading-relaxed">{viewingItem.chinese}</p>
              </div>
              
              {viewingItem.wordParses && viewingItem.wordParses.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-text-secondary mb-3">词汇解析：</h4>
                  <div className="space-y-3">
                    {viewingItem.wordParses.map((word, index) => (
                      <div key={index} className="bg-gray-50 rounded-lg p-4">
                        <div className="flex items-center space-x-2 mb-2">
                          <span className="text-lg font-bold text-primary">{word.word.toLowerCase()}</span>
                          <span className="text-xs bg-blue-100 text-primary px-2 py-1 rounded">{word.partOfSpeech}</span>
                        </div>
                        <p className="text-text-primary mb-1">{word.meaning}</p>
                        <p className="text-sm text-text-secondary">词根：{word.root}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 操作成功提示 */}
      <div className={`fixed top-20 right-4 bg-success text-white px-4 py-2 rounded-lg shadow-lg transform transition-transform duration-300 z-50 ${
        showSuccessToast ? 'translate-x-0' : 'translate-x-full'
      }`}>
        <i className="fas fa-check mr-2"></i>
        <span>操作成功</span>
      </div>
    </div>
  );
};

export default HistoryPage;

