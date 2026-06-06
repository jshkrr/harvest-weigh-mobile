// POST /api/pallets/:id/weight   body { weight }   → save weight + mark Complete
// POST /api/pallets/:id/commence                    → mark Harvest started
const { core, applyCors, keyOk } = require('../../_lib');

module.exports = async (req, res) => {
  applyCors(req, res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (!keyOk(req)) return res.status(401).json({ error: 'Unauthorized' });
  if (req.method !== 'POST') return res.status(404).json({ error: 'Not found' });

  const { id, action, brand } = req.query;
  // Vercel parses JSON bodies automatically when Content-Type is application/json
  const body = req.body || {};

  try {
    if (action === 'weight') {
      const pallet = await core.submitWeight(id, body.weight, brand || null);
      return res.status(200).json({ ok: true, pallet });
    }
    if (action === 'commence') {
      const pallet = await core.commenceHarvesting(id, brand || null);
      return res.status(200).json({ ok: true, pallet });
    }
    return res.status(404).json({ error: 'Not found' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};
