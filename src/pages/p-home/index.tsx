

import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import styles from './styles.module.css';
import { translateIndonesianImage, type WordParse, type TranslationResult } from '../../services/openai';
import { HistoryService, FlashcardService } from '../../services/storage';
import ImageCropper from '../../components/ImageCropper';

const HomePage: React.FC = () => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showCopyToast, setShowCopyToast] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showSaveSuccessToast, setShowSaveSuccessToast] = useState(false);
  const [showCropper, setShowCropper] = useState(false);
  const [originalImage, setOriginalImage] = useState<string | null>(null);

  // 翻译结果数据
  const [indonesianText, setIndonesianText] = useState<string>('');
  const [chineseTranslation, setChineseTranslation] = useState<string>('');
  const [wordParses, setWordParses] = useState<WordParse[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const originalTitle = document.title;
    document.title = '印中图译通 - 印尼语图片翻译与词汇解析';
    return () => { document.title = originalTitle; };
  }, []);

  const handleFileSelect = (file: File) => {
    if (file) {
      // 验证文件类型
      if (!file.type.startsWith('image/')) {
        setErrorMessage('请上传图片文件（JPG、PNG、JPEG 格式）');
        return;
      }

      // 验证文件大小（限制为 10MB）
      if (file.size > 10 * 1024 * 1024) {
        setErrorMessage('图片文件过大，请上传小于 10MB 的图片');
        return;
      }

      setSelectedFile(file);
      setErrorMessage(null);
      
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          const imageData = e.target.result as string;
          setOriginalImage(imageData);
          setShowCropper(true); // 显示裁剪界面
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCropComplete = (croppedImage: string) => {
    setSelectedImage(croppedImage);
    setShowCropper(false);
  };

  const handleCropSkip = () => {
    // 跳过裁剪，直接使用原图
    setSelectedImage(originalImage);
    setShowCropper(false);
  };

  const handleCropCancel = () => {
    setShowCropper(false);
    setOriginalImage(null);
    setSelectedFile(null);
  };

  const handleUploadAreaClick = () => {
    if (!selectedImage && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleCameraClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    console.log('调用设备相机功能');
    if (cameraInputRef.current) {
      cameraInputRef.current.click();
    }
  };

  const handleGalleryClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      handleFileSelect(e.target.files[0]);
    }
  };

  const handleCameraInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      handleFileSelect(e.target.files[0]);
    }
  };

  const handleStartTranslate = async () => {
    if (!selectedImage || !selectedFile) {
      setErrorMessage('请先选择一张图片');
      return;
    }

    console.log('正在处理图片内容并进行翻译...');
    setIsProcessing(true);
    setErrorMessage(null);
    setShowResults(false);

    try {
      // 调用 OpenAI API 进行图片识别和翻译
      const result: TranslationResult = await translateIndonesianImage(selectedImage);
      
      console.log('🔍 AI 返回的词汇数量:', result.wordParses.length);
      console.log('📝 AI 返回的词汇列表:', result.wordParses.map(w => w.word).join(', '));
      
      // 更新结果状态
      setIndonesianText(result.indonesianText);
      setChineseTranslation(result.chineseTranslation);
      setWordParses(result.wordParses);
      
      // 保存到历史记录（不保存图片以节省空间）
      const savedHistory = await HistoryService.add({
        indonesian: result.indonesianText,
        chinese: result.chineseTranslation,
        wordParses: result.wordParses,
        // imageUrl: selectedImage, // 不保存图片，避免超出 localStorage 限额
      });
      console.log('✅ 已保存到历史记录:', savedHistory);

      // 保存到单词卡片
      if (result.wordParses.length > 0) {
        const savedCards = await FlashcardService.addBatch(
          result.wordParses,
          result.indonesianText,
          result.chineseTranslation
        );
        console.log('✅ 已保存到单词卡片:', savedCards.length, '个单词');
      }
      
      // 验证保存
      const allHistory = await HistoryService.getAll();
      const allCards = await FlashcardService.getAll();
      console.log('📊 当前历史记录总数:', allHistory.length);
      console.log('📊 当前单词卡片总数:', allCards.length);
      
      setIsProcessing(false);
      setShowResults(true);
      
      // 显示保存成功提示
      setShowSaveSuccessToast(true);
      setTimeout(() => {
        setShowSaveSuccessToast(false);
      }, 3000);
      
      // 滚动到结果区域
      setTimeout(() => {
        const resultsSection = document.getElementById('results-section');
        if (resultsSection) {
          resultsSection.scrollIntoView({ behavior: 'smooth' });
        }
      }, 100);
    } catch (error) {
      setIsProcessing(false);
      
      if (error instanceof Error) {
        setErrorMessage(`翻译失败：${error.message}`);
      } else {
        setErrorMessage('翻译失败，请稍后重试');
      }
      
      console.error('翻译错误:', error);
    }
  };

  const handleReplaceImage = () => {
    setSelectedImage(null);
    setSelectedFile(null);
    setShowResults(false);
    setErrorMessage(null);
    setIndonesianText('');
    setChineseTranslation('');
    setWordParses([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    if (cameraInputRef.current) {
      cameraInputRef.current.value = '';
    }
  };

  const handleNewTranslation = () => {
    setShowResults(false);
    setSelectedImage(null);
    setSelectedFile(null);
    setErrorMessage(null);
    setIndonesianText('');
    setChineseTranslation('');
    setWordParses([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    if (cameraInputRef.current) {
      cameraInputRef.current.value = '';
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setShowCopyToast(true);
      setTimeout(() => {
        setShowCopyToast(false);
      }, 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  const handleDownloadResult = () => {
    const content = `印尼语原文：\n${indonesianText}\n\n中文翻译：\n${chineseTranslation}\n\n重点词汇解析：\n${wordParses.map(word => 
      `${word.word}：${word.meaning} / ${word.partOfSpeech} / 词根：${word.root}`
    ).join('\n')}`;
    
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `翻译结果_${new Date().toLocaleString('zh-CN').replace(/[/:]/g, '-')}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      handleFileSelect(file);
    }
  };

  const handleMobileMenuToggle = () => {
    setShowMobileMenu(!showMobileMenu);
  };

  return (
    <div className={styles.pageWrapper}>
      {/* 图片裁剪界面 */}
      {showCropper && originalImage && (
        <ImageCropper
          image={originalImage}
          onCropComplete={handleCropComplete}
          onSkip={handleCropSkip}
          onCancel={handleCropCancel}
        />
      )}
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
            <nav className={`${showMobileMenu ? 'block' : 'hidden'} md:flex items-center space-x-8`}>
              <Link to="/home" className={`${styles.navItem} ${styles.active} text-primary font-medium py-2`}>
                首页
              </Link>
              <Link to="/history" className={`${styles.navItem} text-text-secondary hover:text-primary py-2`}>
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
        {/* 错误提示 */}
        {errorMessage && (
          <div className="mb-6 bg-red-50 border-l-4 border-danger rounded-lg p-4 flex items-start space-x-3">
            <i className="fas fa-exclamation-circle text-danger text-xl mt-0.5"></i>
            <div className="flex-1">
              <h3 className="font-semibold text-danger mb-1">错误</h3>
              <p className="text-sm text-red-700">{errorMessage}</p>
            </div>
            <button 
              onClick={() => setErrorMessage(null)}
              className="text-red-400 hover:text-danger transition-colors"
            >
              <i className="fas fa-times"></i>
            </button>
          </div>
        )}

        {/* 页面头部 */}
        <section className="text-center mb-6">
          <h2 className="text-xl sm:text-2xl font-bold text-text-primary mb-3">印尼语图片翻译与词汇解析</h2>
          <p className="text-text-secondary text-sm sm:text-base">
            通过拍照或上传图片，快速识别印尼语文本并精准翻译，重点词汇深度解析，助力高效学习
          </p>
        </section>

        {/* 图片获取区域 */}
        <section className="mb-6">
          <div className="bg-white rounded-2xl shadow-card p-4 sm:p-6 text-center">
            {/* 上传区域 */}
            <div 
              className={`${styles.uploadArea} ${isDragOver ? styles.dragover : ''} rounded-xl p-6 sm:p-8 mb-6 cursor-pointer`}
              onClick={handleUploadAreaClick}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              {!selectedImage ? (
                <div className="space-y-4">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto">
                    <i className="fas fa-cloud-upload-alt text-3xl text-text-secondary"></i>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-text-primary mb-2">点击上传或拖拽图片到此处</h3>
                    <p className="text-text-secondary text-sm">支持 JPG、PNG、JPEG 格式，建议图片清晰</p>
                  </div>
                  <div className="flex flex-col sm:flex-row justify-center space-y-3 sm:space-y-0 sm:space-x-4 mt-6">
                    <button 
                      onClick={handleCameraClick}
                      className={`${styles.btnPrimary} text-white px-6 py-3 rounded-lg font-medium flex items-center justify-center space-x-2 w-full sm:w-auto`}
                    >
                      <i className="fas fa-camera"></i>
                      <span>拍照</span>
                    </button>
                    <button 
                      onClick={handleGalleryClick}
                      className={`${styles.btnSecondary} text-white px-6 py-3 rounded-lg font-medium flex items-center justify-center space-x-2 w-full sm:w-auto`}
                    >
                      <i className="fas fa-images"></i>
                      <span>从相册选择</span>
                    </button>
                  </div>
                </div>
              ) : (
                /* 图片预览 */
                <div>
                  <img 
                    src={selectedImage} 
                    alt="预览图片" 
                    className="max-w-full h-64 object-cover rounded-lg mx-auto mb-4"
                  />
                  <div className="flex flex-col sm:flex-row justify-center space-y-3 sm:space-y-0 sm:space-x-4">
                    <button 
                      onClick={handleStartTranslate}
                      className={`${styles.btnPrimary} text-white px-8 py-3 rounded-lg font-medium w-full sm:w-auto`}
                    >
                      开始翻译
                    </button>
                    <button 
                      onClick={handleReplaceImage}
                      className={`${styles.btnSecondary} text-white px-6 py-3 rounded-lg font-medium w-full sm:w-auto`}
                    >
                      重新选择
                    </button>
                  </div>
                </div>
              )}
            </div>
            
            {/* 隐藏的文件输入 */}
            <input 
              type="file" 
              ref={fileInputRef}
              accept="image/*" 
              className="hidden"
              onChange={handleFileInputChange}
            />
            <input 
              type="file" 
              ref={cameraInputRef}
              accept="image/*" 
              capture="environment" 
              className="hidden"
              onChange={handleCameraInputChange}
            />
          </div>
        </section>

        {/* 处理状态显示 */}
        {isProcessing && (
          <section className="mb-8">
            <div className="bg-white rounded-2xl shadow-card p-8 text-center">
              <div className={`${styles.loadingSpinner} mx-auto mb-4`}></div>
              <h3 className="text-lg font-semibold text-text-primary mb-2">正在处理中...</h3>
              <p className="text-text-secondary">正在识别图片中的文字并进行翻译</p>
            </div>
          </section>
        )}

        {/* 结果展示区域 */}
        {showResults && (
          <section id="results-section" className="space-y-6">
            {/* 印尼语原文 */}
            <div className={`${styles.resultCard} ${styles.fadeIn} p-6`}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-text-primary flex items-center space-x-2">
                  <i className="fas fa-language text-secondary"></i>
                  <span>印尼语原文</span>
                </h3>
                <button 
                  onClick={() => copyToClipboard(indonesianText)}
                  className="text-primary hover:text-blue-700 transition-colors"
                >
                  <i className="fas fa-copy"></i>
                </button>
              </div>
              <div className="text-text-primary leading-relaxed whitespace-pre-wrap select-text" style={{ userSelect: 'text', WebkitUserSelect: 'text' }}>
                {indonesianText}
              </div>
            </div>

            {/* 中文翻译 */}
            <div className={`${styles.resultCard} ${styles.fadeIn} p-6`}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-text-primary flex items-center space-x-2">
                  <i className="fas fa-globe-asia text-tertiary"></i>
                  <span>中文翻译</span>
                </h3>
                <button 
                  onClick={() => copyToClipboard(chineseTranslation)}
                  className="text-primary hover:text-blue-700 transition-colors"
                >
                  <i className="fas fa-copy"></i>
                </button>
              </div>
              <div className="text-text-primary leading-relaxed whitespace-pre-wrap select-text" style={{ userSelect: 'text', WebkitUserSelect: 'text' }}>
                {chineseTranslation}
              </div>
            </div>

            {/* 单词解析 - 仅在有词汇时显示 */}
            {wordParses.length > 0 && (
            <div className={`${styles.resultCard} ${styles.fadeIn} p-6`}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-text-primary flex items-center space-x-2">
                  <i className="fas fa-book text-warning"></i>
                  <span>重点词汇解析</span>
                </h3>
                <button 
                  onClick={() => {
                    const parseText = wordParses.map(word => 
                      `${word.word}：${word.meaning} / ${word.partOfSpeech} / 词根：${word.root}`
                    ).join('\n');
                    copyToClipboard(parseText);
                  }}
                  className="text-primary hover:text-blue-700 transition-colors"
                >
                  <i className="fas fa-copy"></i>
                </button>
              </div>
              <div className="space-y-4">
                {wordParses.length > 0 ? (
                  wordParses.map((word, index) => (
                    <div key={index} className="border-l-4 border-primary pl-4 py-2 bg-blue-50 rounded-r-lg">
                      <div className="font-semibold text-text-primary">{word.word}</div>
                      <div className="text-sm text-text-secondary mt-1">
                        <span className="block">意思：{word.meaning}</span>
                        <span className="block">词性：{word.partOfSpeech}</span>
                        <span className="block">词根：{word.root}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-text-secondary text-center py-4">
                    未提取到重点词汇
                  </div>
                )}
              </div>
            </div>
            )}

            {/* 结果操作区 */}
            <div className="bg-white rounded-2xl shadow-card p-4">
              <div className="flex flex-col gap-3">
                <button 
                  onClick={handleDownloadResult}
                  className={`${styles.btnPrimary} text-white px-8 py-3 rounded-lg font-medium flex items-center justify-center space-x-2 w-full`}
                >
                  <i className="fas fa-download"></i>
                  <span>下载结果</span>
                </button>
                <div className="grid grid-cols-2 gap-3">
                  <Link
                    to="/history"
                    className="bg-secondary text-white px-6 py-3 rounded-lg font-medium flex items-center justify-center space-x-2 hover:bg-purple-700 transition-colors"
                  >
                    <i className="fas fa-history"></i>
                    <span>查看历史</span>
                  </Link>
                  <Link
                    to="/flashcard"
                    className="bg-tertiary text-white px-6 py-3 rounded-lg font-medium flex items-center justify-center space-x-2 hover:bg-green-700 transition-colors"
                  >
                    <i className="fas fa-clone"></i>
                    <span>学习单词</span>
                  </Link>
                </div>
                <button 
                  onClick={handleNewTranslation}
                  className={`${styles.btnSecondary} text-white px-8 py-3 rounded-lg font-medium flex items-center justify-center space-x-2 w-full`}
                >
                  <i className="fas fa-plus"></i>
                  <span>新的翻译</span>
                </button>
              </div>
            </div>
          </section>
        )}

        {/* 示例展示 */}
        <section className="mt-8">
          <div className="bg-white rounded-2xl shadow-card p-6">
            <h3 className="text-lg font-semibold text-text-primary mb-4 flex items-center space-x-2">
              <i className="fas fa-lightbulb text-warning"></i>
              <span>功能</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <i className="fas fa-camera text-3xl text-primary mb-2"></i>
                <p className="text-sm text-text-secondary">拍摄包含印尼语的图片</p>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <i className="fas fa-magic text-3xl text-secondary mb-2"></i>
                <p className="text-sm text-text-secondary">自动识别并翻译</p>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <i className="fas fa-graduation-cap text-3xl text-tertiary mb-2"></i>
                <p className="text-sm text-text-secondary">学习重点词汇</p>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* 底部导航栏（移动端） */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-border-light z-40">
        <div className="flex justify-around items-center h-16 px-4">
          <Link to="/home" className={`${styles.navItem} ${styles.active} flex flex-col items-center space-y-1 py-2`}>
            <i className="fas fa-home text-lg"></i>
            <span className="text-xs">首页</span>
          </Link>
          <Link to="/history" className={`${styles.navItem} flex flex-col items-center space-y-1 py-2 text-text-secondary`}>
            <i className="fas fa-history text-lg"></i>
            <span className="text-xs">历史</span>
          </Link>
          <Link to="/flashcard" className={`${styles.navItem} flex flex-col items-center space-y-1 py-2 text-text-secondary`}>
            <i className="fas fa-clone text-lg"></i>
            <span className="text-xs">单词卡</span>
          </Link>
        </div>
      </nav>

      {/* 复制成功提示 */}
      <div className={`fixed top-20 right-4 bg-success text-white px-4 py-2 rounded-lg shadow-lg z-50 ${styles.copyToast} ${showCopyToast ? styles.visible : ''}`}>
        <i className="fas fa-check mr-2"></i>
        <span>复制成功</span>
      </div>

      {/* 保存成功提示 */}
      <div className={`fixed top-20 right-4 bg-primary text-white px-6 py-3 rounded-lg shadow-lg z-50 transition-all duration-300 ${showSaveSuccessToast ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}`}>
        <div className="flex items-center space-x-3">
          <i className="fas fa-check-circle text-2xl"></i>
          <div>
            <div className="font-semibold">保存成功！</div>
            <div className="text-sm text-blue-100">已添加到历史记录和单词卡片</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomePage;

