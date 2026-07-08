/**
 * Downscale + re-encode an image file to a JPEG Blob before upload.
 * Mobile camera shots are 2–8MB; at 1280px/q0.8 they become ~150–350KB,
 * which uploads in seconds on 4G instead of timing out.
 * Falls back to the original file if decoding fails — never blocks the flow.
 */
export function compressImage(file, maxWidth = 1280, quality = 0.8) {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      try {
        const scale = Math.min(1, maxWidth / img.width);
        const canvas = document.createElement("canvas");
        canvas.width  = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
        canvas.toBlob(b => resolve(b || file), "image/jpeg", quality);
      } catch {
        resolve(file);
      }
    };
    img.onerror = () => { URL.revokeObjectURL(url); resolve(file); };
    img.src = url;
  });
}
