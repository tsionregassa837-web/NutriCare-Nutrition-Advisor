import 'dotenv/config';
import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createApp } from './app';
import { Store } from './db';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const store = new Store(process.env.DATA_FILE ?? path.join(root, 'data', 'db.json'));
const app = createApp(store);

// In production (after `npm run build`) the same server also serves the built website.
const dist = path.join(root, 'dist');
if (fs.existsSync(dist)) {
  app.use(express.static(dist));
  app.get(/^(?!\/api).*/, (_req, res) => res.sendFile(path.join(dist, 'index.html')));
}

const port = Number(process.env.PORT ?? 8787);
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error('PORT must be an integer between 1 and 65535.');
}

app.listen(port, () => {
  console.log(`NutriCare API running on http://localhost:${port}`);
  if (!process.env.GEMINI_API_KEY) console.log('[info] GEMINI_API_KEY not set: AI chat and photo analysis will report "not configured".');
});
