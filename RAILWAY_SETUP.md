# Railway Environment Setup Guide

Your server is now correctly installing its dependencies, but it requires the following environment variables to connect to your database and handle security.

## Required Variables
Please add these in the **Variables** tab of your Railway service:

| Key | Example Value | Description |
|---|---|---|
| **MONGODB_URI** | `mongodb+srv://...` | Your MongoDB connection string |
| **JWT_SECRET** | `your_long_random_string` | Used for login security |
| **CLIENT_URL** | `https://collab-board-rosy.vercel.app` | Your frontend URL (for CORS) |

## Steps to add:
1. Open [Railway.app](https://railway.app)
2. Select your project and the **Server** service.
3. Click the **Variables** tab at the top.
4. Click **+ New Variable** and add the keys and values from the table above.
5. Railway will automatically restart your server with the new settings.
