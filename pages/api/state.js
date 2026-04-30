import { Redis } from '@upstash/redis';

const redis = new Redis({
  url:   process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

export default async function handler(req, res) {
  const KEY = 'camera_state_main';

  if (req.method === 'GET') {
    const data = await redis.get(KEY);
    return res.status(200).json(data || null);
  }

  if (req.method === 'POST') {
    await redis.set(KEY, req.body);
    return res.status(200).json({ ok: true });
  }

  res.status(405).end();
}
