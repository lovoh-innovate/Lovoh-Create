// routes/deepseekRoutes.js
import express from 'express';
import axios from 'axios';
import { GoogleGenerativeAI } from '@google/generative-ai';
import OpenAI from 'openai';

const router = express.Router();

// ── Helper to parse AI response ──────────────────────────────────────────
const parseAIResponse = (content, isCompose = false) => {
  let results = [];
  try {
    const parsed = JSON.parse(content);
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
  } catch {
    results = [{
      title: isCompose ? '💡 Quick Idea' : 'Search Result',
      snippet: content.substring(0, 200),
      content: content,
      category: '',
      tags: [],
    }];
  }
  return results;
};

// ── Gemini Search (unchanged) ─────────────────────────────────────────────
const searchGemini = async (query, apiKey) => {
  const genAI = new GoogleGenerativeAI(apiKey);
  const models = ['gemini-3-flash-preview', 'gemini-2.5-flash', 'gemini-2.5-flash-lite', 'gemini-3.1-flash-lite'];
  let lastError;
  for (const modelName of models) {
    try {
      const model = genAI.getGenerativeModel({ model: modelName });
      const prompt = `Search for trending news and topics about: "${query}". Return results as a JSON array with objects containing 'title', 'snippet', and 'content' fields. Only respond with valid JSON.`;
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

// ── Gemini Compose (FIXED: category is mandatory) ──────────────────────────
const composeGemini = async (query, apiKey, context = {}) => {
  const genAI = new GoogleGenerativeAI(apiKey);
  const models = ['gemini-3-flash-preview', 'gemini-2.5-flash', 'gemini-2.5-flash-lite', 'gemini-3.1-flash-lite'];
  let lastError;

  const contextPrompt = context.content ? `\nCurrent article content:\n"${context.content.substring(0, 300)}..."` : '';
  const historyPrompt = context.chatHistory ? `\nPrevious conversation history:\n${context.chatHistory}` : '';

  // List of valid categories for the instruction
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

        IMPORTANT: You MUST include a valid category from the list. Do not skip it.
        Only respond with valid JSON. No extra text.
      `;
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      console.log(`✅ Gemini compose model "${modelName}" succeeded`);
      const parsedResults = parseAIResponse(text, true);

      // ── Fallback: if category is missing, infer it from content ──────
      parsedResults.forEach(item => {
        if (!item.category) {
          const lowerContent = (item.content + item.title + item.snippet).toLowerCase();
          const inferred = categoriesList.find(cat => lowerContent.includes(cat.toLowerCase()));
          item.category = inferred || 'Other';
        }
      });

      return parsedResults;
    } catch (error) {
      console.warn(`⚠️ Gemini compose model "${modelName}" failed:`, error.message);
      lastError = error;
    }
  }
  throw lastError;
};

// ── OpenAI Search ──────────────────────────────────────────────────────────
const searchOpenAI = async (query, apiKey) => {
  const openai = new OpenAI({ apiKey });
  const completion = await openai.chat.completions.create({
    model: 'gpt-3.5-turbo',
    messages: [
      { role: 'system', content: 'You are a helpful assistant. Return results as a JSON array with objects containing title, snippet, and content fields. Only respond with valid JSON.' },
      { role: 'user', content: `Search for trending news and topics about: ${query}` },
    ],
    temperature: 0.7,
    max_tokens: 500,
  });
  const content = completion.choices[0].message.content;
  return parseAIResponse(content, false);
};

// ── DeepSeek Search ────────────────────────────────────────────────────────
const searchDeepSeek = async (query, apiKey) => {
  const response = await axios.post(
    'https://api.deepseek.com/v1/chat/completions',
    {
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: 'You are a helpful assistant. Return results as a JSON array with objects containing title, snippet, and content fields. Only respond with valid JSON.' },
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

// ── NewsAPI fallback ──────────────────────────────────────────────────────
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

// ── Main route ────────────────────────────────────────────────────────────
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

  // ── Compose or Chat mode ──────────────────────────────────────────────
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

  // ── Search mode ────────────────────────────────────────────────────────────
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