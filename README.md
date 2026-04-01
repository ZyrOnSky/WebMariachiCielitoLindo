<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/b4da8933-dd5f-4428-8b65-e8187cd9b024

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Run the app:
   `npm run dev`

## Deploy on Netlify

This project includes a ready-to-use `netlify.toml`.

1. Push this repository to GitHub.
2. In Netlify, create a new site from that repository.
3. Build settings are already configured by `netlify.toml`:
   - Build command: `npm run build`
   - Publish directory: `dist`
4. Trigger a deploy.

Notes:
- The app is a SPA and `netlify.toml` already includes a redirect to `index.html`.
- Firebase web config is loaded from `firebase-applet-config.json` currently tracked in the repository.
