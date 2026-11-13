import os
import uuid

from fastapi import HTTPException, UploadFile
from sqlalchemy.orm import Session

from models import Attachment

UPLOAD_DIR = os.path.abspath(os.getenv("UPLOAD_DIR", "uploads"))     # same folder no matter where the app is started
MAX_BYTES = int(os.getenv("MAX_UPLOAD_MB", "10")) * 1024 * 1024
os.makedirs(UPLOAD_DIR, exist_ok=True)

# The stored extension comes from the checked type, never from the uploaded file name.
EXT = {"image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp", "application/pdf": ".pdf"}
ALLOWED_TYPES = set(EXT)


def _matches(content_type: str, head: bytes) -> bool:
    """The first bytes of the file must really look like the type the browser claims."""
    if content_type == "image/jpeg":
        return head.startswith(b"\xff\xd8\xff")
    if content_type == "image/png":
        return head.startswith(b"\x89PNG\r\n\x1a\n")
    if content_type == "image/webp":
        return head[:4] == b"RIFF" and head[8:12] == b"WEBP"
    if content_type == "application/pdf":
        return b"%PDF" in head
    return False


def validate_files(files: list[UploadFile]):
    for f in files:
        if not f.filename:
            continue
        if f.content_type not in ALLOWED_TYPES:
            raise HTTPException(400, f"{f.filename}: only JPG, PNG, WEBP or PDF files are allowed")
        head = f.file.read(1024)
        f.file.seek(0)
        if not _matches(f.content_type, head):
            raise HTTPException(400, f"{f.filename}: the file content does not match its type")


def tenant_dir(db: Session) -> str:
    """Each business keeps its bills in its own folder, named after its database (biz_<id>)."""
    path = os.path.join(UPLOAD_DIR, db.get_bind().url.database)
    os.makedirs(path, exist_ok=True)
    return path


def stored_path(db: Session, stored_name: str) -> str:
    return os.path.join(tenant_dir(db), os.path.basename(stored_name))


def save_attachments(db: Session, entry_id: int, files: list[UploadFile]):
    validate_files(files)   # check everything BEFORE writing to disk
    folder, written = tenant_dir(db), []
    try:
        for f in files:
            if not f.filename:
                continue
            stored_name = f"{uuid.uuid4().hex}{EXT[f.content_type]}"
            path = os.path.join(folder, stored_name)
            written.append(path)
            size = 0
            with open(path, "wb") as out:
                while chunk := f.file.read(1024 * 1024):
                    size += len(chunk)
                    if size > MAX_BYTES:
                        raise HTTPException(413, f"{f.filename}: files can be at most {MAX_BYTES // (1024 * 1024)} MB")
                    out.write(chunk)
            db.add(Attachment(
                journal_entry_id=entry_id,
                original_name=os.path.basename(f.filename)[:200],
                stored_name=stored_name,
                content_type=f.content_type,
            ))
    except Exception:
        for p in written:           # do not leave half-saved files behind
            try:
                os.remove(p)
            except OSError:
                pass
        raise