// Material upgrades (per location, bought while CLOSED) and non-material upgrades
// (company-wide, bought any time).
//
// Material: `levels` = max level at Location 1; higher locations add `more[i]`.
// `unlock` = first location index where it can be built. `arrivals` = extra
// customers per level (cosmetic/comfort). `comfort` items also raise the rating.
// Functional items boost their related role/system instead.
export const MATERIAL = [
  // Showroom
  { id: 'flooring', name: 'Flooring', cat: 'Showroom', levels: 4, cost: 2500, arrivals: 0.03, comfort: true, desc: 'From bare concrete to polished stone.' },
  { id: 'lighting', name: 'Lighting', cat: 'Showroom', levels: 4, cost: 2000, arrivals: 0.03, comfort: true, desc: 'Brighter, warmer lights make bikes shine.' },
  { id: 'stands', name: 'Display stands', cat: 'Showroom', levels: 4, cost: 3000, arrivals: 0.03, desc: 'Plinths, carpeted risers, lit turntables.' },
  { id: 'art', name: 'Wall art & posters', cat: 'Showroom', levels: 3, cost: 1200, arrivals: 0.02, comfort: true, desc: 'Racing posters, framed prints, murals.' },
  { id: 'windows', name: 'Storefront glass', cat: 'Showroom', levels: 3, cost: 3500, arrivals: 0.04, desc: 'Bigger, cleaner windows pull in passers-by.' },
  { id: 'signage', name: 'Signage', cat: 'Showroom', levels: 4, cost: 2500, arrivals: 0.05, desc: 'From a painted board to a glowing pylon.' },
  // Customer comfort
  { id: 'couch', name: 'Couch', cat: 'Comfort', levels: 4, cost: 1500, arrivals: 0.02, comfort: true, desc: 'Somewhere to sit while they decide.' },
  { id: 'coffee', name: 'Coffee station', cat: 'Comfort', levels: 3, cost: 1200, arrivals: 0.02, comfort: true, desc: 'Free coffee keeps customers around.' },
  { id: 'tv', name: 'TV wall', cat: 'Comfort', levels: 3, cost: 2000, arrivals: 0.02, comfort: true, desc: 'Racing on the big screen.' },
  { id: 'kids', name: "Kids' area", cat: 'Comfort', levels: 3, cost: 1500, arrivals: 0.02, comfort: true, desc: 'Parents shop longer when kids are happy.' },
  { id: 'ac', name: 'Air conditioning', cat: 'Comfort', levels: 3, cost: 3000, arrivals: 0.02, comfort: true, desc: 'Cool air on hot days.' },
  { id: 'restrooms', name: 'Restrooms', cat: 'Comfort', levels: 3, cost: 2000, arrivals: 0.02, comfort: true, desc: 'Clean restrooms, happy customers.' },
  // Exterior
  { id: 'parking', name: 'Parking lot', cat: 'Exterior', levels: 3, cost: 4000, arrivals: 0.04, desc: 'Fresh asphalt, lines and lamps.' },
  { id: 'landscaping', name: 'Landscaping', cat: 'Exterior', levels: 4, cost: 2500, arrivals: 0.03, comfort: true, desc: 'Trees, hedges and flowers.' },
  { id: 'outdoor', name: 'Outdoor display', cat: 'Exterior', levels: 3, cost: 3500, arrivals: 0.04, desc: 'Bikes and flags out front.' },
  { id: 'fountain', name: 'Fountain', cat: 'Exterior', levels: 3, cost: 60000, arrivals: 0.06, comfort: true, unlock: 4, desc: 'A statement in the plaza.' },
  // Luxury
  { id: 'chandelier', name: 'Chandelier', cat: 'Luxury', levels: 3, cost: 30000, arrivals: 0.05, comfort: true, unlock: 2, desc: 'Crystal over the turntable.' },
  { id: 'vip', name: 'VIP lounge', cat: 'Luxury', levels: 3, cost: 50000, arrivals: 0.06, comfort: true, unlock: 3, desc: 'Private room for big spenders.' },
  { id: 'sculpture', name: 'Art & sculptures', cat: 'Luxury', levels: 3, cost: 40000, arrivals: 0.05, comfort: true, unlock: 3, desc: 'Gallery pieces on plinths.' },
  { id: 'valet', name: 'Valet stand', cat: 'Luxury', levels: 2, cost: 35000, arrivals: 0.05, unlock: 3, desc: 'Valet parking at the door.' },
  { id: 'champagne', name: 'Champagne bar', cat: 'Luxury', levels: 3, cost: 80000, arrivals: 0.06, comfort: true, unlock: 4, desc: 'Bubbles for closing the deal.' },
  { id: 'rooftop', name: 'Rooftop showcase', cat: 'Luxury', levels: 2, cost: 120000, arrivals: 0.08, unlock: 4, desc: 'A hero bike up high for the whole street to see.' },
  // Functional
  { id: 'storage', name: 'Storage space', cat: 'Functional', levels: 3, more: [0, 1, 2, 2, 2], cost: 6000, desc: '+2 display spots per level.' },
  { id: 'serviceBay', name: 'Service bay', cat: 'Functional', levels: 4, cost: 5000, desc: 'Mechanics earn and repair 25% faster per level.' },
  { id: 'detailBay', name: 'Detailing bay', cat: 'Functional', levels: 4, cost: 4000, desc: 'Detailers earn and work 25% faster per level.' },
  { id: 'shelves', name: 'Parts & gear shelves', cat: 'Functional', levels: 4, cost: 3000, desc: 'Gear sells for 20% more per level; clerks sell more often.' },
  { id: 'cameras', name: 'Security cameras', cat: 'Functional', levels: 4, cost: 4000, desc: 'Each level makes thefts 15% less likely to succeed.' },
  { id: 'office', name: 'Office & front desk', cat: 'Functional', levels: 4, cost: 3500, desc: 'Receptionists and the finance manager 15% better per level.' },
];
// cosmetic items get extra levels at higher locations (a fancier top tier)
const COSMETIC_MORE = [0, 0, 1, 1, 2];
export const MAT = Object.fromEntries(MATERIAL.map((m) => [m.id, m]));
export const MAT_CATS = ['Showroom', 'Comfort', 'Exterior', 'Luxury', 'Functional'];
export const maxLevel = (id, i) => {
  const m = MAT[id];
  if ((m.unlock ?? 0) > i) return 0;
  return m.levels + (m.more ? m.more[i] : m.cat === 'Functional' ? 0 : COSMETIC_MORE[i]);
};

// Non-material upgrades: company-wide. cost(level) = base * growth^level.
export const GLOBAL = [
  { id: 'negotiation', name: 'Negotiation training', cat: 'Sales', levels: 5, base: 4000, growth: 3, desc: 'Counters land more often; opening offers are closer to list.' },
  { id: 'upselling', name: 'Upselling', cat: 'Sales', levels: 5, base: 3000, growth: 3, desc: 'Bike buyers add gear more often, and spend more on it.' },
  { id: 'warranty', name: 'Warranty packages', cat: 'Sales', levels: 5, base: 6000, growth: 3, desc: '+1.5% of the price extra on every bike sold, per level.' },
  { id: 'financing', name: 'Financing deals', cat: 'Sales', levels: 5, base: 5000, growth: 3, desc: 'Customers can stretch 5% further over budget per level.' },
  { id: 'advertising', name: 'Advertising', cat: 'Customers', levels: 3, base: 8000, growth: 6, names: ['Radio', 'TV', 'Social media'], desc: 'Radio, then TV, then social media: +12% / +25% / +40% customers.' },
  { id: 'reputation', name: 'Reputation & brand', cat: 'Customers', levels: 5, base: 5000, growth: 3, desc: 'Raises your star rating, which brings more customers.' },
  { id: 'loyalty', name: 'Loyalty program', cat: 'Customers', levels: 5, base: 6000, growth: 3, desc: 'Repeat customers: +4% customers and more gear sales per level.' },
  { id: 'referral', name: 'Referral program', cat: 'Customers', levels: 5, base: 7000, growth: 3, desc: 'Buyers bring a friend 8% of the time per level.' },
  { id: 'listings', name: 'Online listings', cat: 'Customers', levels: 5, base: 9000, growth: 3, desc: 'Customers arrive already wanting a bike you have in stock.' },
  { id: 'supplier', name: 'Supplier discounts', cat: 'Operations', levels: 5, base: 10000, growth: 3, desc: 'Supplier price drops 1.5% of MSRP per level.' },
  { id: 'delivery', name: 'Faster deliveries', cat: 'Operations', levels: 3, base: 8000, growth: 4, desc: 'Orders need 6h -> 4h -> 2h -> 0h notice for tonight\'s truck.' },
  { id: 'tradeins', name: 'Better trade-ins', cat: 'Operations', levels: 5, base: 6000, growth: 3, desc: 'More frequent trade-in offers, at lower asking prices.' },
  { id: 'patience', name: 'Customer patience', cat: 'Operations', levels: 5, base: 4000, growth: 3, desc: 'Customers wait 20% longer per level (and haggle 3s longer).' },
  { id: 'training', name: 'Employee training', cat: 'Staff', levels: 5, base: 10000, growth: 3, desc: 'Every employee is 8% more effective per level.' },
  { id: 'contracts', name: 'Better contracts', cat: 'Staff', levels: 5, base: 8000, growth: 3, desc: 'Wages 7% lower per level.' },
  { id: 'morale', name: 'Staff morale', cat: 'Staff', levels: 5, base: 5000, growth: 3, desc: 'Fewer employees quit.' },
  { id: 'offlineBoost', name: 'Offline earnings boost', cat: 'Idle', levels: 5, base: 10000, growth: 3, desc: '+10% on everything earned while you are away, per level.' },
  { id: 'offlineCap', name: 'Offline cap', cat: 'Idle', levels: 6, base: 15000, growth: 2.2, desc: 'Earn for 1 more open hour while away per level (4h -> 10h).' },
  { id: 'insurance', name: 'Theft insurance', cat: 'Idle', levels: 3, base: 12000, growth: 4, desc: 'Recover 25% / 50% / 75% of a stolen bike\'s cost.' },
];
export const GLB = Object.fromEntries(GLOBAL.map((g) => [g.id, g]));
export const GLOBAL_CATS = ['Sales', 'Customers', 'Operations', 'Staff', 'Idle'];
