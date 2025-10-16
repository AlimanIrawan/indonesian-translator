// 检测是否在生产环境
const isProduction = import.meta.env.PROD;

// 只在开发环境导入 OpenAI（生产环境使用后端 API）
let openai: any = null;
if (!isProduction) {
  const OpenAI = (await import('openai')).default;
  openai = new OpenAI({
    apiKey: import.meta.env.VITE_OPENAI_API_KEY,
    dangerouslyAllowBrowser: true
  });
}

/**
 * 词汇解析结果接口
 */
export interface WordParse {
  word: string;
  meaning: string;
  partOfSpeech: string;
  root: string;
}

/**
 * 翻译结果接口
 */
export interface TranslationResult {
  indonesianText: string;
  chineseTranslation: string;
  wordParses: WordParse[];
}

/**
 * 将图片转换为 base64 格式
 */
export const imageToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

/**
 * 使用 GPT-4o mini Vision 识别图片中的印尼语文本并翻译
 * @param imageBase64 图片的 base64 编码
 * @returns 翻译结果
 */
export const translateIndonesianImage = async (
  imageBase64: string
): Promise<TranslationResult> => {
  try {
    // 生产环境：调用后端 API
    if (isProduction) {
      const response = await fetch('/api/translate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ imageBase64 }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Translation failed');
      }

      return await response.json();
    }

    // 开发环境：直接调用 OpenAI
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `你是一个专业的印尼语翻译和语言学习助手。请完成以下任务：

1. 识别图片中的印尼语文本（OCR）- 请仔细、完整地识别所有文字
2. 将识别出的印尼语翻译成中文
3. ⚠️ **核心规则：只提取有标记线的词汇！**
   
   **标记线识别方法（请逐个单词检查）：**
   - 仔细检查每个单词的紧邻位置（通常在正下方 1-5mm 范围）
   - **标记线特征**：手写的横线、斜线、波浪线、虚线等（可能不完全水平、不完全笔直）
   - **识别标准**：
     * 即使标记线很淡、很短、不清晰，只要能看出是独立于文字的额外线条，就应提取
     * 标记线可以是完整的，也可以是断断续续的
     * 宁可对模糊情况宽松判断，不要遗漏真正的标记词汇
   - **有标记线 = 必须提取并解析**
   - **没有标记线 = 绝对不提取**
   - ⚠️ 重要区分：标记线是额外添加的线条，不是字母本身的笔画（如 g、y、p 等字母的下伸部分）
   - 不限制数量，有多少个标记词就提取多少个

请严格按照以下 JSON 格式返回结果：
{
  "indonesianText": "识别出的完整印尼语文本",
  "chineseTranslation": "对应的中文翻译",
  "wordParses": [
    {
      "word": "印尼语单词",
      "meaning": "中文意思",
      "partOfSpeech": "词性（如：名词、动词、形容词等）",
      "root": "词根"
    }
  ]
}

注意事项：
- 保持原文的段落结构和换行
- 词性请用中文表述
- 如果完全没有标记线，wordParses 返回空数组 []
- 确保返回有效的 JSON 格式`
            },
            {
              type: 'image_url',
              image_url: {
                url: imageBase64,
              },
            },
          ],
        },
      ],
      max_tokens: 8000,
      temperature: 0.75, // 平衡准确性和召回率，配合优化的 Prompt
    });

    const content = response.choices[0]?.message?.content;
    
    if (!content) {
      throw new Error('API 返回内容为空');
    }

    // 解析 JSON 响应
    // 先尝试提取 JSON 代码块
    let jsonStr = content;
    const jsonMatch = content.match(/```json\n?([\s\S]*?)\n?```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1];
    } else {
      // 如果没有代码块，尝试查找 JSON 对象
      const objMatch = content.match(/\{[\s\S]*\}/);
      if (objMatch) {
        jsonStr = objMatch[0];
      }
    }

    const result: TranslationResult = JSON.parse(jsonStr.trim());

    // 验证结果格式
    if (!result.indonesianText || !result.chineseTranslation) {
      throw new Error('API 返回格式不正确');
    }

    // 确保 wordParses 是数组
    if (!Array.isArray(result.wordParses)) {
      result.wordParses = [];
    }

    return result;
  } catch (error) {
    console.error('OpenAI API 调用失败:', error);
    
    // 提供更友好的错误信息
    if (error instanceof Error) {
      if (error.message.includes('API key')) {
        throw new Error('API Key 配置错误，请检查环境变量');
      } else if (error.message.includes('quota')) {
        throw new Error('API 配额已用完，请检查账户余额');
      } else if (error.message.includes('network')) {
        throw new Error('网络连接失败，请检查网络设置');
      }
    }
    
    throw error;
  }
};

/**
 * 估算 API 调用成本（仅供参考）
 * @returns 估算的成本（美元）
 */
export const estimateCost = (): number => {
  // GPT-4o 定价：
  // 输入: $2.50 / 1M tokens
  // 输出: $10.00 / 1M tokens
  
  // 估算：
  // - 图片约 85-250 tokens (取决于尺寸)
  // - Prompt 约 250 tokens
  // - 输出约 1000 tokens (提高了 max_tokens)
  
  const inputTokens = 250 + 150; // prompt + average image tokens
  const outputTokens = 1000;
  
  const inputCost = (inputTokens / 1_000_000) * 2.50;
  const outputCost = (outputTokens / 1_000_000) * 10.00;
  
  return inputCost + outputCost; // 约 $0.011 (¥0.08)
};

