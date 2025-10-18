import { useState, useEffect, useRef } from 'react';

/**
 * Web Speech API Hook - 印尼语语音合成
 * 提供文本转语音功能，支持印尼语
 */
export const useSpeech = () => {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    // 检测浏览器支持
    setIsSupported('speechSynthesis' in window);

    // 预加载语音列表（某些浏览器需要）
    if ('speechSynthesis' in window) {
      window.speechSynthesis.getVoices();
    }

    // 清理函数
    return () => {
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  /**
   * 播放印尼语文本
   * @param text 要播放的印尼语文本
   */
  const speak = (text: string) => {
    if (!isSupported || !text.trim()) return;

    // 停止当前播放
    window.speechSynthesis.cancel();

    try {
      const utterance = new SpeechSynthesisUtterance(text);
      utteranceRef.current = utterance;

      // 设置印尼语
      utterance.lang = 'id-ID';

      // 尝试选择印尼语语音
      const voices = window.speechSynthesis.getVoices();
      const indonesianVoice = voices.find(v => v.lang.startsWith('id'));
      if (indonesianVoice) {
        utterance.voice = indonesianVoice;
      }

      // 设置语音参数
      utterance.rate = 0.9; // 稍慢一点，更清晰
      utterance.pitch = 1.0;
      utterance.volume = 1.0;

      // 事件监听
      utterance.onstart = () => {
        setIsSpeaking(true);
      };

      utterance.onend = () => {
        setIsSpeaking(false);
      };

      utterance.onerror = (event) => {
        console.error('Speech synthesis error:', event.error);
        setIsSpeaking(false);
      };

      // 开始播放
      window.speechSynthesis.speak(utterance);
    } catch (error) {
      console.error('Failed to speak:', error);
      setIsSpeaking(false);
    }
  };

  /**
   * 停止播放
   */
  const stop = () => {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  };

  /**
   * 切换播放/停止
   * @param text 要播放的文本
   */
  const toggle = (text: string) => {
    if (isSpeaking) {
      stop();
    } else {
      speak(text);
    }
  };

  return {
    speak,
    stop,
    toggle,
    isSpeaking,
    isSupported,
  };
};

