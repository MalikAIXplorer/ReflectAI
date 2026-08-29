import { 
  db, 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  deleteDoc, 
  updateDoc, 
  query, 
  orderBy, 
  writeBatch 
} from './firebase';
import type { JournalEntry, JournalMessage, ActionItem, UserInsight } from '../types';

/**
 * Utility to strip undefined properties from objects before passing to Firestore
 */
function sanitizePayload<T extends Record<string, any>>(obj: T): T {
  const sanitized = JSON.parse(
    JSON.stringify(obj, (key, value) => (value === undefined ? null : value))
  );
  return sanitized;
}

// Local storage backup keys for demo/offline resilience
const getLocalKey = (uid: string, type: string) => `reflectai_${uid}_${type}`;

// ----------------------------------------------------
// JOURNALS CRUD
// ----------------------------------------------------

export async function createJournal(uid: string, entry: Omit<JournalEntry, 'id' | 'userId' | 'createdAt' | 'updatedAt'>): Promise<JournalEntry> {
  const journalId = 'jnl_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
  const now = Date.now();

  const newJournal: JournalEntry = {
    ...entry,
    id: journalId,
    userId: uid,
    createdAt: now,
    updatedAt: now,
    messageCount: entry.messageCount || 0,
    themes: entry.themes || [],
    actionItems: entry.actionItems || [],
  };

  try {
    const journalRef = doc(db, 'users', uid, 'journals', journalId);
    await setDoc(journalRef, sanitizePayload(newJournal));
  } catch (err) {
    console.warn('[Firestore] Journal write fallback to local storage:', err);
  }

  // Always keep local sync updated for instant offline response
  const localList = getLocalJournals(uid);
  localStorage.setItem(getLocalKey(uid, 'journals'), JSON.stringify([newJournal, ...localList]));

  return newJournal;
}

export async function getJournals(uid: string): Promise<JournalEntry[]> {
  try {
    const journalsRef = collection(db, 'users', uid, 'journals');
    const q = query(journalsRef, orderBy('updatedAt', 'desc'));
    const snapshot = await getDocs(q);

    if (!snapshot.empty) {
      const items: JournalEntry[] = [];
      snapshot.forEach((d) => items.push(d.data() as JournalEntry));
      localStorage.setItem(getLocalKey(uid, 'journals'), JSON.stringify(items));
      return items;
    }
  } catch (err) {
    console.warn('[Firestore] Journal read fallback to local storage:', err);
  }

  return getLocalJournals(uid);
}

export function getLocalJournals(uid: string): JournalEntry[] {
  try {
    const raw = localStorage.getItem(getLocalKey(uid, 'journals'));
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export async function updateJournal(uid: string, journalId: string, updates: Partial<JournalEntry>): Promise<void> {
  const now = Date.now();
  const safeUpdates = sanitizePayload({ ...updates, updatedAt: now });

  try {
    const journalRef = doc(db, 'users', uid, 'journals', journalId);
    await updateDoc(journalRef, safeUpdates);
  } catch (err) {
    console.warn('[Firestore] Journal update fallback to local storage:', err);
  }

  const list = getLocalJournals(uid);
  const updated = list.map((j) => (j.id === journalId ? { ...j, ...safeUpdates } : j));
  localStorage.setItem(getLocalKey(uid, 'journals'), JSON.stringify(updated));
}

export async function deleteJournal(uid: string, journalId: string): Promise<void> {
  try {
    const journalRef = doc(db, 'users', uid, 'journals', journalId);
    await deleteDoc(journalRef);

    // Delete subcollection messages
    const messagesRef = collection(db, 'users', uid, 'journals', journalId, 'messages');
    const msgsSnap = await getDocs(messagesRef);
    const batch = writeBatch(db);
    msgsSnap.forEach((m) => batch.delete(m.ref));
    await batch.commit();
  } catch (err) {
    console.warn('[Firestore] Journal delete fallback to local storage:', err);
  }

  const list = getLocalJournals(uid).filter((j) => j.id !== journalId);
  localStorage.setItem(getLocalKey(uid, 'journals'), JSON.stringify(list));
  localStorage.removeItem(getLocalKey(uid, `messages_${journalId}`));
}

// ----------------------------------------------------
// MESSAGES CRUD
// ----------------------------------------------------

export async function addJournalMessage(
  uid: string, 
  journalId: string, 
  msg: Omit<JournalMessage, 'id' | 'timestamp'>
): Promise<JournalMessage> {
  const messageId = 'msg_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
  const newMessage: JournalMessage = {
    ...msg,
    id: messageId,
    timestamp: Date.now(),
  };

  try {
    const msgRef = doc(db, 'users', uid, 'journals', journalId, 'messages', messageId);
    await setDoc(msgRef, sanitizePayload(newMessage));
  } catch (err) {
    console.warn('[Firestore] Message write fallback to local storage:', err);
  }

  const localMsgs = getLocalMessages(uid, journalId);
  const updated = [...localMsgs, newMessage];
  localStorage.setItem(getLocalKey(uid, `messages_${journalId}`), JSON.stringify(updated));

  return newMessage;
}

export async function getJournalMessages(uid: string, journalId: string): Promise<JournalMessage[]> {
  try {
    const messagesRef = collection(db, 'users', uid, 'journals', journalId, 'messages');
    const q = query(messagesRef, orderBy('timestamp', 'asc'));
    const snapshot = await getDocs(q);

    if (!snapshot.empty) {
      const items: JournalMessage[] = [];
      snapshot.forEach((d) => items.push(d.data() as JournalMessage));
      localStorage.setItem(getLocalKey(uid, `messages_${journalId}`), JSON.stringify(items));
      return items;
    }
  } catch (err) {
    console.warn('[Firestore] Message fetch fallback to local storage:', err);
  }

  return getLocalMessages(uid, journalId);
}

export function getLocalMessages(uid: string, journalId: string): JournalMessage[] {
  try {
    const raw = localStorage.getItem(getLocalKey(uid, `messages_${journalId}`));
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

// ----------------------------------------------------
// ACTION ITEMS CRUD
// ----------------------------------------------------

export async function createActionItem(
  uid: string, 
  item: { text: string; sourceJournalId: string; sourceJournalTitle?: string }
): Promise<ActionItem> {
  const actionId = 'act_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
  const newAction: ActionItem = {
    id: actionId,
    userId: uid,
    text: item.text,
    completed: false,
    sourceJournalId: item.sourceJournalId,
    sourceJournalTitle: item.sourceJournalTitle || 'Reflection',
    createdAt: Date.now(),
  };

  try {
    const actionRef = doc(db, 'users', uid, 'actions', actionId);
    await setDoc(actionRef, sanitizePayload(newAction));
  } catch (err) {
    console.warn('[Firestore] Action write fallback to local storage:', err);
  }

  const list = getLocalActionItems(uid);
  localStorage.setItem(getLocalKey(uid, 'actions'), JSON.stringify([newAction, ...list]));
  return newAction;
}

export async function getActionItems(uid: string): Promise<ActionItem[]> {
  try {
    const actionsRef = collection(db, 'users', uid, 'actions');
    const q = query(actionsRef, orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);

    if (!snapshot.empty) {
      const items: ActionItem[] = [];
      snapshot.forEach((d) => items.push(d.data() as ActionItem));
      localStorage.setItem(getLocalKey(uid, 'actions'), JSON.stringify(items));
      return items;
    }
  } catch (err) {
    console.warn('[Firestore] Action read fallback to local storage:', err);
  }

  return getLocalActionItems(uid);
}

export function getLocalActionItems(uid: string): ActionItem[] {
  try {
    const raw = localStorage.getItem(getLocalKey(uid, 'actions'));
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export async function toggleActionItem(uid: string, actionId: string, completed: boolean): Promise<void> {
  const updates = { 
    completed, 
    completedAt: completed ? Date.now() : null 
  };

  try {
    const actionRef = doc(db, 'users', uid, 'actions', actionId);
    await updateDoc(actionRef, sanitizePayload(updates));
  } catch (err) {
    console.warn('[Firestore] Action toggle fallback to local storage:', err);
  }

  const list = getLocalActionItems(uid);
  const updated = list.map((a) => (a.id === actionId ? { ...a, ...updates } : a));
  localStorage.setItem(getLocalKey(uid, 'actions'), JSON.stringify(updated));
}

export async function deleteActionItem(uid: string, actionId: string): Promise<void> {
  try {
    const actionRef = doc(db, 'users', uid, 'actions', actionId);
    await deleteDoc(actionRef);
  } catch (err) {
    console.warn('[Firestore] Action delete fallback to local storage:', err);
  }

  const list = getLocalActionItems(uid).filter((a) => a.id !== actionId);
  localStorage.setItem(getLocalKey(uid, 'actions'), JSON.stringify(list));
}

// ----------------------------------------------------
// INSIGHTS CRUD
// ----------------------------------------------------

export async function getInsights(uid: string): Promise<UserInsight[]> {
  try {
    const insightsRef = collection(db, 'users', uid, 'insights');
    const q = query(insightsRef, orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);

    if (!snapshot.empty) {
      const items: UserInsight[] = [];
      snapshot.forEach((d) => items.push(d.data() as UserInsight));
      localStorage.setItem(getLocalKey(uid, 'insights'), JSON.stringify(items));
      return items;
    }
  } catch (err) {
    console.warn('[Firestore] Insights read fallback to local storage:', err);
  }

  return getLocalInsights(uid);
}

export function getLocalInsights(uid: string): UserInsight[] {
  try {
    const raw = localStorage.getItem(getLocalKey(uid, 'insights'));
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export async function saveInsight(uid: string, insight: Omit<UserInsight, 'id' | 'userId' | 'createdAt'>): Promise<UserInsight> {
  const insightId = 'ins_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
  const newInsight: UserInsight = {
    ...insight,
    id: insightId,
    userId: uid,
    createdAt: Date.now(),
  };

  try {
    const ref = doc(db, 'users', uid, 'insights', insightId);
    await setDoc(ref, sanitizePayload(newInsight));
  } catch (err) {
    console.warn('[Firestore] Insight save fallback to local storage:', err);
  }

  const list = getLocalInsights(uid);
  localStorage.setItem(getLocalKey(uid, 'insights'), JSON.stringify([newInsight, ...list]));
  return newInsight;
}

// ----------------------------------------------------
// COMPLETE USER DATA WIPE (Privacy Requirement)
// ----------------------------------------------------

export async function deleteAllUserData(uid: string): Promise<void> {
  try {
    // 1. Delete all journals & messages
    const journalsRef = collection(db, 'users', uid, 'journals');
    const jSnap = await getDocs(journalsRef);
    for (const jDoc of jSnap.docs) {
      const msgsRef = collection(db, 'users', uid, 'journals', jDoc.id, 'messages');
      const mSnap = await getDocs(msgsRef);
      const mBatch = writeBatch(db);
      mSnap.forEach((m) => mBatch.delete(m.ref));
      await mBatch.commit();

      await deleteDoc(jDoc.ref);
    }

    // 2. Delete all actions
    const actionsRef = collection(db, 'users', uid, 'actions');
    const aSnap = await getDocs(actionsRef);
    const aBatch = writeBatch(db);
    aSnap.forEach((a) => aBatch.delete(a.ref));
    await aBatch.commit();

    // 3. Delete all insights
    const insightsRef = collection(db, 'users', uid, 'insights');
    const iSnap = await getDocs(insightsRef);
    const iBatch = writeBatch(db);
    iSnap.forEach((i) => iBatch.delete(i.ref));
    await iBatch.commit();

    // 4. Delete user root document if exists
    const userDocRef = doc(db, 'users', uid);
    await deleteDoc(userDocRef);
  } catch (err) {
    console.warn('[Firestore] Data wipe fallback:', err);
  }

  // Clear local storage keys for this user
  const keysToRemove = [
    getLocalKey(uid, 'journals'),
    getLocalKey(uid, 'actions'),
    getLocalKey(uid, 'insights'),
    `reflectai_${uid}_snapshot`
  ];
  keysToRemove.forEach((k) => localStorage.removeItem(k));
  
  // Clear any messages keys
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith(`reflectai_${uid}_`)) {
      localStorage.removeItem(key);
    }
  }
}
