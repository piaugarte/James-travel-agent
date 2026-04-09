-- Trip overview
CREATE TABLE IF NOT EXISTS trip (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  title text,
  destination text,
  start_date date,
  end_date date,
  total_budget numeric,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Day-by-day itinerary
CREATE TABLE IF NOT EXISTS itinerary_days (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  trip_id uuid REFERENCES trip(id) ON DELETE CASCADE,
  day_number int,
  date date,
  title text,
  notes text,
  updated_at timestamptz DEFAULT now()
);

-- Activities/stops per day
CREATE TABLE IF NOT EXISTS itinerary_items (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  day_id uuid REFERENCES itinerary_days(id) ON DELETE CASCADE,
  time text,
  activity text,
  location text,
  cost numeric DEFAULT 0,
  category text,
  notes text,
  confirmed boolean DEFAULT false,
  sort_order int DEFAULT 0
);

-- Packing list
CREATE TABLE IF NOT EXISTS packing_items (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  trip_id uuid REFERENCES trip(id) ON DELETE CASCADE,
  item text,
  category text,
  packed boolean DEFAULT false
);

-- Enable Row Level Security but allow all for anon key (public trip)
ALTER TABLE trip ENABLE ROW LEVEL SECURITY;
ALTER TABLE itinerary_days ENABLE ROW LEVEL SECURITY;
ALTER TABLE itinerary_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE packing_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all" ON trip FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON itinerary_days FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON itinerary_items FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON packing_items FOR ALL USING (true) WITH CHECK (true);

-- Seed: Vancouver trip for Pia
INSERT INTO trip (id, title, destination, start_date, end_date, total_budget, notes)
VALUES (
  'a1b2c3d4-0000-0000-0000-000000000001',
  'Pia''s Vancouver Birthday Trip',
  'Vancouver, BC, Canada',
  '2026-06-15',
  '2026-07-01',
  11500,
  'Budget is CA$11,500 (approx 500,000 PHP). Staying at Ines and Ben house in Surrey for free. Whistler June 25-28.'
) ON CONFLICT (id) DO NOTHING;

-- Seed days
INSERT INTO itinerary_days (id, trip_id, day_number, date, title, notes) VALUES
('d0000001-0000-0000-0000-000000000001', 'a1b2c3d4-0000-0000-0000-000000000001', 1,  '2026-06-15', 'Arrive in Surrey', 'Settle in at Ines and Ben house. Jet lag recovery.'),
('d0000001-0000-0000-0000-000000000002', 'a1b2c3d4-0000-0000-0000-000000000001', 2,  '2026-06-16', 'White Rock Beach', 'Easy first full day. Stroll the pier, fish and chips.'),
('d0000001-0000-0000-0000-000000000003', 'a1b2c3d4-0000-0000-0000-000000000001', 3,  '2026-06-17', 'Stanley Park', 'Aquarium, seawall bike ride, miniature train.'),
('d0000001-0000-0000-0000-000000000004', 'a1b2c3d4-0000-0000-0000-000000000001', 4,  '2026-06-18', 'Granville Island', 'Public market, Kids Market, free water park, Aquabus.'),
('d0000001-0000-0000-0000-000000000005', 'a1b2c3d4-0000-0000-0000-000000000001', 5,  '2026-06-19', 'Capilano + Grouse', 'Suspension bridge, Treetops Adventure, optional Grouse Mountain.'),
('d0000001-0000-0000-0000-000000000006', 'a1b2c3d4-0000-0000-0000-000000000001', 6,  '2026-06-20', 'Science World + Gastown', 'SkyTrain to Science World, walk Gastown, souvenir shopping.'),
('d0000001-0000-0000-0000-000000000007', 'a1b2c3d4-0000-0000-0000-000000000001', 7,  '2026-06-21', 'Richmond Day', 'Steveston Village, visit Ana + Teresa + Bruce, Richmond Night Market.'),
('d0000001-0000-0000-0000-000000000008', 'a1b2c3d4-0000-0000-0000-000000000001', 8,  '2026-06-22', 'Surrey Chill Day', 'Bear Creek Park spray park, Surrey Nature Centre, Stewart Farm. Free day!'),
('d0000001-0000-0000-0000-000000000009', 'a1b2c3d4-0000-0000-0000-000000000001', 9,  '2026-06-23', 'Vancouver Zoo + Fort Langley', 'Greater Vancouver Zoo, Fort Langley National Historic Site.'),
('d0000001-0000-0000-0000-000000000010', 'a1b2c3d4-0000-0000-0000-000000000001', 10, '2026-06-24', 'VanDusen + Pack for Whistler', 'VanDusen Botanical Garden hedge maze. Afternoon: pack for Whistler!'),
('d0000001-0000-0000-0000-000000000011', 'a1b2c3d4-0000-0000-0000-000000000001', 11, '2026-06-25', 'Drive to Whistler', 'Andy family flies in. Everyone drives Sea to Sky Highway to Whistler Airbnb.'),
('d0000001-0000-0000-0000-000000000012', 'a1b2c3d4-0000-0000-0000-000000000001', 12, '2026-06-26', 'Whistler: Peak 2 Peak + Lake', 'Peak 2 Peak Gondola (kids under 7 free!), Alta Lake swimming and kayaking.'),
('d0000001-0000-0000-0000-000000000013', 'a1b2c3d4-0000-0000-0000-000000000001', 13, '2026-06-27', 'Whistler: Ziptrek + Train Wreck', 'Ziptrek TreeTrek canopy walk, Train Wreck Trail hike, group BBQ at Airbnb.'),
('d0000001-0000-0000-0000-000000000014', 'a1b2c3d4-0000-0000-0000-000000000001', 14, '2026-06-28', 'Brandywine Falls + Drive Back', 'Brandywine Falls hike, Purebread bakery stop, drive back to Surrey.'),
('d0000001-0000-0000-0000-000000000015', 'a1b2c3d4-0000-0000-0000-000000000001', 15, '2026-06-29', 'PIA''S BIRTHDAY!', 'Happy 4th birthday Pia! Playland at PNE, birthday dinner, cake at home.'),
('d0000001-0000-0000-0000-000000000016', 'a1b2c3d4-0000-0000-0000-000000000001', 16, '2026-06-30', 'UBC + Museum of Anthropology', 'Museum of Anthropology, UBC campus walk, Spanish Banks Beach.'),
('d0000001-0000-0000-0000-000000000017', 'a1b2c3d4-0000-0000-0000-000000000001', 17, '2026-07-01', 'Canada Day! Fly home', 'Canada Day celebrations in Surrey - fireworks! Andy family flies out.')
ON CONFLICT (id) DO NOTHING;

-- Seed activities for a few key days
INSERT INTO itinerary_items (day_id, time, activity, location, cost, category, confirmed, sort_order) VALUES
-- Day 3: Stanley Park
('d0000001-0000-0000-0000-000000000003', '10:00 AM', 'Vancouver Aquarium', 'Stanley Park', 130, 'activity', false, 1),
('d0000001-0000-0000-0000-000000000003', '1:00 PM', 'Seawall bike ride', 'Stanley Park Seawall', 60, 'activity', false, 2),
('d0000001-0000-0000-0000-000000000003', '3:00 PM', 'Miniature train + playground', 'Stanley Park', 28, 'activity', false, 3),
-- Day 5: Capilano
('d0000001-0000-0000-0000-000000000005', '10:00 AM', 'Capilano Suspension Bridge + Treetops', 'North Vancouver', 200, 'activity', false, 1),
('d0000001-0000-0000-0000-000000000005', '2:00 PM', 'Grouse Mountain gondola (optional)', 'North Vancouver', 180, 'activity', false, 2),
-- Day 12: Whistler Peak 2 Peak
('d0000001-0000-0000-0000-000000000012', '10:00 AM', 'Peak 2 Peak Gondola', 'Whistler Blackcomb', 260, 'activity', false, 1),
('d0000001-0000-0000-0000-000000000012', '2:00 PM', 'Alta Lake swimming + kayak rental', 'Alta Lake', 75, 'activity', false, 2),
-- Day 15: Birthday
('d0000001-0000-0000-0000-000000000015', '11:00 AM', 'Playland at the PNE', 'East Vancouver', 220, 'activity', false, 1),
('d0000001-0000-0000-0000-000000000015', '7:00 PM', 'Birthday dinner (book in advance!)', 'Richmond/Surrey', 200, 'food', false, 2),
('d0000001-0000-0000-0000-000000000015', '9:00 PM', 'Birthday cake at home', 'Ines and Ben house', 50, 'food', false, 3)
ON CONFLICT DO NOTHING;

-- Seed packing list
INSERT INTO packing_items (trip_id, item, category, packed) VALUES
('a1b2c3d4-0000-0000-0000-000000000001', 'Passports for all 4', 'documents', false),
('a1b2c3d4-0000-0000-0000-000000000001', 'Travel insurance docs', 'documents', false),
('a1b2c3d4-0000-0000-0000-000000000001', 'ETA for Canada (pre-apply!)', 'documents', false),
('a1b2c3d4-0000-0000-0000-000000000001', 'Light rain jacket x4', 'clothing', false),
('a1b2c3d4-0000-0000-0000-000000000001', 'Layers - mornings are cool', 'clothing', false),
('a1b2c3d4-0000-0000-0000-000000000001', 'Good walking shoes', 'clothing', false),
('a1b2c3d4-0000-0000-0000-000000000001', 'Swimwear for all kids', 'clothing', false),
('a1b2c3d4-0000-0000-0000-000000000001', 'Sunscreen SPF 50+', 'health', false),
('a1b2c3d4-0000-0000-0000-000000000001', 'Kids motion sickness tabs (Sea to Sky drive!)', 'health', false),
('a1b2c3d4-0000-0000-0000-000000000001', 'Snacks for long days', 'food', false),
('a1b2c3d4-0000-0000-0000-000000000001', 'Reusable water bottles x4', 'gear', false),
('a1b2c3d4-0000-0000-0000-000000000001', 'Backpack / day bag', 'gear', false),
('a1b2c3d4-0000-0000-0000-000000000001', 'Portable charger', 'tech', false),
('a1b2c3d4-0000-0000-0000-000000000001', 'Canadian SIM or roaming plan', 'tech', false)
ON CONFLICT DO NOTHING;
