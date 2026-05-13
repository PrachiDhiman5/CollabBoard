# CollabBoard — MERN real-time whiteboard

CollabBoard is a collaborative whiteboard with Google sign-in, Socket.io sync, gallery posts, friends, and optional voice and screen sharing in rooms.

## Features

- Google OAuth login and JWT sessions
- Rooms (public or private), join by room ID with server verification
- Live canvas, cursors, chat, host moderation hooks
- Gallery feed, likes, comments, leaderboard, trending spotlight (most liked post), trending hashtags
- Friends and notifications (recent-only in the API response; stored list is capped)

## Tech stack

- **Client:** React (Vite), React Router, Socket.io-client, Framer Motion  
- **Server:** Express 5, Socket.io, Mongoose, JWT  
- **Database:** MongoDB (Atlas or self-hosted)

## Local development

### Prerequisites

- Node.js 20+
- MongoDB URI (e.g. Atlas)
- Google OAuth client ID for the SPA
- `JWT_SECRET` for the API

### Server

```bash
cd server
cp .env.example .env   # if present; otherwise create .env
# Set MONGODB_URI, JWT_SECRET, CLIENT_URL (e.g. http://localhost:5173)
npm install
npm start
```

### Client

```bash
cd client
# Set VITE_API_URL=http://localhost:5000/api (or your API URL)
npm install
npm run dev
```

Set `VITE_GOOGLE_CLIENT_ID` (or your project’s env name) in `client` as required by `main.jsx`.

## Docker (API + static UI + nginx)

Uses **your** MongoDB Atlas URI from the host environment (no Mongo container).

1. Create a `.env` file next to `docker-compose.yml`:

```env
MONGODB_URI=mongodb+srv://...
JWT_SECRET=your-long-random-secret
CLIENT_URL=http://localhost
WEB_PORT=80
```

`CLIENT_URL` must match the URL users open in the browser (CORS + Socket.io). For local Docker, `http://localhost` is typical.

2. Build and run:

```bash
docker compose up --build
```

- UI: `http://localhost` (or `WEB_PORT`)  
- Browser calls `/api` and `/socket.io` on the same origin; nginx forwards those to the `api` service.

3. Production notes

- Use a real `CLIENT_URL` (https) for your domain.  
- Rebuild the `web` image if you change `VITE_API_URL`; the default baked in for Compose is `/api` so same-origin proxying works.  
- WebRTC (mic/screen) may need TURN servers on restrictive networks; the app uses public STUN only by default.

## Deployment (split)

Common pattern: **Vercel** (or similar) for the client and **Railway/Render/Fly** for the API. Set `VITE_API_URL` on the client to your API base including `/api`, and set `CLIENT_URL` on the server to your deployed SPA origin.

## License

MIT
