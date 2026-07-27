import type { VercelRequest, VercelResponse } from '@vercel/node';
import { loadConfig } from '../src/config.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const config = loadConfig();
  res.status(200).send({ status: 'ok', db: config.databaseUrl ? config.databaseUrl.substring(0, 30) : 'none' });
}
