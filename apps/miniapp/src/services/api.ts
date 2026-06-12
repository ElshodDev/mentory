export const apiService = {
  async fetchProfile(telegramId: number, firstName: string, username?: string) {
    const res = await fetch(`/api/profile/${telegramId}?firstName=${encodeURIComponent(firstName)}&username=${encodeURIComponent(username || '')}`);
    if (!res.ok) throw new Error('Profile fetch error');
    return res.json();
  },

  async fetchReading(level: string) {
    const res = await fetch(`/api/reading?level=${level}`);
    if (!res.ok) throw new Error('Reading fetch error');
    return res.json();
  },

  async translateWord(word: string, sentence: string) {
    const res = await fetch('/api/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ word, sentence })
    });
    if (!res.ok) throw new Error('Translation error');
    return res.json();
  },

  async saveWord(userId: number, word: string, translation: string, sentence: string) {
    const res = await fetch('/api/words', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, word, translation, sentence })
    });
    if (!res.ok) throw new Error('Save word error');
    return res.json();
  },

  async fetchWords(userId: number) {
    const res = await fetch(`/api/words/${userId}`);
    if (!res.ok) throw new Error('Fetch words error');
    return res.json();
  },

  async reviewWord(userId: number, word: string, difficulty: 'easy' | 'hard') {
    const res = await fetch('/api/words/review', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, word, difficulty })
    });
    if (!res.ok) throw new Error('Review word error');
    return res.json();
  },

  async addXP(userId: number, amount: number) {
    const res = await fetch('/api/user/xp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, amount })
    });
    if (!res.ok) throw new Error('Add XP error');
    return res.json();
  },

  async completeLesson(userId: number) {
    const res = await fetch('/api/user/lesson-completed', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId })
    });
    if (!res.ok) throw new Error('Complete lesson error');
    return res.json();
  },

  async fetchLeaderboard() {
    const res = await fetch('/api/leaderboard');
    if (!res.ok) throw new Error('Leaderboard fetch error');
    return res.json();
  },

  async evaluateVoice(userId: number, audio: string, mimeType: string, topic: string) {
    const res = await fetch('/api/voice-assessment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, audio, mimeType, topic })
    });
    if (!res.ok) throw new Error('Voice assessment error');
    return res.json();
  },

  async chatWriting(message: string) {
    const res = await fetch('/api/writing', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message })
    });
    if (!res.ok) throw new Error('Writing chat error');
    return res.json();
  }
};
