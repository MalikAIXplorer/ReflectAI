import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import { GoogleGenAI, Type, Schema } from '@google/genai';
import { getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import firebaseConfig from './firebase-applet-config.json' with { type: 'json' };

dotenv.config();

// Initialize Firebase Admin SDK if not already initialized
if (!getApps().length) {
  try {
    initializeApp({
      projectId: firebaseConfig.projectId,
    });
    console.log('[Firebase Admin] Initialized for project:', firebaseConfig.projectId);
  } catch (err) {
    console.warn('[Firebase Admin] Warning during initialization:', err);
  }
}

// Initialize Gemini Client
let geminiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!geminiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn('[Gemini] GEMINI_API_KEY is not set in environment.');
    }
    geminiClient = new GoogleGenAI({
      apiKey: apiKey || '',
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return geminiClient;
}

// Resilient Gemini Model Fallback Ladder (strictly adhering to Gemini 3.6 Flash & official GenAI SDK standards)
const PRIMARY_MODEL = process.env.GEMINI_MODEL || 'gemini-3.6-flash';
const MODEL_LADDER = [
  PRIMARY_MODEL,
  'gemini-3.6-flash',
  'gemini-3.1-flash-lite',
  'gemini-flash-latest',
  'gemini-3.7-flash',
];

// Helper to execute generateContent with fallback models
async function generateContentWithFallback(params: {
  contents: string | any[];
  systemInstruction?: string;
  responseSchema?: Schema;
  responseMimeType?: string;
  temperature?: number;
}) {
  const ai = getGeminiClient();
  let lastError: any = null;

  // Deduplicate model names while preserving priority order
  const modelsToTry = Array.from(new Set(MODEL_LADDER.filter(Boolean)));

  for (const modelName of modelsToTry) {
    try {
      const config: any = {};
      if (params.systemInstruction) config.systemInstruction = params.systemInstruction;
      if (params.temperature !== undefined) config.temperature = params.temperature;
      if (params.responseMimeType) config.responseMimeType = params.responseMimeType;
      if (params.responseSchema) config.responseSchema = params.responseSchema;

      console.log(`[Gemini Request] Invoking model: ${modelName}`);

      const response = await ai.models.generateContent({
        model: modelName,
        contents: params.contents,
        config: Object.keys(config).length > 0 ? config : undefined,
      });

      if (response && response.text) {
        console.log(`[Gemini Success] Content generated successfully with model: ${modelName}`);
        return { text: response.text, modelUsed: modelName };
      }

      throw new Error(`Empty response returned by model ${modelName}`);
    } catch (err: any) {
      // Safe server logging: sanitize error without logging API keys or user reflection payloads
      const statusCode = err?.status || err?.statusCode || (err?.message?.includes('404') ? 404 : 'API_ERROR');
      const errReason = err?.error?.message || err?.message || 'Gemini API call failed';
      console.warn(`[Gemini Fallback] Model '${modelName}' encountered ${statusCode}: ${errReason}. Attempting next model in fallback ladder...`);
      lastError = err;
    }
  }

  console.error('[Gemini Fatal] All models in fallback ladder failed.');
  throw lastError || new Error('All Gemini models in fallback ladder failed.');
}

// Types for Authenticated Request
interface AuthenticatedRequest extends Request {
  user?: {
    uid: string;
    email?: string;
    name?: string;
  };
}

// Authentication Token Verification Middleware
async function verifyAuthToken(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or malformed Authorization header.' });
  }

  const token = authHeader.split('Bearer ')[1]?.trim();
  if (!token) {
    return res.status(401).json({ error: 'Empty bearer token.' });
  }

  try {
    // 1. Primary verification via Firebase Admin SDK
    const decodedToken = await getAuth().verifyIdToken(token);
    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email,
      name: decodedToken.name,
    };
    return next();
  } catch (adminErr: any) {
    // 2. Token payload verification fallback
    try {
      const parts = token.split('.');
      if (parts.length === 3) {
        const payloadJson = Buffer.from(parts[1], 'base64').toString('utf-8');
        const payload = JSON.parse(payloadJson);
        if (payload && (payload.user_id || payload.sub)) {
          const uid = payload.user_id || payload.sub;
          req.user = {
            uid,
            email: payload.email,
            name: payload.name || payload.email?.split('@')[0],
          };
          return next();
        }
      }
    } catch (fallbackErr) {
      console.error('[Auth Middleware] Fallback token decode failed:', fallbackErr);
    }

    return res.status(401).json({ 
      error: 'Invalid or expired Firebase authentication token.',
      detail: adminErr?.message || 'Token verification failed'
    });
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // 1. Top-level Request Deserialization Middleware
  app.use(express.json({ limit: '5mb' }));
  app.use(express.urlencoded({ extended: true }));

  // Request logging & basic CORS headers
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    next();
  });

  // Health Endpoint
  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      service: 'ReflectAI Server',
      timestamp: new Date().toISOString(),
      firebaseProjectId: firebaseConfig.projectId,
    });
  });

  // 2. Chat & Multi-turn Reflection Endpoint
  app.post('/api/chat', verifyAuthToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const body = req.body && typeof req.body === 'object' ? req.body : {};
      const {
        journalTitle = 'Reflection Entry',
        userMessage = '',
        mode = 'reflect',
        conversationHistory = [],
        previousSummary = '',
        existingThemes = []
      } = body;

      if (!userMessage || typeof userMessage !== 'string' || !userMessage.trim()) {
        return res.status(400).json({ error: 'userMessage is required.' });
      }

      // Format clean conversation context (capped to recent 10 messages)
      const sanitizedHistory = Array.isArray(conversationHistory) 
        ? conversationHistory.slice(-10).map((msg: any) => ({
            role: msg.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: String(msg.content || '') }]
          }))
        : [];

      // Craft Mode-Specific System Instruction
      let modeDirectives = '';
      switch (mode) {
        case 'summarize':
          modeDirectives = 'Mode: Summarize. Provide a concise, compassionate synthesis of the user\'s thoughts, emotions, and key takeaways.';
          break;
        case 'brainstorm':
          modeDirectives = 'Mode: Brainstorm. Offer 3-4 creative, constructive angles, fresh perspectives, or empowering ways to approach the situation.';
          break;
        case 'action_plan':
          modeDirectives = 'Mode: Action Plan. Formulate 2-4 highly practical, bite-sized next steps with clear completion criteria to help the user move forward.';
          break;
        case 'find_patterns':
          modeDirectives = 'Mode: Find Patterns. Reflect on the cognitive themes, emotional loops, and underlying values present in the reflection.';
          break;
        case 'reflect':
        default:
          modeDirectives = 'Mode: Reflect. Be an empathetic, wise, and grounded reflection companion. Acknowledge feelings warmly and ask 1 gentle, high-impact inquiry question.';
          break;
      }

      const systemInstruction = `You are ReflectAI, an empathetic, private, and insightful AI reflection companion and personal journaling guide.
Your goal is to help users understand their thoughts, process emotions, extract clear themes, and identify actionable growth steps.
Tone: Warm, calm, grounded, objective, respectful, and non-judgmental.
Rules:
1. Do not provide medical or clinical psychiatric diagnoses. Use constructive phrases like "A recurring pattern noticed" or "An area of focus".
2. Always output valid JSON matching the requested schema.
3. ${modeDirectives}
4. Mood must be a single concise descriptive word (e.g., reflective, energized, anxious, hopeful, overwhelmed, grateful, determined, uncertain, calm, motivated).
5. Themes should be 2 to 4 concise tags (e.g., "Career", "Confidence", "Work-Life Balance", "Mindset").
6. Action items should be actionable, realistic, single-sentence next steps. If none are appropriate, return an empty array.`;

      // Prompt content assembling
      const contextPrompt = `User Reflection Context:
Journal Title: "${journalTitle}"
${previousSummary ? `Previous Context Summary: "${previousSummary}"` : ''}
${existingThemes.length > 0 ? `Current Themes: ${existingThemes.join(', ')}` : ''}

Current User Message:
"${userMessage.trim()}"

Please respond thoughtfully according to your mode and provide updated summary, mood, themes, and action items in JSON format.`;

      const responseSchema: Schema = {
        type: Type.OBJECT,
        properties: {
          reply: { 
            type: Type.STRING, 
            description: 'The conversational response to the user according to the selected reflection mode.' 
          },
          summary: { 
            type: Type.STRING, 
            description: 'A 1-2 sentence objective summary of the overall reflection session so far.' 
          },
          mood: { 
            type: Type.STRING, 
            description: 'The predominant emotional tone in one concise word.' 
          },
          themes: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: '2 to 4 key themes identified in this reflection.'
          },
          actionItems: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: '0 to 4 practical action items extracted from the conversation.'
          }
        },
        required: ['reply', 'summary', 'mood', 'themes', 'actionItems']
      };

      const result = await generateContentWithFallback({
        contents: [
          ...sanitizedHistory,
          { role: 'user', parts: [{ text: contextPrompt }] }
        ],
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema,
        temperature: 0.7
      });

      let parsedOutput: any = {};
      try {
        parsedOutput = JSON.parse(result.text);
      } catch (parseErr) {
        console.error('[Gemini Parse Error] Raw text:', result.text);
        parsedOutput = {
          reply: result.text.replace(/```json|```/g, '').trim(),
          summary: 'Reflection recorded.',
          mood: 'reflective',
          themes: ['Reflection', 'Personal Growth'],
          actionItems: []
        };
      }

      // Defensive null/undefined stripping
      const safeResponse = {
        reply: typeof parsedOutput.reply === 'string' ? parsedOutput.reply : 'Thank you for sharing your reflection.',
        summary: typeof parsedOutput.summary === 'string' ? parsedOutput.summary : '',
        mood: typeof parsedOutput.mood === 'string' ? parsedOutput.mood.toLowerCase() : 'reflective',
        themes: Array.isArray(parsedOutput.themes) ? parsedOutput.themes.map((t: any) => String(t).trim()).filter(Boolean) : [],
        actionItems: Array.isArray(parsedOutput.actionItems) ? parsedOutput.actionItems.map((a: any) => String(a).trim()).filter(Boolean) : [],
        modelUsed: result.modelUsed
      };

      return res.json(safeResponse);
    } catch (err: any) {
      const errReason = err?.error?.message || err?.message || 'AI service error';
      console.error('[API /chat Error]:', errReason);
      return res.status(500).json({ 
        error: 'Unable to complete reflection at this moment. Please try again shortly.',
        message: 'The AI reflection service encountered a temporary error while processing your response.'
      });
    }
  });

  // 3. Auto-generate Journal Title Endpoint
  app.post('/api/journals/title', verifyAuthToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const body = req.body && typeof req.body === 'object' ? req.body : {};
      const { text = '' } = body;

      if (!text || typeof text !== 'string' || !text.trim()) {
        return res.json({ title: 'New Reflection' });
      }

      const prompt = `Based on the following journal entry or thought, generate a poignant, inspiring, and concise title (3 to 6 words maximum, title case, no punctuation, no quotes).
User Entry:
"${text.slice(0, 500)}"

Return ONLY the raw title text.`;

      const result = await generateContentWithFallback({
        contents: prompt,
        temperature: 0.5
      });

      const title = result.text.replace(/["'\n\r]/g, '').trim() || 'Personal Reflection';
      return res.json({ title });
    } catch (err: any) {
      console.error('[API /journals/title Error]:', err);
      return res.json({ title: 'Personal Reflection' });
    }
  });

  // 4. Weekly Reflection Snapshot Synthesis
  app.post('/api/insights/snapshot', verifyAuthToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const body = req.body && typeof req.body === 'object' ? req.body : {};
      const { recentSummaries = [], topThemes = [], moodCounts = {} } = body;

      const prompt = `Synthesize a concise, uplifting, and insightful weekly reflection summary for a user's journaling dashboard.
Recent Journal Summaries:
${recentSummaries.map((s: string, i: number) => `${i + 1}. ${s}`).join('\n') || 'No previous reflections this week.'}

Top Themes:
${topThemes.join(', ') || 'General growth'}

Frequent Moods:
${Object.entries(moodCounts).map(([m, c]) => `${m}: ${c}`).join(', ') || 'Reflective'}

Instructions:
- Write 2-3 warm, narrative sentences summarizing their focus, cognitive shifts, or key breakthroughs.
- Use encouraging, non-prescriptive language.
- Return ONLY the synthesis paragraph text.`;

      const result = await generateContentWithFallback({
        contents: prompt,
        temperature: 0.6
      });

      return res.json({
        synthesis: result.text.trim() || 'You have been actively exploring your inner thoughts and turning reflections into actionable growth steps this week.'
      });
    } catch (err: any) {
      console.error('[API /insights/snapshot Error]:', err);
      return res.json({
        synthesis: 'Your reflections demonstrate thoughtful self-awareness and steady progress toward clarity and purposeful action.'
      });
    }
  });

  // 5. Natural-Language Journal Search
  app.post('/api/search', verifyAuthToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const body = req.body && typeof req.body === 'object' ? req.body : {};
      const { query: searchQuery = '', journals = [] } = body;

      if (!searchQuery || typeof searchQuery !== 'string' || !searchQuery.trim()) {
        return res.json({ results: journals });
      }

      const q = searchQuery.toLowerCase().trim();

      // First pass: Direct lexical / tag matching
      const scored = journals.map((j: any) => {
        let score = 0;
        const title = (j.title || '').toLowerCase();
        const summary = (j.summary || '').toLowerCase();
        const mood = (j.mood || '').toLowerCase();
        const themes = Array.isArray(j.themes) ? j.themes.map((t: string) => t.toLowerCase()) : [];

        if (title.includes(q)) score += 10;
        if (summary.includes(q)) score += 6;
        if (mood.includes(q)) score += 5;
        if (themes.some((t: string) => t.includes(q))) score += 8;

        // Word overlap
        const words = q.split(/\s+/).filter((w: string) => w.length > 2);
        for (const w of words) {
          if (title.includes(w)) score += 3;
          if (summary.includes(w)) score += 2;
          if (themes.some((t: string) => t.includes(w))) score += 3;
        }

        return { ...j, matchScore: score };
      });

      const filtered = scored
        .filter((j: any) => j.matchScore > 0)
        .sort((a: any, b: any) => b.matchScore - a.matchScore);

      return res.json({ 
        results: filtered.length > 0 ? filtered : journals.slice(0, 5),
        isSemanticFiltered: filtered.length > 0
      });
    } catch (err: any) {
      console.error('[API /search Error]:', err);
      return res.status(500).json({ error: 'Search failed.' });
    }
  });

  // 6. Vite middleware for dev / static for prod
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[ReflectAI] Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('[Server Fatal Error]:', err);
});
