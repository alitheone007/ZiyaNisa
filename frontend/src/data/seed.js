// =========================================================================
// ZiyaNisa — frontend seed/mock data for the visual preview
// All product/service/brand data here is ORIGINAL placeholder content.
// Images are stock photography (Unsplash/Pexels) — REPLACE with cloud-hosted
// brand assets when moving to production.
//
// PENDING (next AI): wire these arrays to backend endpoints in
//   /app/backend/server.py  (already exposes /api/seed/* — see that file).
// =========================================================================

export const BRAND = {
  name: "ZiyaNisa",
  taglines: [
    "Glow, Grace & Beauty at Your Doorstep",
    "Clean Beauty, Skilled Care, Timeless Adornment",
    "K-Glow Science with Deccan Soul",
  ],
};

export const CATEGORIES = [
  { id: "skincare", label: "Skincare", img: "https://images.pexels.com/photos/8131568/pexels-photo-8131568.jpeg", tint: "from-aqua/20 to-ivory" },
  { id: "haircare", label: "Haircare", img: "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=800&q=80", tint: "from-peach/30 to-ivory" },
  { id: "makeup", label: "Makeup", img: "https://images.unsplash.com/photo-1503236823255-94609f598e71?w=800&q=80", tint: "from-rosemist to-ivory" },
  { id: "bath-body", label: "Bath & Body", img: "https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=800&q=80", tint: "from-champagne/40 to-ivory" },
  { id: "fragrance", label: "Fragrance & Ittar", img: "https://images.unsplash.com/photo-1458538977777-0549b2370168?w=800&q=80", tint: "from-gold/20 to-ivory" },
  { id: "jewellery", label: "Jewellery", img: "https://images.unsplash.com/photo-1693212793204-bcea856c75fe?w=800&q=80", tint: "from-champagne/50 to-ivory" },
  { id: "handbags", label: "Handbags", img: "https://images.unsplash.com/photo-1705909237050-7a7625b47fac?w=800&q=80", tint: "from-rosemist to-ivory" },
  { id: "tools", label: "Beauty Tools", img: "https://images.unsplash.com/photo-1631730486572-226d1f595b68?w=800&q=80", tint: "from-aqua/20 to-ivory" },
  { id: "mens", label: "Men's Grooming", img: "https://images.unsplash.com/photo-1581375074612-d1fd0e661aeb?w=800&q=80", tint: "from-taupe/15 to-ivory" },
  { id: "bridal", label: "Bridal & Occasion", img: "https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=800&q=80", tint: "from-gold/25 to-ivory" },
];

// Hero floating cards
export const HERO_FLOATERS = [
  { label: "SPF 50 Glow Shield", brand: "SeoulSaffron", img: "https://images.unsplash.com/photo-1623676714504-edd78728155e?w=600&q=80", tag: "K-Glow" },
  { label: "10% Niacinamide", brand: "NoorActives", img: "https://images.pexels.com/photos/35899861/pexels-photo-35899861.jpeg?auto=compress&w=600", tag: "Derm-Backed" },
  { label: "Oud Bloom Ittar", brand: "Deccan Dew", img: "https://images.unsplash.com/photo-1543422655-ac1c6ca993ed?w=600&q=80", tag: "Ittar Crafted" },
  { label: "Korean Glow Facial", brand: "At-home", img: "https://images.unsplash.com/photo-1643684391140-c5056cfd3436?w=600&q=80", tag: "Home Salon" },
  { label: "Pearl Drop Earrings", brand: "Nisa Atelier", img: "https://images.pexels.com/photos/36772547/pexels-photo-36772547.jpeg?auto=compress&w=600", tag: "Bridal" },
  { label: "Gold Thread Clutch", brand: "Nisa Atelier", img: "https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=600&q=80", tag: "Occasion" },
];

// Sample products (original copy, mock data)
export const PRODUCTS = [
  {
    id: "p1", name: "SPF 50 Glow Shield", brand: "SeoulSaffron",
    price: 1299, mrp: 1599, rating: 4.7, reviews: 1284,
    img: "https://images.unsplash.com/photo-1623676714504-edd78728155e?w=800&q=80",
    badges: ["K-Glow", "Clean Pick"],
    actives: ["Saffron", "Niacinamide", "Ceramide"],
  },
  {
    id: "p2", name: "10% Niacinamide Serum", brand: "NoorActives",
    price: 749, mrp: 999, rating: 4.8, reviews: 3210,
    img: "https://images.pexels.com/photos/35899861/pexels-photo-35899861.jpeg?auto=compress&w=800",
    badges: ["Derm-Backed", "Vegan"],
    actives: ["Niacinamide", "Zinc"],
  },
  {
    id: "p3", name: "Ceramide Barrier Cream", brand: "PearlRoot",
    price: 1099, mrp: 1399, rating: 4.6, reviews: 942,
    img: "https://images.unsplash.com/photo-1612817288484-6f916006741a?w=800&q=80",
    badges: ["K-Glow", "Fragrance-Free"],
    actives: ["Ceramide", "Hyaluronic Acid"],
  },
  {
    id: "p4", name: "Rice Water Gel Cleanser", brand: "AquaZiya",
    price: 549, mrp: 699, rating: 4.5, reviews: 1820,
    img: "https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?w=800&q=80",
    badges: ["Korean-Inspired"],
    actives: ["Rice Water", "Centella"],
  },
  {
    id: "p5", name: "Rose Mist Toner", brand: "Deccan Dew",
    price: 499, mrp: 649, rating: 4.4, reviews: 612,
    img: "https://images.unsplash.com/photo-1631730486572-226d1f595b68?w=800&q=80",
    badges: ["Organic"],
    actives: ["Rose", "Aloe Vera"],
  },
  {
    id: "p6", name: "Aloe Saffron Moisturizer", brand: "Nisa Botanics",
    price: 899, mrp: 1199, rating: 4.7, reviews: 2104,
    img: "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=800&q=80",
    badges: ["Clean Pick", "Cruelty-Free"],
    actives: ["Saffron", "Aloe Vera"],
  },
  {
    id: "p7", name: "Vitamin C Brightening Drops", brand: "GlowSutra",
    price: 1199, mrp: 1499, rating: 4.6, reviews: 1543,
    img: "https://images.unsplash.com/photo-1556228453-efd6c1ff04f6?w=800&q=80",
    badges: ["Derm-Backed"],
    actives: ["Vitamin C", "Ferulic Acid"],
  },
  {
    id: "p8", name: "Lip Repair Balm", brand: "RoseCeramide",
    price: 349, mrp: 449, rating: 4.5, reviews: 880,
    img: "https://images.unsplash.com/photo-1631214540553-ff044a3ff1d4?w=800&q=80",
    badges: ["Bridal Favorite"],
    actives: ["Shea", "Ceramide"],
  },
];

// Sample at-home services
export const SERVICES = [
  { id: "s1", name: "Korean Glow Facial", duration: "75 min", price: 1499, rating: 4.9, img: "https://images.pexels.com/photos/30809943/pexels-photo-30809943.jpeg?auto=compress&w=800", level: "Senior", tag: "K-Glow" },
  { id: "s2", name: "Saffron Brightening Cleanup", duration: "45 min", price: 799, rating: 4.7, img: "https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=800&q=80", level: "Trained", tag: "Best Seller" },
  { id: "s3", name: "Bridal Noor Makeup", duration: "180 min", price: 11999, rating: 4.9, img: "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=800&q=80", level: "Bridal Expert", tag: "Bridal" },
  { id: "s4", name: "Pearl Pedicure", duration: "60 min", price: 899, rating: 4.6, img: "https://images.unsplash.com/photo-1519823551278-64ac92734fb1?w=800&q=80", level: "Trained", tag: "Relax" },
  { id: "s5", name: "Hair Spa Ritual", duration: "60 min", price: 1199, rating: 4.7, img: "https://images.unsplash.com/photo-1560066984-138dadb4c035?w=800&q=80", level: "Senior", tag: "Repair" },
  { id: "s6", name: "Rose Manicure", duration: "45 min", price: 699, rating: 4.5, img: "https://images.unsplash.com/photo-1604654894610-df63bc536371?w=800&q=80", level: "Trained", tag: "Soothing" },
  { id: "s7", name: "Classic Waxing Package", duration: "50 min", price: 999, rating: 4.6, img: "https://images.unsplash.com/photo-1556228852-80b6e5eeff06?w=800&q=80", level: "Trained", tag: "Quick" },
  { id: "s8", name: "Party Glow Makeup", duration: "60 min", price: 1999, rating: 4.8, img: "https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?w=800&q=80", level: "Senior", tag: "Occasion" },
];

export const TRUST = [
  { label: "Verified Brands", icon: "ShieldCheck" },
  { label: "Trained Beauticians", icon: "Sparkles" },
  { label: "Clean Ingredients", icon: "Leaf" },
  { label: "Secure Payments", icon: "Lock" },
  { label: "Doorstep Service", icon: "Home" },
];

export const ITTAR_NOTES = [
  { name: "Oud Bloom", note: "Smoky · Rose · Resinous" },
  { name: "Saffron Veil", note: "Saffron · Amber · Musk" },
  { name: "Sandal Mist", note: "Sandalwood · Vanilla" },
  { name: "Hyderabadi Rose", note: "Damask Rose · Honey" },
];

export const JEWELLERY = [
  { id: "j1", name: "Ziya Pearl Drop Earrings", price: 2499, img: "https://images.pexels.com/photos/36772547/pexels-photo-36772547.jpeg?auto=compress&w=800" },
  { id: "j2", name: "Champagne Halo Necklace", price: 4299, img: "https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=800&q=80" },
  { id: "j3", name: "Gold Thread Clutch", price: 3199, img: "https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=800&q=80" },
  { id: "j4", name: "Bridal Kundan Set", price: 8999, img: "https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=800&q=80" },
];
