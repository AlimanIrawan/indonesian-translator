import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // 只允许 POST 请求
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { imageBase64 } = req.body;

    if (!imageBase64) {
      return res.status(400).json({ error: 'Missing image data' });
    }

    // 从环境变量获取 API Key（不暴露给前端）
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return res.status(500).json({ error: 'API key not configured' });
    }

    // 调用 OpenAI API
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
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
   
   **标记线识别方法：**
   - 仔细检查每个单词的正下方 1-5mm 范围内是否有标记线
   - **标记线特征**：手写的横线、斜线、波浪线等（可能不完全水平、不完全笔直）
   - **有标记线 = 必须提取并解析**
   - **没有标记线 = 绝对不提取**
   - ⚠️ 注意：不要把单词本身的笔画（如字母底部）误认为标记线
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
        temperature: 0.6,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('OpenAI API error:', error);
      return res.status(response.status).json({ error: 'OpenAI API request failed' });
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;

    if (!content) {
      return res.status(500).json({ error: 'Empty response from OpenAI' });
    }

    // 解析 JSON 响应
    let jsonStr = content;
    const jsonMatch = content.match(/```json\n?([\s\S]*?)\n?```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1];
    } else {
      const objMatch = content.match(/\{[\s\S]*\}/);
      if (objMatch) {
        jsonStr = objMatch[0];
      }
    }

    const result = JSON.parse(jsonStr.trim());

    // 验证结果格式
    if (!result.indonesianText || !result.chineseTranslation) {
      return res.status(500).json({ error: 'Invalid response format' });
    }

    // 确保 wordParses 是数组
    if (!Array.isArray(result.wordParses)) {
      result.wordParses = [];
    }

    return res.status(200).json(result);

  } catch (error) {
    console.error('Translation error:', error);
    return res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Translation failed' 
    });
  }
}

