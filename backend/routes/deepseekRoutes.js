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
      title: isCompose ? 'AI Article Idea' : 'Search Result',
      snippet: content.substring(0, 200),
      content: content,
      category: '',
      tags: [],
    }];
  }
  return results;
};

// ── 1. Gemini Search ──────────────────────────────────────────────────────
const searchGemini = async (query, apiKey) => {
  const genAI = new GoogleGenerativeAI(apiKey);
  const models = [
    'gemini-3-flash-preview',
    'gemini-2.5-flash',
    'gemini-2.5-flash-lite',
    'gemini-3.1-flash-lite',
  ];

  let lastError;
  for (const modelName of models) {
    try {
      const model = genAI.getGenerativeModel({ model: modelName });
      const prompt = `Search for trending news and topics about: ${query}. Return results as a JSON array with objects containing 'title', 'snippet', and 'content' fields. Only respond with valid JSON.`;
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

// ── 2. Gemini Compose ──────────────────────────────────────────────────────
const composeGemini = async (query, apiKey) => {
  const genAI = new GoogleGenerativeAI(apiKey);
  const models = [
    'gemini-3-flash-preview',
    'gemini-2.5-flash',
    'gemini-2.5-flash-lite',
    'gemini-3.1-flash-lite',
  ];

  let lastError;
  for (const modelName of models) {
    try {
      const model = genAI.getGenerativeModel({ model: modelName });
      const prompt = `
        Write a detailed article outline about: "${query}".
        Return a JSON object (or array of objects) with:
        - title: The article title
        - snippet: A short excerpt
        - content: Full article with HTML (use <h2>, <p>, <ul>, <li>)
        - category: one of: ${['Business', 'Technology', 'Lifestyle', 'Health', 'Education', 'Entertainment', 'Sports', 'Fashion', 'Food', 'Travel', 'Finance', 'Science', 'Politics', 'Culture', 'Design', 'Marketing', 'Startup', 'Other'].join(', ')}
        - tags: array of 3-5 keywords
        Only respond with valid JSON.
      `;
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      console.log(`✅ Gemini compose model "${modelName}" succeeded`);
      return parseAIResponse(text, true);
    } catch (error) {
      console.warn(`⚠️ Gemini compose model "${modelName}" failed:`, error.message);
      lastError = error;
    }
  }
  throw lastError;
};

// ── 3. OpenAI Search ──────────────────────────────────────────────────────
const searchOpenAI = async (query, apiKey) => {
  const openai = new OpenAI({ apiKey });
  const completion = await openai.chat.completions.create({
    model: 'gpt-3.5-turbo',
    messages: [
      { role: 'system', content: 'You are a helpful assistant that provides trending news and topics. Return results as a JSON array with objects containing title, snippet, and content fields. Only respond with valid JSON.' },
      { role: 'user', content: `Search for trending news and topics about: ${query}` },
    ],
    temperature: 0.7,
    max_tokens: 500,
  });
  const content = completion.choices[0].message.content;
  return parseAIResponse(content, false);
};

// ── 4. DeepSeek Search ────────────────────────────────────────────────────
const searchDeepSeek = async (query, apiKey) => {
  const response = await axios.post(
    'https://api.deepseek.com/v1/chat/completions',
    {
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: 'You are a helpful assistant that provides trending news and topics. Return results as a JSON array with objects containing title, snippet, and content fields. Only respond with valid JSON.' },
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

// ── 5. NewsAPI fallback ──────────────────────────────────────────────────
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
  console.log('📨 Received body:', req.body); // <- LOG THE REQUEST

  const { query, mode = 'search' } = req.body;

  if (!query || typeof query !== 'string' || query.trim().length === 0) {
    console.error('❌ Empty query received');
    return res.status(400).json({ error: 'Query is required' });
  }

  const cleanedQuery = query.trim();
  const geminiKey = process.env.GEMINI_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;
  const deepseekKey = process.env.DEEPSEEK_API_KEY;
  const newsKey = process.env.NEWS_API_KEY;

  // ── Compose mode ──────────────────────────────────────────────────────────
  if (mode === 'compose') {
    if (geminiKey) {
      try {
        console.log(`🧠 Gemini compose: "${cleanedQuery}"`);
        const results = await composeGemini(cleanedQuery, geminiKey);
        console.log(`✅ Gemini compose returned ${results.length} results`);
        return res.json({ results });
      } catch (error) {
        console.error(`❌ Gemini compose error:`, error.message);
      }
    }

    // Fallback to NewsAPI
    if (newsKey) {
      try {
        console.log(`📰 NewsAPI compose fallback for: "${cleanedQuery}"`);
        const articles = await searchNewsAPI(cleanedQuery, newsKey);
        const results = articles.slice(0, 3).map(article => ({
          title: article.title,
          snippet: article.snippet,
          content: `<h2>Introduction</h2><p>${article.content || article.snippet}</p><p><em>This is a news excerpt. Expand on it to create a full article.</em></p>`,
          category: 'General',
          tags: ['news', ...cleanedQuery.split(' ').slice(0, 3)],
        }));
        console.log(`✅ NewsAPI compose returned ${results.length} results`);
        return res.json({ results });
      } catch (error) {
        console.error(`❌ NewsAPI compose error:`, error.message);
      }
    }

    return res.status(500).json({ error: 'Unable to generate article outline. Please try again later.' });
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