// ZiyaNisa — frontend seed data. Images are stock photography (Unsplash/Pexels).
// Replace with cloud-hosted brand/product assets before launch.

export const BRAND = {
  name: "ZiyaNisa",
  taglines: [
    "Glow, Grace & Beauty at Your Doorstep",
    "Clean Beauty, Skilled Care, Timeless Adornment",
    "K-Glow Science with Deccan Soul",
  ],
};

export const CATEGORIES = [
  { id: "skincare",  label: "Skincare",            img: "/categories/skincare.jpg",  tint: "from-aqua/20 to-ivory" },
  { id: "haircare",  label: "Haircare",             img: "/categories/haircare.jpg", tint: "from-peach/30 to-ivory" },
  { id: "makeup",    label: "Makeup",               img: "/categories/makeup.jpg", tint: "from-rosemist to-ivory" },
  { id: "bath-body", label: "Bath & Body",          img: "/categories/bath-body.jpg", tint: "from-champagne/40 to-ivory" },
  { id: "fragrance", label: "Fragrance & Ittar",   img: "/categories/fragrance.jpg",  tint: "from-gold/20 to-ivory" },
  { id: "jewellery", label: "Jewellery",            img: "/categories/jewellery.jpg", tint: "from-champagne/50 to-ivory" },
  { id: "handbags",  label: "Handbags",             img: "/categories/handbags.jpg", tint: "from-rosemist to-ivory" },
  { id: "tools",     label: "Beauty Tools",         img: "/categories/tools.jpg", tint: "from-aqua/20 to-ivory" },
  { id: "mens",      label: "Men's Grooming",       img: "/categories/mens.jpg", tint: "from-taupe/15 to-ivory" },
  { id: "bridal",    label: "Bridal & Occasion",    img: "/categories/bridal.jpg", tint: "from-gold/25 to-ivory" },
];

export const HERO_FLOATERS = [
  { label: "SPF 50 Glow Shield",   brand: "SeoulSaffron", img: "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=600&q=80", tag: "K-Glow" },
  { label: "10% Niacinamide",      brand: "NoorActives",  img: "https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?w=600&q=80", tag: "Derm-Backed" },
  { label: "Oud Bloom Ittar",      brand: "Deccan Dew",   img: "https://images.unsplash.com/photo-1543422655-ac1c6ca993ed?w=600&q=80",    tag: "Ittar Crafted" },
  { label: "Korean Glow Facial",   brand: "At-home",      img: "https://images.pexels.com/photos/30809943/pexels-photo-30809943.jpeg?auto=compress&w=600", tag: "Home Salon" },
  { label: "Pearl Drop Earrings",  brand: "Nisa Atelier", img: "https://images.pexels.com/photos/36772547/pexels-photo-36772547.jpeg?auto=compress&w=600", tag: "Bridal" },
  { label: "Gold Thread Clutch",   brand: "Nisa Atelier", img: "https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=600&q=80", tag: "Occasion" },
];

export const PRODUCTS = [
  // ── SKINCARE ──────────────────────────────────────────────────────────────
  { id: "p-sk-01", name: "SPF 50 Glow Shield",          brand: "SeoulSaffron",  price: 1299, mrp: 1599, rating: 4.7, reviews: 1284, img: "/products/p-sk-01.jpg", badges: ["K-Glow","Clean Pick"],       actives: ["Saffron","Niacinamide","Ceramide"],  category_id: "skincare" },
  { id: "p-sk-02", name: "10% Niacinamide Serum",       brand: "NoorActives",   price:  749, mrp:  999, rating: 4.8, reviews: 3210, img: "/products/p-sk-02.jpg", badges: ["Derm-Backed","Vegan"],        actives: ["Niacinamide","Zinc"],               category_id: "skincare" },
  { id: "p-sk-03", name: "Ceramide Barrier Cream",      brand: "PearlRoot",     price: 1099, mrp: 1399, rating: 4.6, reviews:  942, img: "/products/p-sk-03.jpg", badges: ["K-Glow","Fragrance-Free"],   actives: ["Ceramide","Hyaluronic Acid"],       category_id: "skincare" },
  { id: "p-sk-04", name: "Rice Water Gel Cleanser",     brand: "AquaZiya",      price:  549, mrp:  699, rating: 4.5, reviews: 1820, img: "/products/p-sk-04.jpg",  badges: ["Korean-Inspired"],            actives: ["Rice Water","Centella"],            category_id: "skincare" },
  { id: "p-sk-05", name: "Rose Mist Toner",             brand: "Deccan Dew",    price:  499, mrp:  649, rating: 4.4, reviews:  612, img: "/products/p-sk-05.jpg", badges: ["Organic"],                   actives: ["Rose","Aloe Vera"],                 category_id: "skincare" },
  { id: "p-sk-06", name: "Aloe Saffron Moisturizer",   brand: "Nisa Botanics", price:  899, mrp: 1199, rating: 4.7, reviews: 2104, img: "/products/p-sk-06.jpg", badges: ["Clean Pick","Cruelty-Free"], actives: ["Saffron","Aloe Vera"],              category_id: "skincare" },
  { id: "p-sk-07", name: "Vitamin C Brightening Drops", brand: "GlowSutra",    price: 1199, mrp: 1499, rating: 4.6, reviews: 1543, img: "/products/p-sk-07.jpg", badges: ["Derm-Backed"],               actives: ["Vitamin C","Ferulic Acid"],         category_id: "skincare" },
  { id: "p-sk-08", name: "Lip Repair Balm",             brand: "RoseCeramide", price:  349, mrp:  449, rating: 4.5, reviews:  880, img: "/products/p-sk-08.jpg",  badges: ["Bridal Favorite"],            actives: ["Shea","Ceramide"],                  category_id: "skincare" },
  { id: "p-sk-09", name: "Hyaluronic Eye Gel",          brand: "KoraCare",     price:  649, mrp:  849, rating: 4.6, reviews:  710, img: "/products/p-sk-09.jpg", badges: ["K-Glow"],                    actives: ["HA","Peptides"],                    category_id: "skincare" },
  { id: "p-sk-10", name: "Retinol Night Renewal Cream", brand: "NoorActives",  price: 1399, mrp: 1799, rating: 4.7, reviews: 1102, img: "/products/p-sk-10.jpg", badges: ["Derm-Backed"],               actives: ["Retinol","Bakuchiol","Ceramide"],   category_id: "skincare" },

  // ── HAIRCARE ──────────────────────────────────────────────────────────────
  { id: "p-hc-01", name: "Rice Protein Shampoo",        brand: "KoraCare",     price:  399, mrp:  499, rating: 4.5, reviews: 1340, img: "/products/p-hc-01.jpg", badges: ["Sulfate-Free"],               actives: ["Rice Protein","Biotin"],            category_id: "haircare" },
  { id: "p-hc-02", name: "Bhringraj Hair Oil",           brand: "NisaRoots",   price:  449, mrp:  599, rating: 4.7, reviews: 2890, img: "/products/p-hc-02.jpg",  badges: ["Ayurvedic"],                 actives: ["Bhringraj","Amla","Coconut"],       category_id: "haircare" },
  { id: "p-hc-03", name: "Keratin Repair Mask",         brand: "SilkNisa",    price:  799, mrp:  999, rating: 4.6, reviews:  980, img: "/products/p-hc-03.jpg", badges: ["Salon-Grade"],               actives: ["Keratin","Argan","Protein"],        category_id: "haircare" },
  { id: "p-hc-04", name: "Onion Black Seed Oil",        brand: "NisaRoots",   price:  349, mrp:  449, rating: 4.8, reviews: 4210, img: "/products/p-hc-04.jpg", badges: ["Ayurvedic","Bestseller"],    actives: ["Onion","Kalonji","Castor"],         category_id: "haircare" },
  { id: "p-hc-05", name: "Fenugreek Scalp Serum",       brand: "GlowSutra",   price:  699, mrp:  899, rating: 4.5, reviews:  560, img: "/products/p-hc-05.jpg", badges: ["Anti-Dandruff"],             actives: ["Fenugreek","Salicylic Acid"],       category_id: "haircare" },
  { id: "p-hc-06", name: "Argan Shine Conditioner",     brand: "SilkNisa",    price:  499, mrp:  649, rating: 4.4, reviews:  830, img: "/products/p-hc-06.jpg", badges: ["Vegan"],                     actives: ["Argan","Vitamin E"],               category_id: "haircare" },
  { id: "p-hc-07", name: "Anti-Frizz Serum",            brand: "KoraCare",    price:  549, mrp:  699, rating: 4.6, reviews: 1230, img: "/products/p-hc-07.jpg", badges: ["Heat-Protect"],              actives: ["Silicone-Free","Camellia Oil"],     category_id: "haircare" },
  { id: "p-hc-08", name: "Biotin Growth Drops",         brand: "NoorActives", price:  899, mrp: 1199, rating: 4.7, reviews: 1780, img: "/products/p-hc-08.jpg", badges: ["Clinically Tested"],         actives: ["Biotin","Redensyl","Caffeine"],     category_id: "haircare" },
  { id: "p-hc-09", name: "Hair Detox Scalp Scrub",      brand: "AquaZiya",    price:  449, mrp:  599, rating: 4.3, reviews:  490, img: "/products/p-hc-09.jpg", badges: ["Clean Pick"],                actives: ["Sea Salt","Peppermint","AHA"],      category_id: "haircare" },
  { id: "p-hc-10", name: "Cold Press Coconut Hair Butter", brand: "Deccan Dew", price: 299, mrp: 399, rating: 4.5, reviews: 2100, img: "/products/p-hc-10.jpg",  badges: ["Organic"],                  actives: ["Coconut","Shea","Hibiscus"],        category_id: "haircare" },

  // ── MAKEUP ────────────────────────────────────────────────────────────────
  { id: "p-mk-01", name: "Saffron Glow Foundation",     brand: "NisaBeauty",  price:  999, mrp: 1299, rating: 4.6, reviews: 1450, img: "/products/p-mk-01.jpg", badges: ["SPF 20","Vegan"],             actives: ["Saffron","Hyaluronic Acid"],        category_id: "makeup" },
  { id: "p-mk-02", name: "Kajal Kohl Liner",            brand: "KoraCare",    price:  199, mrp:  249, rating: 4.8, reviews: 5420, img: "/products/p-mk-02.jpg",  badges: ["Waterproof","Bestseller"],   actives: ["Kohl","Vitamin E"],                 category_id: "makeup" },
  { id: "p-mk-03", name: "Rose Velvet Lipstick",        brand: "NisaBeauty",  price:  399, mrp:  499, rating: 4.7, reviews: 2380, img: "/products/p-mk-03.jpg", badges: ["Long-Lasting"],              actives: ["Shea","Jojoba"],                    category_id: "makeup" },
  { id: "p-mk-04", name: "K-Glow Highlighter Palette", brand: "GlowSutra",   price:  849, mrp: 1099, rating: 4.8, reviews: 1780, img: "/products/p-mk-04.jpg", badges: ["K-Glow"],                    actives: ["Pearl","Mica"],                     category_id: "makeup" },
  { id: "p-mk-05", name: "CC Cream SPF 30",             brand: "SeoulSaffron", price: 749, mrp:  999, rating: 4.5, reviews:  960, img: "/products/p-mk-05.jpg", badges: ["SPF 30","K-Beauty"],         actives: ["Niacinamide","Ceramide"],           category_id: "makeup" },
  { id: "p-mk-06", name: "Volume Mascara",              brand: "NisaBeauty",  price:  449, mrp:  549, rating: 4.6, reviews: 1120, img: "/products/p-mk-06.jpg", badges: ["Waterproof"],                actives: ["Vitamin B5","Beeswax"],             category_id: "makeup" },
  { id: "p-mk-07", name: "Nude Glow Eyeshadow Palette", brand: "GlowSutra",  price: 1199, mrp: 1499, rating: 4.7, reviews: 2040, img: "/products/p-mk-07.jpg", badges: ["Derm-Backed"],              actives: ["Mica","Jojoba"],                    category_id: "makeup" },
  { id: "p-mk-08", name: "Brow Definer Pencil",         brand: "KoraCare",    price:  299, mrp:  399, rating: 4.5, reviews:  870, img: "/products/p-mk-08.jpg", badges: ["Vegan"],                     actives: ["Carnauba Wax"],                    category_id: "makeup" },
  { id: "p-mk-09", name: "Dewy Setting Mist",           brand: "AquaZiya",    price:  499, mrp:  649, rating: 4.6, reviews: 1310, img: "/products/p-mk-09.jpg", badges: ["Clean Pick"],                actives: ["Rose Water","Glycerin"],            category_id: "makeup" },
  { id: "p-mk-10", name: "Blush Duo — Peach & Rose",   brand: "NisaBeauty",  price:  649, mrp:  849, rating: 4.7, reviews:  930, img: "/products/p-mk-10.jpg", badges: ["Buildable"],                 actives: ["Pearl","Mica","Vitamin E"],         category_id: "makeup" },

  // ── BATH & BODY ───────────────────────────────────────────────────────────
  { id: "p-bb-01", name: "Sandalwood Body Butter",      brand: "Deccan Dew",  price:  699, mrp:  899, rating: 4.8, reviews: 1680, img: "/products/p-bb-01.jpg", badges: ["Organic","Vegan"],           actives: ["Sandalwood","Shea","Vitamin E"],    category_id: "bath-body" },
  { id: "p-bb-02", name: "Rose Petal Body Scrub",       brand: "Nisa Botanics", price: 549, mrp: 699, rating: 4.6, reviews: 1040, img: "/products/p-bb-02.jpg", badges: ["Clean Pick"],              actives: ["Rose","Sugar","Jojoba Beads"],      category_id: "bath-body" },
  { id: "p-bb-03", name: "Kumkumadi Body Oil",          brand: "NisaRoots",   price:  849, mrp: 1099, rating: 4.7, reviews:  870, img: "/products/p-bb-03.jpg", badges: ["Ayurvedic"],                actives: ["Saffron","Kumkumadi","Sesame"],     category_id: "bath-body" },
  { id: "p-bb-04", name: "Jasmine Shower Gel",          brand: "AquaZiya",    price:  399, mrp:  499, rating: 4.4, reviews:  760, img: "/products/p-bb-04.jpg", badges: ["SLS-Free"],                 actives: ["Jasmine","Aloe","Glycerin"],        category_id: "bath-body" },
  { id: "p-bb-05", name: "Ubtan Brightening Pack",      brand: "NisaRoots",   price:  349, mrp:  449, rating: 4.8, reviews: 3210, img: "/products/p-bb-05.jpg", badges: ["Ayurvedic","Bestseller"],   actives: ["Turmeric","Sandalwood","Chickpea"], category_id: "bath-body" },
  { id: "p-bb-06", name: "Coffee Body Polisher",        brand: "GlowSutra",   price:  449, mrp:  599, rating: 4.6, reviews:  920, img: "/products/p-bb-06.jpg", badges: ["Vegan"],                     actives: ["Coffee","Coconut","Sea Salt"],      category_id: "bath-body" },
  { id: "p-bb-07", name: "Neem Antibacterial Soap",     brand: "Nisa Botanics", price: 149, mrp: 199, rating: 4.5, reviews: 4580, img: "/products/p-bb-07.jpg", badges: ["Ayurvedic"],               actives: ["Neem","Turmeric","Tulsi"],          category_id: "bath-body" },
  { id: "p-bb-08", name: "Foot Repair Cream",           brand: "Deccan Dew",  price:  299, mrp:  399, rating: 4.5, reviews:  640, img: "/products/p-bb-08.jpg", badges: ["Intensive Care"],            actives: ["Urea","Shea","Peppermint"],         category_id: "bath-body" },
  { id: "p-bb-09", name: "Under-Arm Brightener Serum",  brand: "GlowSutra",  price:  499, mrp:  649, rating: 4.4, reviews:  510, img: "/products/p-bb-09.jpg",  badges: ["Derm-Backed"],              actives: ["Kojic Acid","Niacinamide","AHA"],   category_id: "bath-body" },
  { id: "p-bb-10", name: "Hand & Nail Cream",           brand: "Nisa Botanics", price: 249, mrp: 329, rating: 4.6, reviews: 1450, img: "/products/p-bb-10.jpg", badges: ["Vegan"],                   actives: ["Rose Hip","Biotin","Glycerin"],     category_id: "bath-body" },

  // ── FRAGRANCE ─────────────────────────────────────────────────────────────
  { id: "p-fr-01", name: "Oud Bloom Ittar",             brand: "Deccan Dew",  price: 1299, mrp: 1599, rating: 4.9, reviews: 2340, img: "/products/p-fr-01.jpg",  badges: ["Pure Attar"],               actives: ["Oud","Rose","Resin"],               category_id: "fragrance" },
  { id: "p-fr-02", name: "Saffron Veil Attar",          brand: "Deccan Dew",  price: 1499, mrp: 1999, rating: 4.8, reviews: 1120, img: "/products/p-fr-02.jpg", badges: ["Pure Attar"],              actives: ["Saffron","Amber","Musk"],           category_id: "fragrance" },
  { id: "p-fr-03", name: "Sandal Mist EDP",             brand: "Nisa Atelier", price: 1899, mrp: 2499, rating: 4.7, reviews: 890, img: "/products/p-fr-03.jpg", badges: ["Long-Lasting"],             actives: ["Sandalwood","Vanilla","Vetiver"],   category_id: "fragrance" },
  { id: "p-fr-04", name: "Hyderabadi Rose EDP",         brand: "Nisa Atelier", price: 2199, mrp: 2799, rating: 4.8, reviews: 740, img: "/products/p-fr-04.jpg", badges: ["Bridal Favorite"],         actives: ["Damask Rose","Honey","Jasmine"],    category_id: "fragrance" },
  { id: "p-fr-05", name: "Oud Noir Parfum",             brand: "Deccan Dew",  price: 2999, mrp: 3999, rating: 4.9, reviews: 460, img: "/products/p-fr-05.jpg",  badges: ["Pure Oud"],                 actives: ["Oud","Patchouli","Amber"],          category_id: "fragrance" },
  { id: "p-fr-06", name: "Jasmine Musk Body Spray",     brand: "AquaZiya",    price:  599, mrp:  799, rating: 4.5, reviews: 1890, img: "/products/p-fr-06.jpg", badges: ["Everyday Wear"],           actives: ["Jasmine","White Musk"],             category_id: "fragrance" },
  { id: "p-fr-07", name: "Amber Wood Cologne",          brand: "Nisa Atelier", price: 1699, mrp: 2199, rating: 4.6, reviews: 570, img: "/products/p-fr-07.jpg", badges: ["Unisex"],                  actives: ["Amber","Cedarwood","Bergamot"],     category_id: "fragrance" },
  { id: "p-fr-08", name: "Rose Oud Attar Oil",          brand: "Deccan Dew",  price:  999, mrp: 1299, rating: 4.7, reviews: 1340, img: "/products/p-fr-08.jpg", badges: ["Pure Attar","No Alcohol"], actives: ["Rose","Oud"],                       category_id: "fragrance" },
  { id: "p-fr-09", name: "Champagne Bloom EDP",         brand: "Nisa Atelier", price: 2499, mrp: 3199, rating: 4.7, reviews: 380, img: "/products/p-fr-09.jpg", badges: ["Luxury"],                  actives: ["Champagne Rose","Peach","Musk"],    category_id: "fragrance" },
  { id: "p-fr-10", name: "Black Amber Parfum",          brand: "Deccan Dew",  price: 1799, mrp: 2299, rating: 4.8, reviews: 510, img: "/products/p-fr-10.jpg",  badges: ["Intense"],                 actives: ["Black Musk","Amber","Labdanum"],    category_id: "fragrance" },

  // ── JEWELLERY ─────────────────────────────────────────────────────────────
  { id: "p-jw-01", name: "Ziya Pearl Drop Earrings",    brand: "Nisa Atelier", price: 2499, mrp: 3199, rating: 4.9, reviews: 870,  img: "/products/p-jw-01.jpg", badges: ["Bridal","Bestseller"], actives: [], category_id: "jewellery" },
  { id: "p-jw-02", name: "Champagne Halo Necklace",     brand: "Nisa Atelier", price: 4299, mrp: 5499, rating: 4.8, reviews: 540,  img: "/products/p-jw-02.jpg", badges: ["Gold-Plated"],                actives: [], category_id: "jewellery" },
  { id: "p-jw-03", name: "Bridal Kundan Set",           brand: "Nisa Atelier", price: 8999, mrp:11999, rating: 4.9, reviews: 310,  img: "/products/p-jw-03.jpg", badges: ["Bridal","Handcrafted"],           actives: [], category_id: "jewellery" },
  { id: "p-jw-04", name: "Gold Layered Anklet",         brand: "NisaGold",    price:  999, mrp: 1299, rating: 4.6, reviews: 720,  img: "/products/p-jw-04.jpg", badges: ["Gold-Plated"],                actives: [], category_id: "jewellery" },
  { id: "p-jw-05", name: "Emerald Stud Earrings",       brand: "NisaGold",    price: 1799, mrp: 2299, rating: 4.7, reviews: 430,  img: "/products/p-jw-05.jpg", badges: ["Statement"],                  actives: [], category_id: "jewellery" },
  { id: "p-jw-06", name: "Maang Tikka — Temple Gold",  brand: "Nisa Atelier", price: 1599, mrp: 1999, rating: 4.8, reviews: 640,  img: "/products/p-jw-06.jpg", badges: ["Bridal","Traditional"],          actives: [], category_id: "jewellery" },
  { id: "p-jw-07", name: "Floral Polki Ring",           brand: "NisaGold",    price: 1299, mrp: 1699, rating: 4.7, reviews: 390,  img: "/products/p-jw-07.jpg", badges: ["Handcrafted"],                actives: [], category_id: "jewellery" },
  { id: "p-jw-08", name: "Temple Gold Choker",          brand: "Nisa Atelier", price: 3499, mrp: 4499, rating: 4.8, reviews: 490,  img: "/products/p-jw-08.jpg", badges: ["Bridal","Bestseller"],           actives: [], category_id: "jewellery" },
  { id: "p-jw-09", name: "Diamond-Cut Bangle Pair",    brand: "NisaGold",    price: 2299, mrp: 2999, rating: 4.6, reviews: 350,  img: "/products/p-jw-09.jpg", badges: ["Gold-Plated"],                actives: [], category_id: "jewellery" },
  { id: "p-jw-10", name: "Enamel Peacock Bracelet",    brand: "Nisa Atelier", price: 1199, mrp: 1499, rating: 4.7, reviews: 610,  img: "/products/p-jw-10.jpg", badges: ["Statement"],                  actives: [], category_id: "jewellery" },

  // ── HANDBAGS ──────────────────────────────────────────────────────────────
  { id: "p-hb-01", name: "Gold Thread Clutch",          brand: "Nisa Atelier", price: 3199, mrp: 3999, rating: 4.8, reviews: 420, img: "/products/p-hb-01.jpg", badges: ["Bridal Favorite"],            actives: [], category_id: "handbags" },
  { id: "p-hb-02", name: "Silk Potli Bag",              brand: "Nisa Atelier", price: 1499, mrp: 1899, rating: 4.7, reviews: 730, img: "/products/p-hb-02.jpg", badges: ["Handcrafted"],               actives: [], category_id: "handbags" },
  { id: "p-hb-03", name: "Beaded Minaudière",           brand: "Nisa Atelier", price: 2299, mrp: 2999, rating: 4.6, reviews: 310, img: "/products/p-hb-03.jpg", badges: ["Occasion Wear"],              actives: [], category_id: "handbags" },
  { id: "p-hb-04", name: "Zardosi Evening Bag",         brand: "Nisa Atelier", price: 2799, mrp: 3499, rating: 4.8, reviews: 270, img: "/products/p-hb-04.jpg", badges: ["Handcrafted","Bridal"],      actives: [], category_id: "handbags" },
  { id: "p-hb-05", name: "Caramel Leather Sling",       brand: "NisaLeather", price: 1899, mrp: 2499, rating: 4.5, reviews: 560, img: "/products/p-hb-05.jpg", badges: ["Everyday"],                  actives: [], category_id: "handbags" },
  { id: "p-hb-06", name: "Velvet Box Clutch",           brand: "Nisa Atelier", price: 1699, mrp: 2199, rating: 4.7, reviews: 390, img: "/products/p-hb-06.jpg", badges: ["Occasion Wear"],              actives: [], category_id: "handbags" },
  { id: "p-hb-07", name: "Embroidered Shoulder Bag",   brand: "Nisa Atelier", price: 2199, mrp: 2799, rating: 4.6, reviews: 480, img: "/products/p-hb-07.jpg", badges: ["Handcrafted"],               actives: [], category_id: "handbags" },
  { id: "p-hb-08", name: "Pearl Handle Bucket Bag",    brand: "NisaLeather", price: 2599, mrp: 3299, rating: 4.7, reviews: 340, img: "/products/p-hb-08.jpg", badges: ["Statement"],                  actives: [], category_id: "handbags" },
  { id: "p-hb-09", name: "Mirror Work Tote",            brand: "Nisa Atelier", price: 1999, mrp: 2599, rating: 4.6, reviews: 410, img: "/products/p-hb-09.jpg", badges: ["Handcrafted"],               actives: [], category_id: "handbags" },
  { id: "p-hb-10", name: "Nisa Monogram Canvas Bag",  brand: "NisaLeather",  price: 3499, mrp: 4499, rating: 4.8, reviews: 290, img: "/products/p-hb-10.jpg", badges: ["Signature"],                  actives: [], category_id: "handbags" },

  // ── BEAUTY TOOLS ──────────────────────────────────────────────────────────
  { id: "p-bt-01", name: "Rose Quartz Face Roller",     brand: "KoraCare",    price:  799, mrp:  999, rating: 4.7, reviews: 2140, img: "/products/p-bt-01.jpg", badges: ["Anti-Puffiness"],            actives: [], category_id: "tools" },
  { id: "p-bt-02", name: "Jade Gua Sha Stone",          brand: "KoraCare",    price:  599, mrp:  799, rating: 4.8, reviews: 1870, img: "/products/p-bt-02.jpg", badges: ["K-Glow","Lymphatic Drain"],  actives: [], category_id: "tools" },
  { id: "p-bt-03", name: "Ice Globe Face Massager",     brand: "GlowSutra",   price:  899, mrp: 1199, rating: 4.6, reviews:  980, img: "/products/p-bt-03.jpg", badges: ["Anti-Redness"],              actives: [], category_id: "tools" },
  { id: "p-bt-04", name: "Electric Cleansing Brush",    brand: "KoraCare",    price: 1499, mrp: 1999, rating: 4.5, reviews: 1340, img: "/products/p-bt-04.jpg", badges: ["Deep Clean"],                actives: [], category_id: "tools" },
  { id: "p-bt-05", name: "Lash Curler — Rose Gold",    brand: "NisaBeauty",  price:  349, mrp:  449, rating: 4.4, reviews:  720, img: "/products/p-bt-05.jpg", badges: ["Gentle Curl"],               actives: [], category_id: "tools" },
  { id: "p-bt-06", name: "LED Face Mask 7-Colour",     brand: "GlowSutra",   price: 3999, mrp: 5499, rating: 4.7, reviews:  540, img: "/products/p-bt-06.jpg", badges: ["Clinically Tested"],         actives: [], category_id: "tools" },
  { id: "p-bt-07", name: "Pore Vacuum Mini",            brand: "KoraCare",    price: 1299, mrp: 1699, rating: 4.5, reviews:  890, img: "/products/p-bt-07.jpg", badges: ["Blackhead Removal"],         actives: [], category_id: "tools" },
  { id: "p-bt-08", name: "Dermaplaning Tool",           brand: "NoorActives", price:  699, mrp:  899, rating: 4.3, reviews:  430, img: "/products/p-bt-08.jpg", badges: ["Peach Fuzz Remove"],         actives: [], category_id: "tools" },
  { id: "p-bt-09", name: "Ultrasonic Skin Scrubber",    brand: "GlowSutra",   price: 1799, mrp: 2399, rating: 4.6, reviews:  670, img: "/products/p-bt-09.jpg", badges: ["Deep Exfoliant"],            actives: [], category_id: "tools" },
  { id: "p-bt-10", name: "Micro-Dermaroller 0.3mm",    brand: "NoorActives", price:  499, mrp:  699, rating: 4.4, reviews:  810, img: "/products/p-bt-10.jpg", badges: ["Collagen Boost"],            actives: [], category_id: "tools" },

  // ── MEN'S GROOMING ────────────────────────────────────────────────────────
  { id: "p-mg-01", name: "Charcoal Face Wash",          brand: "ZiyaMen",     price:  349, mrp:  449, rating: 4.6, reviews: 2340, img: "/products/p-mg-01.jpg", badges: ["Deep Clean"],                actives: ["Charcoal","Salicylic Acid"],        category_id: "mens" },
  { id: "p-mg-02", name: "Beard Oil — Oud & Cedar",    brand: "ZiyaMen",     price:  599, mrp:  799, rating: 4.8, reviews: 1870, img: "/products/p-mg-02.jpg", badges: ["Bestseller"],                actives: ["Oud","Cedarwood","Jojoba"],         category_id: "mens" },
  { id: "p-mg-03", name: "Sport SPF 50 Moisturizer",   brand: "NoorActives", price:  799, mrp: 1099, rating: 4.5, reviews:  980, img: "/products/p-mg-03.jpg", badges: ["SPF 50","Matte"],             actives: ["Niacinamide","SPF","Hyaluronic"],  category_id: "mens" },
  { id: "p-mg-04", name: "Activated Charcoal Mask",    brand: "ZiyaMen",     price:  399, mrp:  499, rating: 4.5, reviews: 1230, img: "/products/p-mg-04.jpg", badges: ["Pore Care"],                 actives: ["Charcoal","Kaolin","Tea Tree"],     category_id: "mens" },
  { id: "p-mg-05", name: "Under-Eye Dark Circle Serum", brand: "NoorActives", price: 749, mrp:  999, rating: 4.6, reviews:  710, img: "/products/p-mg-05.jpg", badges: ["Derm-Backed"],              actives: ["Vitamin K","Caffeine","Peptides"],  category_id: "mens" },
  { id: "p-mg-06", name: "Hair Pomade — Matte Finish", brand: "ZiyaMen",     price:  349, mrp:  449, rating: 4.4, reviews:  890, img: "/products/p-mg-06.jpg", badges: ["Strong Hold"],               actives: ["Beeswax","Lanolin"],                category_id: "mens" },
  { id: "p-mg-07", name: "Aloe Shaving Gel",           brand: "AquaZiya",    price:  249, mrp:  329, rating: 4.5, reviews: 1560, img: "/products/p-mg-07.jpg", badges: ["Sensitive Skin"],            actives: ["Aloe","Glycerin","Chamomile"],      category_id: "mens" },
  { id: "p-mg-08", name: "Post-Shave Balm",            brand: "ZiyaMen",     price:  299, mrp:  399, rating: 4.6, reviews: 1100, img: "/products/p-mg-08.jpg", badges: ["Anti-Irritation"],            actives: ["Allantoin","Witch Hazel","Aloe"],   category_id: "mens" },
  { id: "p-mg-09", name: "Neem Tea Tree Soap",         brand: "NisaRoots",   price:  149, mrp:  199, rating: 4.5, reviews: 3400, img: "/products/p-mg-09.jpg", badges: ["Antibacterial"],             actives: ["Neem","Tea Tree","Salicylic Acid"], category_id: "mens" },
  { id: "p-mg-10", name: "Men's Anti-Aging Serum",     brand: "NoorActives", price:  999, mrp: 1299, rating: 4.7, reviews:  630, img: "/products/p-mg-10.jpg", badges: ["Derm-Backed"],               actives: ["Retinol","Peptides","Niacinamide"], category_id: "mens" },

  // ── BRIDAL ────────────────────────────────────────────────────────────────
  { id: "p-br-01", name: "Bridal Noor Makeup Kit",     brand: "NisaBeauty",  price: 4999, mrp: 6499, rating: 4.9, reviews:  430, img: "/products/p-br-01.jpg", badges: ["Bridal Essential"],          actives: [], category_id: "bridal" },
  { id: "p-br-02", name: "Mehendi Prep Brightening Serum", brand: "GlowSutra", price: 849, mrp: 1099, rating: 4.7, reviews: 560, img: "/products/p-br-02.jpg", badges: ["Bridal"],               actives: ["Vitamin C","AHA","Niacinamide"],    category_id: "bridal" },
  { id: "p-br-03", name: "Bridal Glow Sheet Mask",     brand: "SeoulSaffron", price: 299, mrp:  399, rating: 4.8, reviews: 1840, img: "/products/p-br-03.jpg", badges: ["K-Glow","Wedding Day"],    actives: ["Saffron","HA","Collagen"],          category_id: "bridal" },
  { id: "p-br-04", name: "Saffron Bridal Cream",       brand: "Nisa Botanics", price: 1299, mrp: 1699, rating: 4.8, reviews: 790, img: "/products/p-br-04.jpg", badges: ["Bridal","Glow"],         actives: ["Saffron","Pearl","Kumkumadi"],      category_id: "bridal" },
  { id: "p-br-05", name: "Bridal Red Lip Set",         brand: "NisaBeauty",  price:  899, mrp: 1199, rating: 4.8, reviews:  870, img: "/products/p-br-05.jpg", badges: ["Bridal","Long-Lasting"],    actives: ["Shea","Vitamin E"],                 category_id: "bridal" },
  { id: "p-br-06", name: "Kohl & Liner Bridal Set",    brand: "NisaBeauty",  price:  599, mrp:  799, rating: 4.7, reviews:  640, img: "/products/p-br-06.jpg",  badges: ["Bridal","Waterproof"],     actives: ["Kohl","Vitamin E"],                 category_id: "bridal" },
  { id: "p-br-07", name: "Bridal Luminizer Drops",     brand: "GlowSutra",   price:  699, mrp:  899, rating: 4.6, reviews:  510, img: "/products/p-br-07.jpg", badges: ["Highlighter"],              actives: ["Pearl","Rose Gold Mica"],           category_id: "bridal" },
  { id: "p-br-08", name: "Jasmine Bridal Body Mist",   brand: "Deccan Dew",  price:  549, mrp:  699, rating: 4.7, reviews: 1230, img: "/products/p-br-08.jpg", badges: ["Bridal","Long-Lasting"],  actives: ["Jasmine","Sandalwood","Rose"],      category_id: "bridal" },
  { id: "p-br-09", name: "Ubtan Bridal Pack",          brand: "NisaRoots",   price:  499, mrp:  649, rating: 4.9, reviews: 3210, img: "/products/p-br-09.jpg", badges: ["Ayurvedic","Glow"],        actives: ["Turmeric","Sandalwood","Rose"],     category_id: "bridal" },
  { id: "p-br-10", name: "Wedding Day Touch-Up Kit",   brand: "NisaBeauty",  price: 1499, mrp: 1999, rating: 4.8, reviews:  720, img: "/products/p-br-10.jpg", badges: ["Bridal Essential"],         actives: [], category_id: "bridal" },
];

export const SERVICES = [
  { id: "s1", name: "Korean Glow Facial",         duration: "75 min",  price: 1499, rating: 4.9, img: "https://images.pexels.com/photos/30809943/pexels-photo-30809943.jpeg?auto=compress&w=800", level: "Senior",       tag: "K-Glow" },
  { id: "s2", name: "Saffron Brightening Cleanup", duration: "45 min", price:  799, rating: 4.7, img: "https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=800&q=80",                 level: "Trained",      tag: "Best Seller" },
  { id: "s3", name: "Bridal Noor Makeup",          duration: "180 min", price: 11999, rating: 4.9, img: "https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?w=800&q=80",              level: "Bridal Expert", tag: "Bridal" },
  { id: "s4", name: "Pearl Pedicure",              duration: "60 min",  price:  899, rating: 4.6, img: "https://images.unsplash.com/photo-1519823551278-64ac92734fb1?w=800&q=80",                level: "Trained",      tag: "Relax" },
  { id: "s5", name: "Hair Spa Ritual",             duration: "60 min",  price: 1199, rating: 4.7, img: "https://images.unsplash.com/photo-1560066984-138dadb4c035?w=800&q=80",                  level: "Senior",       tag: "Repair" },
  { id: "s6", name: "Rose Manicure",               duration: "45 min",  price:  699, rating: 4.5, img: "https://images.unsplash.com/photo-1604654894610-df63bc536371?w=800&q=80",               level: "Trained",      tag: "Soothing" },
  { id: "s7", name: "Classic Waxing Package",      duration: "50 min",  price:  999, rating: 4.6, img: "https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=800&q=80",                  level: "Trained",      tag: "Quick" },
  { id: "s8", name: "Party Glow Makeup",           duration: "60 min",  price: 1999, rating: 4.8, img: "https://images.unsplash.com/photo-1522335789203-aaa2f6b6d3a4?w=800&q=80",               level: "Senior",       tag: "Occasion" },
];

export const TRUST = [
  { label: "Verified Brands",      icon: "ShieldCheck" },
  { label: "Trained Beauticians",  icon: "Sparkles" },
  { label: "Clean Ingredients",    icon: "Leaf" },
  { label: "Secure Payments",      icon: "Lock" },
  { label: "Doorstep Service",     icon: "Home" },
];

export const ITTAR_NOTES = [
  { name: "Oud Bloom",       note: "Smoky · Rose · Resinous" },
  { name: "Saffron Veil",    note: "Saffron · Amber · Musk" },
  { name: "Sandal Mist",     note: "Sandalwood · Vanilla" },
  { name: "Hyderabadi Rose", note: "Damask Rose · Honey" },
];

export const JEWELLERY = [
  { id: "j1", name: "Ziya Pearl Drop Earrings",  price: 2499, img: "https://images.pexels.com/photos/36772547/pexels-photo-36772547.jpeg?auto=compress&w=800" },
  { id: "j2", name: "Champagne Halo Necklace",   price: 4299, img: "https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=800&q=80" },
  { id: "j3", name: "Gold Thread Clutch",         price: 3199, img: "https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=800&q=80" },
  { id: "j4", name: "Bridal Kundan Set",          price: 8999, img: "https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=800&q=80" },
];
