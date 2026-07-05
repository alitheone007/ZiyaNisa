#!/usr/bin/env python3
"""Saree/Suit image -> Amazon flat file pipeline.

Usage:
  python pipeline.py intake  <folder>        # QA + dedupe + register new images (FREE, no API)
  python pipeline.py classify                # AI item-type recognition on pending images (cheap)
  python pipeline.py assign                  # interactive chat: assign SKU / confirm type / QA override
  python pipeline.py export  <SAREE.xlsm> <out.xlsm> <url_base>   # write batch to flat file
  python pipeline.py status                  # dashboard by batch date

Folder convention (works with Google Drive for Desktop - point intake at the
synced folder, no Drive API needed):
  incoming/   <- dump WhatsApp / supplier images here
  library/    <- normalized JPEG copies, named <phash>.jpg (upload-ready)
  registry.db <- master source of truth (grows; xlsm stays per-batch)
"""
import json, os, shutil, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lib import db as dbm
from lib.qa_local import qa_check, normalize
from lib.dedupe import hashes, find_duplicate

ROOT = os.path.dirname(os.path.abspath(__file__))
LIB = os.path.join(ROOT, "library")
DB = os.path.join(ROOT, "registry.db")
EXTS = (".jpg", ".jpeg", ".png", ".webp")


def intake(folder):
    con = dbm.connect(DB)
    batch = dbm.today()
    new = dup = failed = 0
    for root, _, files in os.walk(folder):
        for f in sorted(files):
            if not f.lower().endswith(EXTS):
                continue
            path = os.path.join(root, f)
            try:
                ph, sha = hashes(path)
            except Exception as e:
                print(f"  [skip] {f}: unreadable ({e})"); failed += 1; continue

            hit, dist = find_duplicate(con, ph, sha)
            if hit:
                dup += 1
                owner = hit["sku"] or "unassigned"
                # quality upgrade: same photo but higher-res, and not yet exported
                from PIL import Image as _I
                new_px = _I.open(path).size
                old_px = _I.open(hit["lib_path"]).size if hit["lib_path"] and os.path.exists(hit["lib_path"]) else (0, 0)
                if not hit["uploaded"] and new_px[0] * new_px[1] > old_px[0] * old_px[1] * 1.2:
                    qa = qa_check(path)
                    if qa["status"] != "fail":
                        normalize(path, hit["lib_path"] or os.path.join(LIB, f"{hit['phash']}.jpg"))
                        con.execute("UPDATE images SET src_path=?, qa_status=?, qa_reasons=? WHERE phash=?",
                                    (path, qa["status"], "; ".join(qa["reasons"]), hit["phash"]))
                        print(f"  [DUP+] {f}  same photo, higher quality {new_px} > {old_px}"
                              f" - UPGRADED library copy (SKU: {owner})")
                        continue
                print(f"  [DUP]  {f}  ~= {os.path.basename(hit['lib_path'] or hit['src_path'])}"
                      f" (dist {dist}, already on SKU: {owner}) - skipped")
                continue

            qa = qa_check(path)
            lib_path = ""
            if qa["status"] != "fail":
                lib_path = os.path.join(LIB, f"{ph}.jpg")
                normalize(path, lib_path)
            con.execute(
                "INSERT INTO images(phash,sha1,src_path,lib_path,batch_date,qa_status,qa_reasons)"
                " VALUES(?,?,?,?,?,?,?)",
                (ph, sha, path, lib_path, batch, qa["status"], "; ".join(qa["reasons"])))
            new += 1
            tag = {"pass": "OK  ", "fail": "FAIL", "manual_review": "REVW"}[qa["status"]]
            main = " [MAIN-eligible]" if qa.get("main_ok") else ""
            print(f"  [{tag}] {f} {qa.get('size','')}{main} {'; '.join(qa['reasons'])}")
    con.commit()
    print(f"\nBatch {batch}: {new} new, {dup} duplicates skipped, {failed} unreadable.")
    print("FAILed images: re-request from supplier or regenerate. Next: python pipeline.py classify")


def classify():
    con = dbm.connect(DB)
    rows = con.execute("SELECT * FROM images WHERE ai_checked=0 AND qa_status!='fail'"
                       " AND lib_path!=''").fetchall()
    if not rows:
        print("Nothing pending AI classification."); return
    if not os.environ.get("ANTHROPIC_API_KEY"):
        print(f"{len(rows)} images pending. Set ANTHROPIC_API_KEY and rerun."); return
    from lib.classify import classify_batch
    paths = [r["lib_path"] for r in rows]
    results = classify_batch(paths)
    for r, res in zip(rows, results):
        it = res.get("item_type", "?")
        if res.get("confidence") == "low":
            it = "?"                       # -> goes to the interactive chat in `assign`
        if res.get("listing_quality") == "poor" and r["qa_status"] == "pass":
            con.execute("UPDATE images SET qa_status='manual_review',"
                        " qa_reasons=qa_reasons||'; AI: '||? WHERE phash=?",
                        (res.get("issues", "poor listing quality"), r["phash"]))
        con.execute("UPDATE images SET item_type=?, ai_meta=?, ai_checked=1 WHERE phash=?",
                    (it, json.dumps(res), r["phash"]))
        print(f"  {os.path.basename(r['lib_path'])}: {it} "
              f"({res.get('color','')}, {res.get('fabric_guess','')}, conf={res.get('confidence')})")
    con.commit()
    print("Done. Next: python pipeline.py assign")


def assign():
    """Chat-style loop: confirm item type when AI was unsure, assign SKU/item name,
    warn if that SKU already has images, allow QA override (pass/regenerate)."""
    con = dbm.connect(DB)
    rows = con.execute("SELECT * FROM images WHERE uploaded=0 AND qa_status!='fail'"
                       " AND (sku='' OR item_type IN ('','?'))"
                       " ORDER BY batch_date").fetchall()
    if not rows:
        print("Nothing to assign."); return
    print(f"{len(rows)} image(s) need input. Enter=skip, q=quit.\n")
    for r in rows:
        name = os.path.basename(r["lib_path"] or r["src_path"])
        print(f"--- {name}  [batch {r['batch_date']}]  qa={r['qa_status']}")
        if r["qa_reasons"]:
            print(f"    notes: {r['qa_reasons']}")
        it = r["item_type"]
        if it in ("", "?"):
            ans = input("    Item type? [1] saree [2] dress material [3] other/type it: ").strip()
            if ans == "q": return
            it = {"1": "saree", "2": "dress_material", "3": "other"}.get(ans, ans) or "?"
        else:
            print(f"    AI says: {it} - press Enter to accept or type correction")
            ans = input("    type: ").strip()
            if ans == "q": return
            if ans: it = {"1": "saree", "2": "dress_material", "3": "other"}.get(ans, ans)
        if r["qa_status"] == "manual_review":
            ans = input("    QA override - [p]ass / [r]egenerate(fail) / Enter=leave: ").strip().lower()
            if ans == "p": con.execute("UPDATE images SET qa_status='pass' WHERE phash=?", (r["phash"],))
            if ans == "r": con.execute("UPDATE images SET qa_status='fail' WHERE phash=?", (r["phash"],))
        sku = input("    Assign to SKU (blank=later): ").strip()
        slot = ""
        if sku:
            taken = con.execute("SELECT slot FROM images WHERE sku=? AND phash!=?",
                                (sku, r["phash"])).fetchall()
            used = {t["slot"] for t in taken if t["slot"]}
            if used:
                print(f"    NOTE: SKU {sku} already has slots: {sorted(used)}")
            free = [s for s in ["MAIN"] + [f"OTHER{i}" for i in range(1, 9)] + ["SWATCH"]
                    if s not in used]
            slot = input(f"    Slot {free[:5]}... (Enter={free[0]}): ").strip().upper() or free[0]
            if not con.execute("SELECT 1 FROM skus WHERE sku=?", (sku,)).fetchone():
                nm = input("    New SKU - Item Name for listing: ").strip()
                con.execute("INSERT INTO skus VALUES(?,?,?,?)", (sku, nm, it, dbm.today()))
        con.execute("UPDATE images SET item_type=?, sku=?, slot=? WHERE phash=?",
                    (it, sku, slot, r["phash"]))
        con.commit()
    print("Assignment saved. Next: python pipeline.py export SAREE.xlsm out.xlsm <url_base>")


def export(template, out, url_base):
    from lib.flatfile import export_batch
    con = dbm.connect(DB)
    rows = con.execute("SELECT * FROM images WHERE uploaded=0 AND qa_status='pass'"
                       " AND sku!='' AND slot!=''").fetchall()
    if not rows:
        print("No pass+assigned images ready."); return
    by_sku = {}
    for r in rows:
        by_sku.setdefault(r["sku"], {})[r["slot"]] = r["lib_path"]
    items = []
    for sku, imgs in by_sku.items():
        meta = con.execute("SELECT * FROM skus WHERE sku=?", (sku,)).fetchone()
        items.append({"sku": sku, "item_name": meta["item_name"] if meta else "",
                      "item_type": meta["item_type"] if meta else "saree", "images": imgs})
    path, n, skipped_skus = export_batch(template, out, items, url_base)
    done = [r["phash"] for r in rows if r["sku"] not in skipped_skus]
    con.executemany("UPDATE images SET uploaded=1 WHERE phash=?", [(p,) for p in done])
    con.commit()
    print(f"Wrote {n} SKU row(s) ({len(done)} images) -> {path}")
    print("Upload images to your host / Amazon image-upload tool with the same filenames.")


def status():
    con = dbm.connect(DB)
    print("Batch      total  pass  review  fail  assigned  uploaded")
    for r in con.execute(
        "SELECT batch_date, COUNT(*) t,"
        " SUM(qa_status='pass') p, SUM(qa_status='manual_review') m, SUM(qa_status='fail') f,"
        " SUM(sku!='') a, SUM(uploaded) u FROM images GROUP BY batch_date ORDER BY batch_date"):
        print(f"{r['batch_date']}  {r['t']:5}  {r['p']:4}  {r['m']:6}  {r['f']:4}  {r['a']:8}  {r['u']:8}")


if __name__ == "__main__":
    cmd = sys.argv[1] if len(sys.argv) > 1 else "status"
    if cmd == "intake" and len(sys.argv) > 2: intake(sys.argv[2])
    elif cmd == "classify": classify()
    elif cmd == "assign": assign()
    elif cmd == "export" and len(sys.argv) > 4: export(sys.argv[2], sys.argv[3], sys.argv[4])
    elif cmd == "status": status()
    else: print(__doc__)
