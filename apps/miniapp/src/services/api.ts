const BASE_URL = import.meta.env.VITE_API_URL || 'https://mentory.onrender.com';

export const apiService = {
  async fetchProfile(telegramId: number, firstName: string, username?: string) {
    const res = await fetch(`${BASE_URL}/api/profile/${telegramId}?firstName=${encodeURIComponent(firstName)}&username=${encodeURIComponent(username || '')}`);
    if (!res.ok) throw new Error('Profile fetch error');
    return res.json();
  },

  async fetchReading(level: string) {
    const res = await fetch(`${BASE_URL}/api/reading?level=${level}`);
    if (!res.ok) throw new Error('Reading fetch error');
    return res.json();
  },

  async translateWord(word: string, sentence: string) {
    const res = await fetch(`${BASE_URL}/api/translate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ word, sentence })
    });
    if (!res.ok) throw new Error('Translation error');
    return res.json();
  },

  async saveWord(userId: number, word: string, translation: string, sentence: string) {
    const res = await fetch(`${BASE_URL}/api/words`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, word, translation, sentence })
    });
    if (!res.ok) throw new Error('Save word error');
    return res.json();
  },

  async fetchWords(userId: number) {
    const res = await fetch(`${BASE_URL}/api/words/${userId}`);
    if (!res.ok) throw new Error('Fetch words error');
    return res.json();
  },

  async reviewWord(userId: number, word: string, difficulty: 'easy' | 'hard') {
    const res = await fetch(`${BASE_URL}/api/words/review`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, word, difficulty })
    });
    if (!res.ok) throw new Error('Review word error');
    return res.json();
  },

  async addXP(userId: number, amount: number) {
    const res = await fetch(`${BASE_URL}/api/user/xp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, amount })
    });
    if (!res.ok) throw new Error('Add XP error');
    return res.json();
  },

  async completeLesson(userId: number) {
    const res = await fetch(`${BASE_URL}/api/user/lesson-completed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId })
    });
    if (!res.ok) throw new Error('Complete lesson error');
    return res.json();
  },

  async fetchLeaderboard() {
    const res = await fetch(`${BASE_URL}/api/leaderboard`);
    if (!res.ok) throw new Error('Leaderboard fetch error');
    return res.json();
  },

  async evaluateVoice(userId: number, audio: string, mimeType: string, topic: string) {
    const res = await fetch(`${BASE_URL}/api/voice-assessment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, audio, mimeType, topic })
    });
    if (!res.ok) throw new Error('Voice assessment error');
    return res.json();
  },

  async chatWriting(message: string) {
    const res = await fetch(`${BASE_URL}/api/writing`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message })
    });
    if (!res.ok) throw new Error('Writing chat error');
    return res.json();
  },

  async fetchQuizzes(level: string) {
    const res = await fetch(`${BASE_URL}/api/quizzes?level=${level}`);
    if (!res.ok) throw new Error('Quizzes fetch error');
    return res.json();
  },

  async matchmakeBattle(userId: number, level: string) {
    const res = await fetch(`${BASE_URL}/api/battles/matchmake?userId=${userId}&level=${level}`);
    if (!res.ok) throw new Error('Matchmake error');
    return res.json();
  },

  async completeBattle(userId: number, opponentId: number, userScore: number, opponentScore: number) {
    const res = await fetch(`${BASE_URL}/api/battles/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, opponentId, userScore, opponentScore })
    });
    if (!res.ok) throw new Error('Complete battle error');
    return res.json();
  },

  async getShadowingSentence(level: string) {
    const res = await fetch(`${BASE_URL}/api/shadowing/sentence?level=${level}`);
    if (!res.ok) throw new Error('Shadowing fetch error');
    return res.json();
  },

  async evaluateShadowing(userId: number, audioBase64: string, mimeType: string, targetSentence: string) {
    const res = await fetch(`${BASE_URL}/api/shadowing/evaluate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, audioBase64, mimeType, targetSentence })
    });
    if (!res.ok) throw new Error('Shadowing evaluate error');
    return res.json();
  },

  async getMockTestQuestions() {
    const res = await fetch(`${BASE_URL}/api/mock-test/questions`);
    if (!res.ok) throw new Error('Mock questions error');
    return res.json();
  },

  async evaluateMockTest(userId: number, audioPartsBase64: string[], mimeType: string, questions: any) {
    const res = await fetch(`${BASE_URL}/api/mock-test/evaluate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, audioPartsBase64, mimeType, questions })
    });
    if (!res.ok) throw new Error('Mock test evaluate error');
    return res.json();
  },

  async getYoutubeTranscript(videoId: string) {
    const res = await fetch(`${BASE_URL}/api/video/transcript?videoId=${videoId}`);
    if (!res.ok) throw new Error('Transcript fetch error');
    return res.json();
  },

  async getYoutubeVocab(videoId: string) {
    const res = await fetch(`${BASE_URL}/api/video/vocab?videoId=${videoId}`);
    if (!res.ok) throw new Error('Vocab fetch error');
    return res.json();
  }
};
