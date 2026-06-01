# Extensio.ai Deployment Guide

## Prerequisites

- Node.js 20+
- MongoDB Atlas or a local MongoDB instance
- OpenAI API key

## Environment

Copy `backend/.env.example` to `backend/.env` and set:

```env
PORT=3001
CLIENT_ORIGIN=http://localhost:5173
MONGODB_URI=mongodb://127.0.0.1:27017/extensio_ai
JWT_SECRET=replace-with-a-long-random-secret
AI_PROVIDER=groq
GROQ_API_KEY=gsk_...
GROQ_MODEL=llama-3.1-8b-instant
GROQ_BASE_URL=https://api.groq.com/openai/v1
```

The backend uses Groq for AI generation. It falls back to local templates when Groq is missing, out of quota, or unavailable.

For production, set `CLIENT_ORIGIN` to the deployed frontend URL and use a managed MongoDB URI.

## Local Development

```bash
npm run install:all
npm start
```

Frontend: `http://localhost:5173`
Backend: `http://localhost:3001`

## Production Build

```bash
npm run build --prefix frontend
npm start --prefix backend
```

Deploy `frontend/dist` to a static host such as Vercel, Netlify, or Azure Static Web Apps.
Deploy `backend` to a Node host such as Render, Railway, Azure App Service, or Fly.io.

## Security Checklist

- Use a strong `JWT_SECRET`.
- Restrict `CLIENT_ORIGIN`.
- Store `OPENAI_API_KEY` only on the backend.
- Keep MongoDB behind authentication and network rules.
- Serve downloads from private object storage if ZIP retention becomes sensitive.
- Review generated extension files before publishing to the Chrome Web Store.

## API Summary

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/forgot-password`
- `GET /api/auth/me`
- `GET /api/extensions`
- `POST /api/extensions/generate`
- `POST /api/extensions/:id/edit`
- `POST /api/extensions/:id/security-scan`
- `DELETE /api/extensions/:id`
- `GET /downloads/:zipName`
- `GET /api/admin/analytics`
