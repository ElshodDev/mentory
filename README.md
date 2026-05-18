# 🔮 Mentory — AI Language Learning Ecosystem

**Mentory** is an advanced, AI-powered language learning ecosystem built inside Telegram. Combining the simplicity of a Telegram Bot with the rich interactivity of a Telegram Mini App, Mentory serves as both a 24/7 personal tutor (**Mentor**) and an intelligent memory engine (**Memory**). Powered by **Anthropic's Claude 3.5 Sonnet API**, Mentory provides real-time conversational role-play, adaptive reading-to-speaking workflows, spaced repetition vocabulary decks, and immersive gamification.

```text
📂 mentory (Monorepo)
 ├── 📂 apps
 │    ├── 📂 bot           <-- Node.js + grammY (Telegram Bot & AI Backend)
 │    └── 📂 miniapp       <-- React + TypeScript + Tailwind + @twa-dev/sdk (Telegram Web App)
 ├── 📂 packages
 │    ├── 📂 shared-types  <-- TypeScript Interfaces shared across Bot & Mini App
 │    └── 📂 database      <-- PostgreSQL schemas & Redis caching
 └── 📄 README.md
```

---

## 🌟 Key Features

### 1. 📖 Smart Reading Flow
An adaptive reading module that detects user reading difficulty in real time. If a user struggles with 3+ words in a text:
- The AI dynamically generates an illustrative summary image + a concise 2-3 sentence explanation in Uzbek.
- Difficult words are extracted into personalized vocabulary cards with audio and contextual examples.
- The module seamlessly bridges the user into a Speaking practice session using exactly those new words.

### 2. 🗣️ Immersive Speaking & Listening
- **AI Voice Tandem / Free Talk:** Users can send voice messages and receive natural, spoken AI responses like chatting with a native speaker.
- **Pronunciation Doctor:** Advanced audio analysis providing exact scores for fluency, accuracy, and accent.
- **Dictation & Quizzes:** Audio listening with gap-fill and multiple-choice questions.

### 3. ✍️ Intelligent Writing Doctor
- Users submit messages, essays, or emails for instant grammatical correction.
- Mentory highlights mistakes, provides native phrasing alternatives, and assigns comprehensive CEFR/IELTS band scores.

### 4. 🎮 Gamification & Spaced Repetition (SRS)
- **Daily Streaks & XP:** Keeps users engaged with Duolingo-style push notifications and rewarding milestone tracking.
- **Leaderboards:** Weekly community ranking with rewards for top learners.
- **Smart Flashcards:** Interleaved spaced repetition testing inside the Mini App with smooth swipe animations.

---

## 🏗️ Architecture & Tech Stack

### Frontend (Telegram Mini App)
- **Framework:** React 18 + Vite + TypeScript
- **Styling & UI:** Tailwind CSS, Lucide Icons, Framer Motion (smooth swipe/Duolingo animations)
- **Telegram Integration:** `@twa-dev/sdk` for native haptics, theme matching, and cloud storage

### Backend (Telegram Bot & Logic)
- **Framework:** Node.js (TypeScript)
- **Bot Engine:** `grammY` (Asynchronous, highly performant Telegram Bot framework)
- **AI Integration:** `@anthropic-ai/sdk` (Claude 3.5 Sonnet for deep linguistic logic and grading)
- **Database:** PostgreSQL (User profiles, streaks, progress) + Redis (Real-time leaderboards, session caching)

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v20+ recommended)
- PostgreSQL & Redis running locally or via cloud
- Telegram Bot Token from [@BotFather](https://t.me/BotFather)
- Anthropic API Key

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/ElshodDev/mentory.git
   cd mentory
   ```

2. **Install dependencies across the monorepo:**
   ```bash
   npm install
   ```

3. **Configure Environment Variables:**
   Create `.env` files in `apps/bot` and `apps/miniapp` following the `.env.example` templates.

4. **Run Development Servers:**
   ```bash
   # Run Telegram Bot in watch mode
   npm run dev:bot

   # Run Telegram Mini App dev server
   npm run dev:miniapp
   ```

---

## 🛡️ License
Distributed under the MIT License. Built with passion by [ElshodDev](https://github.com/ElshodDev).
