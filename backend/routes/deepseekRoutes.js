// routes/deepseekRoutes.js
import express from 'express';
import axios from 'axios';
import { GoogleGenerativeAI } from '@google/generative-ai';
import OpenAI from 'openai';

const router = express.Router();

// ============================================================
//  HELPER: Parse AI response – strips fences, extracts JSON,
//          and returns a clean array of { title, snippet, content, category, tags }
// ============================================================
const parseAIResponse = (content, isCompose = false) => {
  // 1. Clean input
  let clean = content.trim();

  // 2. Remove markdown code fences (```json ... ``` or ``` ... ```)
  clean = clean.replace(/^```(?:json)?\s*/, '').replace(/```\s*$/, '');

  // 3. Extract JSON object or array using regex
  const jsonMatch = clean.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
  if (jsonMatch) {
    clean = jsonMatch[0];
  }

  let results = [];
  try {
    const parsed = JSON.parse(clean);
    if (Array.isArray(parsed)) {
      results = parsed.map(item => ({
        title: item.title || 'Untitled',
        snippet: item.snippet || item.description || '',
        content: item.content || item.snippet || '',
        category: item.category || '',
        tags: item.tags || [],
      }));
    } else {
      results = [{
        title: parsed.title || 'Untitled',
        snippet: parsed.snippet || parsed.description || '',
        content: parsed.content || parsed.snippet || '',
        category: parsed.category || '',
        tags: parsed.tags || [],
      }];
    }
  } catch (error) {
    // 4. Fallback: manually extract fields if JSON.parse fails
    let extracted = {};
    try {
      const titleMatch = clean.match(/"title"\s*:\s*"([^"]*)"/);
      const snippetMatch = clean.match(/"snippet"\s*:\s*"([^"]*)"/);
      const contentMatch = clean.match(/"content"\s*:\s*"([^"]*)"/);
      if (titleMatch) extracted.title = titleMatch[1];
      if (snippetMatch) extracted.snippet = snippetMatch[1];
      if (contentMatch) extracted.content = contentMatch[1];
    } catch (_) {}

    results = [{
      title: extracted.title || (isCompose ? '💡 Quick Idea' : 'Search Result'),
      snippet: extracted.snippet || (typeof clean === 'string' ? clean.substring(0, 200) : ''),
      content: extracted.content || (typeof clean === 'string' ? clean : ''),
      category: extracted.category || '',
      tags: [],
    }];
  }

  // 5. Extra safety: if content still contains JSON braces, try one more parse
  results.forEach(item => {
    if (item.content && item.content.startsWith('{') && item.content.endsWith('}')) {
      try {
        const inner = JSON.parse(item.content);
        item.content = inner.content || inner.snippet || item.content;
      } catch (_) {}
    }
    // Ensure category is set
    if (!item.category) {
      const lower = (item.title + item.snippet + item.content).toLowerCase();
      const categories = [
        'Business', 'Technology', 'Lifestyle', 'Health', 'Education',
        'Entertainment', 'Sports', 'Fashion', 'Food', 'Travel',
        'Finance', 'Science', 'Politics', 'Culture', 'Design',
        'Marketing', 'Startup', 'Other'
      ];
      const found = categories.find(cat => lower.includes(cat.toLowerCase()));
      item.category = found || 'Other';
    }
  });

  return results;
};

// ============================================================
//  GEMINI SEARCH
// ============================================================
const searchGemini = async (query, apiKey) => {
  const genAI = new GoogleGenerativeAI(apiKey);
  const models = ['gemini-3-flash-preview', 'gemini-2.5-flash', 'gemini-2.5-flash-lite', 'gemini-3.1-flash-lite'];
  let lastError;
  for (const modelName of models) {
    try {
      const model = genAI.getGenerativeModel({ model: modelName });
      const prompt = `Search for trending news and topics about: "${query}". Return results as a JSON array with objects containing 'title', 'snippet', and 'content' fields. ONLY respond with valid JSON. Do not include any extra text.`;
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      console.log(`✅ Gemini search model "${modelName}" succeeded`);
      return parseAIResponse(text, false);
    } catch (error) {
      console.warn(`⚠️ Gemini search model "${modelName}" failed:`, error.message);
      lastError = error;
    }
  }
  throw lastError;
};

// ============================================================
//  GEMINI COMPOSE / CHAT
// ============================================================
const composeGemini = async (query, apiKey, context = {}) => {
  const genAI = new GoogleGenerativeAI(apiKey);
  const models = ['gemini-3-flash-preview', 'gemini-2.5-flash', 'gemini-2.5-flash-lite', 'gemini-3.1-flash-lite'];
  let lastError;

  const contextPrompt = context.content ? `\nCurrent article content:\n"${context.content.substring(0, 300)}..."` : '';
  const historyPrompt = context.chatHistory ? `\nPrevious conversation history:\n${context.chatHistory}` : '';

  const categoriesList = [
    'Business', 'Technology', 'Lifestyle', 'Health', 'Education',
    'Entertainment', 'Sports', 'Fashion', 'Food', 'Travel',
    'Finance', 'Science', 'Politics', 'Culture', 'Design',
    'Marketing', 'Startup', 'Other'
  ];

  for (const modelName of models) {
    try {
      const model = genAI.getGenerativeModel({ model: modelName });
      const prompt = `
        You are a helpful writing assistant. ${contextPrompt} ${historyPrompt}
        ${context.content ? 'Modify the content based on the user\'s request.' : 'Write a new article about:'} "${query}".
        Return a JSON object with the following fields:
        - title (string): a catchy headline
        - snippet (string): a one‑sentence summary (max 15 words)
        - content (string): the article body with HTML tags (use <h2> for subheadings, <p> for paragraphs, <ul> for lists)
        - category (string): MUST be one of: ${categoriesList.join(', ')}
        - tags (array of strings): 3‑5 relevant keywords

        IMPORTANT: You MUST include a valid category from the list.
        ONLY respond with valid JSON. Do not include any extra text, markdown, or explanations.
      `;
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      console.log(`✅ Gemini compose model "${modelName}" succeeded`);
      const parsedResults = parseAIResponse(text, true);
      return parsedResults;
    } catch (error) {
      console.warn(`⚠️ Gemini compose model "${modelName}" failed:`, error.message);
      lastError = error;
    }
  }
  throw lastError;
};

// ============================================================
//  OPENAI SEARCH
// ============================================================
const searchOpenAI = async (query, apiKey) => {
  const openai = new OpenAI({ apiKey });
  const completion = await openai.chat.completions.create({
    model: 'gpt-3.5-turbo',
    messages: [
      { role: 'system', content: 'You are a helpful assistant. Return results as a JSON array with objects containing title, snippet, and content fields. Only respond with valid JSON. No extra text.' },
      { role: 'user', content: `Search for trending news and topics about: ${query}` },
    ],
    temperature: 0.7,
    max_tokens: 500,
  });
  const content = completion.choices[0].message.content;
  return parseAIResponse(content, false);
};

// ============================================================
//  DEEPSEEK SEARCH
// ============================================================
const searchDeepSeek = async (query, apiKey) => {
  const response = await axios.post(
    'https://api.deepseek.com/v1/chat/completions',
    {
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: 'You are a helpful assistant. Return results as a JSON array with objects containing title, snippet, and content fields. Only respond with valid JSON. No extra text.' },
        { role: 'user', content: `Search for trending news and topics about: ${query}` },
      ],
      temperature: 0.7,
      max_tokens: 500,
    },
    {
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      timeout: 15000,
    }
  );
  const content = response.data.choices[0].message.content;
  return parseAIResponse(content, false);
};

// ============================================================
//  NEWSAPI FALLBACK
// ============================================================
const searchNewsAPI = async (query, apiKey) => {
  const response = await axios.get(
    `https://newsapi.org/v2/everything?q=${encodeURIComponent(query)}&apiKey=${apiKey}&pageSize=10&language=en&sortBy=relevancy`,
    { timeout: 10000 }
  );
  return response.data.articles.map(article => ({
    title: article.title || 'Untitled',
    snippet: article.description || article.title || '',
    content: article.content || article.description || article.title || '',
    category: '',
    tags: [],
  }));
};

// ============================================================
//  MAIN ROUTE
// ============================================================
router.post('/search', async (req, res) => {
  console.log('📨 Received body:', req.body);

  const { query, mode = 'search', context = {} } = req.body;

  if (!query || typeof query !== 'string' || query.trim().length === 0) {
    console.error('❌ Empty query received');
    return res.status(400).json({ error: 'Query is required' });
  }

  const cleanedQuery = query.trim();
  const geminiKey = process.env.GEMINI_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;
  const deepseekKey = process.env.DEEPSEEK_API_KEY;
  const newsKey = process.env.NEWS_API_KEY;

  // ── Compose / Chat mode ──
  if (mode === 'compose' || mode === 'chat') {
    if (geminiKey) {
      try {
        console.log(`🧠 ${mode === 'chat' ? 'Chat' : 'Compose'}: "${cleanedQuery}"`);
        const results = await composeGemini(cleanedQuery, geminiKey, context);
        console.log(`✅ ${mode === 'chat' ? 'Chat' : 'Compose'} returned ${results.length} results`);
        return res.json({ results });
      } catch (error) {
        console.error(`❌ ${mode === 'chat' ? 'Chat' : 'Compose'} error:`, error.message);
      }
    }

    // Fallback to NewsAPI
    if (newsKey) {
      try {
        console.log(`📰 NewsAPI fallback for ${mode}: "${cleanedQuery}"`);
        const articles = await searchNewsAPI(cleanedQuery, newsKey);
        const results = articles.slice(0, 3).map(article => ({
          title: article.title,
          snippet: article.snippet,
          content: `<h2>Quick Take</h2><p>${article.content || article.snippet}</p>`,
          category: 'General',
          tags: ['news', ...cleanedQuery.split(' ').slice(0, 3)],
        }));
        console.log(`✅ NewsAPI ${mode} returned ${results.length} results`);
        return res.json({ results });
      } catch (error) {
        console.error(`❌ NewsAPI ${mode} error:`, error.message);
      }
    }

    return res.status(500).json({ error: 'Unable to generate content. Please try again later.' });
  }

  // ── Search mode ──
  if (geminiKey) {
    try {
      console.log(`🧠 Gemini search: "${cleanedQuery}"`);
      const results = await searchGemini(cleanedQuery, geminiKey);
      console.log(`✅ Gemini search returned ${results.length} results`);
      return res.json({ results });
    } catch (error) {
      console.error(`❌ Gemini search error:`, error.message);
    }
  }

  if (openaiKey) {
    try {
      console.log(`🧠 OpenAI search: "${cleanedQuery}"`);
      const results = await searchOpenAI(cleanedQuery, openaiKey);
      console.log(`✅ OpenAI search returned ${results.length} results`);
      return res.json({ results });
    } catch (error) {
      console.error(`❌ OpenAI search error:`, error.message);
    }
  }

  if (deepseekKey) {
    try {
      console.log(`🔍 DeepSeek search: "${cleanedQuery}"`);
      const results = await searchDeepSeek(cleanedQuery, deepseekKey);
      console.log(`✅ DeepSeek search returned ${results.length} results`);
      return res.json({ results });
    } catch (error) {
      console.error(`❌ DeepSeek search error:`, error.message);
    }
  }

  if (newsKey) {
    try {
      console.log(`📰 NewsAPI search fallback for: "${cleanedQuery}"`);
      const results = await searchNewsAPI(cleanedQuery, newsKey);
      console.log(`✅ NewsAPI search returned ${results.length} results`);
      return res.json({ results });
    } catch (error) {
      console.error(`❌ NewsAPI search error:`, error.message);
    }
  }

  console.error('❌ No API keys available');
  return res.status(500).json({ error: 'Search service unavailable. Please check your API configuration.' });
});

export default router;