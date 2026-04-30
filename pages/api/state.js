import { kv } from '@vercel/kv';

export default async function handler(req, res) {
  const KEY = 'camera_state_main';

  if (req.method === 'GET') {
    const data = await kv.get(KEY);
    return res.status(200).json(data || null);
  }

  if (req.method === 'POST') {
    await kv.set(KEY, req.body);
    return res.status(200).json({ ok: true });
  }

  res.status(405).end();
}
