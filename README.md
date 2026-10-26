# Nexora AI

A simple CRM for keeping leads moving and follow-ups from slipping through the cracks.

**[Try the app](https://ai-crm-lovat.vercel.app/)** · **[Check the API](https://nexora-aicrm.onrender.com/api/health)**

## What’s inside

- Manage leads and contacts, and move deals through a drag-and-drop pipeline.
- Keep notes, log lead activity, and get in-app reminders for due follow-ups.
- See sales stats and use AI for lead summaries, insights, and email drafts.

Built with React, Vite, Tailwind CSS, Express, and MongoDB. AI features use Gemini.

## Run it locally

You’ll need Node.js and a MongoDB connection. Open two terminals:

<details>
<summary><strong>1. Start the API</strong></summary>

In `backend/.env`, set:

```env
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_long_random_secret
CLIENT_URL=http://localhost:5173
GEMINI_API_KEY=your_gemini_key
```

The Gemini key is optional; the rest of the CRM works without it.

```bash
cd backend
npm install
npm run dev
```

</details>

<details>
<summary><strong>2. Start the web app</strong></summary>

```bash
cd frontend/AICRMDashboard
npm install
npm run dev
```

Open **http://localhost:5173**. The frontend uses `http://localhost:8000/api` by default.

</details>

## Deploying your own copy

Deploy `frontend/AICRMDashboard` to Vercel and `backend` to Render. Set `VITE_API_URL` on Vercel to your Render URL ending in `/api`, and set `CLIENT_URL` on Render to your Vercel site origin (without a trailing slash). Add `MONGO_URI` and `JWT_SECRET` on Render too.
