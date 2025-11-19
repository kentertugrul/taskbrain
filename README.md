# Task Brain

An AI-powered task management system that organizes your thoughts into actionable tasks through natural conversation.

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Set Up Environment Variables
Create a `.env` file in the root directory:

```bash
cp .env.example .env
```

Then edit `.env` and add:

```env
# Google Gemini API Key
API_KEY=your_gemini_api_key_here

# Supabase (Required for production)
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

**Get your keys:**
- Gemini API: [Google AI Studio](https://aistudio.google.com/app/apikey)
- Supabase: Follow [docs/SUPABASE_SETUP.md](docs/SUPABASE_SETUP.md)

### 3. Run Development Server
```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### 4. Build for Production
```bash
npm run build
```

## 📦 Deploy to Vercel

1. Push your code to GitHub
2. Go to [vercel.com/new](https://vercel.com/new)
3. Import your repository
4. Add environment variable: `API_KEY` with your Gemini API key
5. Deploy!

## ✨ Features

- 💬 **Natural Language Task Creation** - Just describe what you need to do
- 🧠 **AI-Powered Organization** - Automatically extracts tasks, subtasks, and priorities
- 🎨 **Mind Map Visualization** - See your tasks as an interactive force-directed graph
- 📊 **Smart Categorization** - Work vs Personal tasks with color coding
- 🎯 **Priority Management** - AI calculates urgency and importance
- 📅 **Calendar Integration** - Connect multiple Google Calendars
- 🎙️ **Voice Input** - Speak your tasks (browser speech recognition)

## 🛠️ Tech Stack

- **Frontend**: React 19, TypeScript, Vite
- **Styling**: Tailwind CSS
- **AI**: Google Gemini 2.0
- **Routing**: React Router v7
- **Icons**: Lucide React

## 📝 License

MIT

