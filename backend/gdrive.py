"""
Google Drive image upload for ZiyaNisa.

ENV vars required:
  GDRIVE_SA_JSON   — entire service-account JSON key as a single-line string
  GDRIVE_FOLDER_ID — ID of the Drive folder to upload into
"""

import asyncio
import io
import json
import logging
import os

log = logging.getLogger("gdrive")

GDRIVE_SA_FILE   = os.environ.get("GDRIVE_SA_FILE", "")   # path to JSON key file (preferred)
GDRIVE_SA_JSON   = os.environ.get("GDRIVE_SA_JSON", "")   # fallback: raw JSON string in env
GDRIVE_FOLDER_ID = os.environ.get("GDRIVE_FOLDER_ID", "")


def _load_creds():
    from google.oauth2.service_account import Credentials
    if GDRIVE_SA_FILE and os.path.exists(GDRIVE_SA_FILE):
        with open(GDRIVE_SA_FILE) as f:
            info = json.load(f)
    elif GDRIVE_SA_JSON:
        info = json.loads(GDRIVE_SA_JSON)
    else:
        raise RuntimeError(
            "Google Drive not configured — set GDRIVE_SA_FILE (path to key JSON) "
            "or GDRIVE_SA_JSON (raw JSON string) in server .env"
        )
    return Credentials.from_service_account_info(
        info, scopes=["https://www.googleapis.com/auth/drive.file"]
    )


def _upload_sync(filename: str, data: bytes, mime_type: str) -> str:
    from googleapiclient.discovery import build
    from googleapiclient.http import MediaIoBaseUpload

    creds = _load_creds()
    service = build("drive", "v3", credentials=creds, cache_discovery=False)

    meta: dict = {"name": filename}
    if GDRIVE_FOLDER_ID:
        meta["parents"] = [GDRIVE_FOLDER_ID]

    media = MediaIoBaseUpload(io.BytesIO(data), mimetype=mime_type, resumable=False)
    file = service.files().create(body=meta, media_body=media, fields="id").execute()
    file_id = file["id"]

    # Make the file publicly readable so <img> tags work from any browser
    service.permissions().create(
        fileId=file_id,
        body={"type": "anyone", "role": "reader"},
    ).execute()

    log.info("Uploaded %s → Drive file_id=%s", filename, file_id)
    return f"https://drive.google.com/uc?id={file_id}&export=view"


async def upload_image(filename: str, data: bytes, mime_type: str = "image/jpeg") -> str:
    """Async wrapper — upload image bytes to Drive, return public URL."""
    return await asyncio.to_thread(_upload_sync, filename, data, mime_type)
