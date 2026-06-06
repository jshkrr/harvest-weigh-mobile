// GET /api/pallets?brand=CT&harvester=HV2[&dateMs=...]
const { core, applyCors, keyOk } = require('../_lib');

module.exports = async (req, res) => {
  applyCors(req, res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (!keyOk(req)) return res.status(401).json({ error: 'Unauthorized' });
  if (req.method !== 'GET') return res.status(404).json({ error: 'Not found' });

  try {
    const { brand, harvester, dateMs } = req.query;
    const data = await core.getPallets({ brand, harvester, dateMs });
    res.status(200).json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};
