import type { AiChatResponse, ReflectionMode } from '../types';

export async function callGeminiChat(params: {
  idToken: string | null;
  journalTitle: string;
  userMessage: string;
  mode: ReflectionMode;
  conversationHistory: { role: string; content: string }[];
  previousSummary?: string;
  existingThemes?: string[];
}): Promise<AiChatResponse> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (params.idToken) {
    headers['Authorization'] = `Bearer ${params.idToken}`;
  }

  const response = await fetch('/api/chat', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      journalTitle: params.journalTitle,
      userMessage: params.userMessage,
      mode: params.mode,
      conversationHistory: params.conversationHistory,
      previousSummary: params.previousSummary,
      existingThemes: params.existingThemes,
    }),
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.message || errData.error || `Server error: ${response.status}`);
  }

  return response.json();
}

export async function generateTitle(text: string, idToken: string | null): Promise<string> {
  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (idToken) headers['Authorization'] = `Bearer ${idToken}`;

    const response = await fetch('/api/journals/title', {
      method: 'POST',
      headers,
      body: JSON.stringify({ text }),
    });

    if (!response.ok) return 'Personal Reflection';
    const data = await response.json();
    return data.title || 'Personal Reflection';
  } catch {
    return 'Personal Reflection';
  }
}

export async function generateWeeklySnapshot(params: {
  idToken: string | null;
  recentSummaries: string[];
  topThemes: string[];
  moodCounts: Record<string, number>;
}): Promise<string> {
  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (params.idToken) headers['Authorization'] = `Bearer ${params.idToken}`;

    const response = await fetch('/api/insights/snapshot', {
      method: 'POST',
      headers,
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      return 'Your reflections show a steady commitment to self-inquiry, transforming uncertainty into actionable forward momentum.';
    }

    const data = await response.json();
    return data.synthesis;
  } catch {
    return 'Your reflections show a steady commitment to self-inquiry, transforming uncertainty into actionable forward momentum.';
  }
}

export async function searchJournalsApi(params: {
  idToken: string | null;
  query: string;
  journals: any[];
}): Promise<any[]> {
  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (params.idToken) headers['Authorization'] = `Bearer ${params.idToken}`;

    const response = await fetch('/api/search', {
      method: 'POST',
      headers,
      body: JSON.stringify(params),
    });

    if (!response.ok) return params.journals;
    const data = await response.json();
    return data.results || params.journals;
  } catch {
    return params.journals;
  }
}
