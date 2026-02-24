# CollabBoard - Real-Time Collaborative Whiteboard

CollabBoard is a high-performance, visually stunning real-time collaborative whiteboard platform built with the MERN stack. It allows teams to brainstorm, design, and visualize ideas together in a seamless, lag-free environment.

## 🚀 Features

- **Google OAuth 2.0 Authentication**: Secure and easy sign-in.
- **Real-time Synchronization**: Powered by Socket.io for instant updates across all users.
- **Object-Based Canvas Engine**: Create, move, and edit shapes without losing quality.
- **Comprehensive Toolset**: Pen, Rectangle, Circle, Line, Arrow, Text, and Sticky Notes.
- **Live Cursors**: See where everyone else is working in real-time.
- **Built-in Chat**: Communicate with your team directly inside the room.
- **Undo/Redo History**: Never lose your progress with state management.
- **Export to Image**: Save your creative work as high-quality PNGs.
- **Modern UI/UX**: Beautiful pastel aesthetics with glassmorphism and smooth animations.

## 🛠️ Tech Stack

- **Frontend**: React.js, Vite, Framer Motion, Lucide React, Socket.io-client.
- **Backend**: Node.js, Express.js, Socket.io, JWT, Passport.js.
- **Database**: MongoDB Atlas.
- **Styling**: Vanilla CSS (Custom properties & Glassmorphism).

## 📦 Setup Instructions

### Prerequisites
- Node.js installed on your machine.
- MongoDB Atlas account.
- Google Cloud Console project for OAuth credentials.

### Installation

1. **Clone the repository**:
   ```bash
   git clone <your-repo-link>
   cd Capstone_Project
   ```

2. **Backend Setup**:
   ```bash
   cd server
   npm install
   # Create a .env file based on .env.example and add your credentials
   npm start
   ```

3. **Frontend Setup**:
   ```bash
   cd ../client
   npm install
   # Replace GOOGLE_CLIENT_ID in src/main.jsx
   npm run dev
   ```

## 🎨 Design Philosophy

CollabBoard focuses on a **premium, professional aesthetic** using a curated pastel color palette. We avoided generic 'AI-generated' looks in favor of a clean, modern SaaS vibe that feels both powerful and welcoming.

## 📄 License

This project is licensed under the MIT License.
