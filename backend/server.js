const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const router = express.Router();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const app = express();
const PORT = 4000;
const DATA_FILE = path.join(__dirname, 'offers.json');

app.use(cors());
app.use(express.json());

// Helper to read/write offers
function readOffers() {
  if (!fs.existsSync(DATA_FILE)) return [];
  return JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
}
function writeOffers(offers) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(offers, null, 2));
}

// GET all offers
app.get('/api/offers', (req, res) => {
  res.json(readOffers());
});

// CREATE offer
app.post('/api/offers', (req, res) => {
  const offers = readOffers();
  const { title, description, amount, deadline } = req.body;
  console.log('POST /api/offers body:', req.body); // Debug log
  const id = Date.now().toString();
  const newOffer = { id, title, description, amount, active: false, deadline: deadline || null };
  offers.push(newOffer);
  writeOffers(offers);
  res.status(201).json(newOffer);
});

// UPDATE offer
app.put('/api/offers/:id', (req, res) => {
  const offers = readOffers();
  const { id } = req.params;
  const { title, description, amount, active, deadline } = req.body;
  console.log('PUT /api/offers/:id body:', req.body); // Debug log
  const idx = offers.findIndex(o => o.id === id);
  if (idx === -1) return res.status(404).json({ error: 'Offer not found' });
  offers[idx] = { ...offers[idx], title, description, amount, active: active !== undefined ? active : offers[idx].active, deadline: deadline !== undefined ? deadline : offers[idx].deadline };
  writeOffers(offers);
  res.json(offers[idx]);
});

// DELETE offer
app.delete('/api/offers/:id', (req, res) => {
  let offers = readOffers();
  const { id } = req.params;
  const idx = offers.findIndex(o => o.id === id);
  if (idx === -1) return res.status(404).json({ error: 'Offer not found' });
  const deleted = offers[idx];
  offers = offers.filter(o => o.id !== id);
  writeOffers(offers);
  res.json(deleted);
});

// PATCH offer active status
app.patch('/api/offers/:id/active', (req, res) => {
  const offers = readOffers();
  const { id } = req.params;
  const { active } = req.body;
  const idx = offers.findIndex(o => o.id === id);
  if (idx === -1) return res.status(404).json({ error: 'Offer not found' });
  offers[idx].active = !!active;
  writeOffers(offers);
  res.json(offers[idx]);
});

// Add this endpoint for deleting images from Supabase Storage
router.delete('/delete-image', async (req, res) => {
  const { path } = req.body;
  if (!path) return res.status(400).json({ error: 'No path provided' });
  const { error } = await supabase.storage.from('notification-images').remove([path]);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

module.exports = router;

app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
}); 