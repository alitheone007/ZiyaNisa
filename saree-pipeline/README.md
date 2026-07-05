# Saree / Suit Image → Amazon Flat File Pipeline

Turns assorted WhatsApp and supplier images into QA-passed, deduplicated, SKU-mapped
entries in your Amazon.in SAREE flat file — spending vision-API money only where a
human eye is actually needed.

## The core design decision (your "better implementation" question)

Do not let the xlsm become the growing master. The flat file format is an *upload
format*, not a database — it gets slow, fragile, and hard to dedupe as it grows.
Instead, `registry.db` (SQLite) is the permanent master: every image ever seen, its
perceptual hash, QA verdict, item type, SKU, slot, and **batch date**. Each Amazon
upload is a small, freshly generated xlsm containing only that batch's rows. The
registry stays fast at 100 or 100,000 images, and batch dates are first-class data
(`python pipeline.py status` shows per-batch progress), which answers your "model
should keep batch date in context" requirement structurally instead of hoping an AI
remembers it.

## The cost funnel (why API usage stays cheap)

Stage 1 and 2 are completely free and eliminate most of the work before any AI call:

1. **Local QA (free, PIL):** rejects too-small (<500px), screenshot-shaped crops,
   unreadable files; flags <1000px (no Amazon zoom), blur, non-white background
   (fine for OTHER slots, blocks MAIN). Failed images = "regenerate / re-request
   from supplier" list.
2. **Dedupe (free, perceptual hash):** catches the same photo even after WhatsApp
   recompression or resizing, tells you which SKU it already belongs to, and — a
   real-world bonus — if the *better original* arrives after a WhatsApp copy, it
   auto-upgrades the library copy. This replaces manually opening and comparing
   Drive folders: the library is hashed once, then every check is instant.
3. **AI recognition (only paid stage, Claude Haiku):** runs only on survivors,
   each image downscaled to 512px (~5–10x fewer tokens), 8 images per API call,
   results cached forever in the registry so no image is ever classified twice.
   Ballpark: hundreds of images for a few cents. When the model is unsure it says
   `confidence: low` and the image is routed to you instead of guessed.
4. **Assign (your chat box):** interactive prompt per pending image — confirm or
   correct the item type (saree / dress material / other), override QA
   (pass / send back for regeneration), assign SKU + slot (MAIN/OTHER1-8/SWATCH).
   It warns you if that SKU already has images in those slots and blocks
   duplicate-image-on-two-SKUs at the hash level.
5. **Export:** writes only `pass` + assigned saree rows into a copy of your
   SAREE.xlsm (macros preserved, Amazon's prefilled SAREE rows reused).
   Dress-material items are held in the registry with a reminder to export them
   via their own product-type template — Amazon will reject them in a SAREE file.

## Google Drive without API complexity

Install "Google Drive for Desktop" and point intake at the synced folders:
`python pipeline.py intake "G:/My Drive/Supplier Images/Sarees"`. The pipeline
walks subfolders, and the normalized upload-ready copies in `library/` can itself
live inside a synced Drive folder so everything stays backed up. This costs
nothing and avoids OAuth, quotas, and Drive API code entirely. (If you later want
true server-side automation, rclone or the Drive API can replace this — but start
simple.)

## Setup

    pip install pillow imagehash openpyxl anthropic
    set ANTHROPIC_API_KEY=sk-ant-...        (Windows; export ... on Mac/Linux)

## Daily workflow

    python pipeline.py intake incoming/        # or your Drive folder — free
    python pipeline.py classify                # AI, only on new survivors — cents
    python pipeline.py assign                  # your chat-style review
    python pipeline.py export SAREE.xlsm SAREE_batch_YYYY-MM-DD.xlsm https://yourhost/images
    python pipeline.py status                  # per-batch dashboard

Then upload the images in `library/` to your image host (or Amazon's image upload
tool, keeping the same filenames) and upload the batch xlsm in Seller Central.

## Before uploading to Amazon

Delete Amazon's example row (the ABC123 / SHIRT row) from the Template tab, and
fill the remaining required (red) columns per SKU — price, quantity, browse node,
fabric, colour etc. The AI's classify step already stores colour/fabric guesses in
the registry (`ai_meta` column) which you can use to prefill those, a natural next
extension of this pipeline.

## Tuning

`lib/qa_local.py`: `BLUR_THRESHOLD` (test on ~20 of your real images and adjust),
`MIN_LONG_SIDE_*`. `lib/dedupe.py`: `HAMMING_DUP` (raise to 8–10 to catch heavier
crops, at some false-positive risk). `lib/classify.py`: `MODEL`, `BATCH`, `THUMB`,
and the item-type list in the prompt (add lehenga choli, kurti set, etc.).
