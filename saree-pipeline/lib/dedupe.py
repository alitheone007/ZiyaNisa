"""Stage 2 - DEDUPE (zero API cost). Perceptual hash catches the same photo
even after WhatsApp recompression, resizing, or minor crops. This replaces
'individually open and compare' across your Drive folders: hash every library
image ONCE, then every new image is a millisecond lookup - and it tells you
which SKU the duplicate already belongs to."""
import hashlib
import imagehash
from PIL import Image

HAMMING_DUP = 6          # <=6 bits different on a 64-bit phash => same photo

def hashes(path):
    img = Image.open(path).convert("RGB")
    ph = str(imagehash.phash(img))
    sha = hashlib.sha1(open(path, "rb").read()).hexdigest()
    return ph, sha

def find_duplicate(con, ph, sha):
    """Exact byte match OR near-duplicate phash. Returns matching row or None."""
    row = con.execute("SELECT * FROM images WHERE sha1=?", (sha,)).fetchone()
    if row:
        return row, 0
    target = imagehash.hex_to_hash(ph)
    for r in con.execute("SELECT * FROM images"):
        d = target - imagehash.hex_to_hash(r["phash"])
        if d <= HAMMING_DUP:
            return r, d
    return None, None
