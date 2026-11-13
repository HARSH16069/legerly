import os

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from deps import get_db
from files import stored_path
from models import Attachment

router = APIRouter(prefix="/attachments", tags=["Attachments"])


@router.get("/{attachment_id}")
def get_attachment(attachment_id: int, db: Session = Depends(get_db)):
    a = db.get(Attachment, attachment_id)
    if not a:
        raise HTTPException(404, "Attachment not found")
    path = stored_path(db, a.stored_name)   # this business's own folder
    if not os.path.exists(path):
        raise HTTPException(404, "File missing on server")
    return FileResponse(path, media_type=a.content_type, filename=a.original_name,
                        headers={"X-Content-Type-Options": "nosniff"})


@router.delete("/{attachment_id}")
def delete_attachment(attachment_id: int, db: Session = Depends(get_db)):
    a = db.get(Attachment, attachment_id)
    if not a:
        raise HTTPException(404, "Attachment not found")
    path = stored_path(db, a.stored_name)   # this business's own folder
    db.delete(a)
    db.commit()
    if os.path.exists(path):
        os.remove(path)
    return {"message": "Attachment deleted"}