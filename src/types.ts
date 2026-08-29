export type ReflectionMode = 'reflect' | 'summarize' | 'brainstorm' | 'action_plan' | 'find_patterns';

export interface JournalMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  mode?: ReflectionMode;
}

export interface JournalEntry {
  id: string;
  userId: string;
  title: string;
  summary: string;
  mood: string;
  themes: string[];
  actionItems: string[];
  messageCount: number;
  createdAt: number;
  updatedAt: number;
  lastMessageExcerpt?: string;
}

export interface ActionItem {
  id: string;
  userId: string;
  text: string;
  completed: boolean;
  sourceJournalId: string;
  sourceJournalTitle?: string;
  createdAt: number;
  completedAt?: number;
}

export interface UserInsight {
  id: string;
  userId: string;
  title: string;
  description: string;
  frequency: number;
  relatedThemes: string[];
  category: 'theme_pattern' | 'growth_shift' | 'focus_area';
  createdAt: number;
}

export interface ReflectionSnapshot {
  totalReflections: number;
  activeActionItems: number;
  completedActionItems: number;
  primaryMood: string;
  topThemes: { theme: string; count: number }[];
  weeklySynthesis: string;
  lastUpdated: number;
}

export interface AiChatResponse {
  reply: string;
  summary?: string;
  mood?: string;
  themes?: string[];
  actionItems?: string[];
}
