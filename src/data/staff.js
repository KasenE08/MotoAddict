// Employee roles. Costs are for Location 1 and scale with the location's price multiplier.
// caps[i] = how many you can hire at location i. Upgrades apply to the whole role at a location.
export const ROLES = [
  { id: 'salesman', name: 'Salesman', icon: 'staff', caps: [2, 3, 4, 5, 6], fee: 1500, wage: 180, desc: 'Serves customers so fewer walk out, and raises the chance they buy.' },
  { id: 'receptionist', name: 'Receptionist', icon: 'bell', caps: [1, 1, 2, 2, 3], fee: 1200, wage: 140, desc: 'Greets people at the front desk: more customers come in.' },
  { id: 'marketing', name: 'Marketing manager', icon: 'megaphone', caps: [1, 1, 1, 2, 2], fee: 3000, wage: 260, desc: 'Runs promotions: more customers come in.' },
  { id: 'janitor', name: 'Janitor', icon: 'broom', caps: [1, 2, 2, 3, 4], fee: 600, wage: 90, desc: 'Cleans up trash piles (one at a time each). A dirty showroom lowers your rating.' },
  { id: 'finance', name: 'Finance manager', icon: 'bill', caps: [1, 1, 1, 1, 1], fee: 4000, wage: 320, desc: 'Offers loans and payment plans so more customers can afford a bike.' },
  { id: 'mechanic', name: 'Mechanic', icon: 'wrench', caps: [1, 2, 2, 3, 3], fee: 2500, wage: 220, desc: "Services customers' bikes for cash and repairs used/trade-in bikes." },
  { id: 'detailer', name: 'Detailer', icon: 'sparkle', caps: [1, 1, 2, 2, 3], fee: 1500, wage: 150, desc: "Details customers' bikes for cash; detailed bikes on display sell more often." },
  { id: 'clerk', name: 'Parts & gear clerk', icon: 'cart', caps: [1, 1, 2, 2, 2], fee: 1200, wage: 130, desc: 'Sells gear, helmets and parts to more customers.' },
  { id: 'guard', name: 'Security guard', icon: 'shield', caps: [1, 1, 2, 2, 3], fee: 1800, wage: 170, desc: 'Works nights: thieves are much less likely to get away with a bike.' },
];
export const ROLE = Object.fromEntries(ROLES.map((r) => [r.id, r]));
export const MAX_ROLE_LEVEL = 5;
