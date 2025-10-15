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

1. 识别图片中的印尼语文本（OCR）- 请仔细、完整地识别所有文字，不要遗漏任何内容
2. 将识别出的印尼语翻译成中文
3. **重点**：识别图片中所有带有下划线的印尼语词汇，并对每个带下划线的词汇进行详细解析
   ⚠️ 注意：不要限制词汇数量！如果图片有15个下划线词汇，就必须全部提取15个！

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

词汇提取规则（非常重要）：
1. **优先级最高**：提取所有在图片中有下划线标注的词汇（下划线通常显示为单词下方的横线）
2. 仔细观察图片，识别哪些词汇下方有下划线，这些词汇是重点学习内容
3. **绝对不要限制数量**：如果图片有10个下划线词汇，就提取10个；有20个就提取20个
4. **只提取有下划线的词汇**，不要自行判断哪些词重要
5. **如果图片中完全没有下划线词汇，wordParses 必须返回空数组 []，不要提取任何词汇**
6. 如果接近 token 上限，优先保证完整输出已开始的词汇

其他注意事项：
- 请识别图片中的所有文字，包括标题、正文、注释等，不要遗漏
- 保持原文的段落结构和换行
- 如果图片中没有印尼语文本，请在 indonesianText 中说明
- 词性请用中文表述（名词、动词、形容词、副词等）
- 确保返回的是有效的 JSON 格式`
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
      temperature: 0.7, // 适中的温度，保持准确性和创造性的平衡
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

