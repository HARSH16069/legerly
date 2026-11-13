from models import JournalEntry


def entry_to_dict(e: JournalEntry, with_lines: bool = False) -> dict:
    data = {
        "id": e.id,
        "date": e.date,
        "entry_type": e.entry_type,
        "narration": e.narration,
        "party_id": e.party_id,
        "party_name": e.party.name if e.party else None,
        "invoice_no": e.invoice_no,
        "taxable_amount": e.taxable_amount,
        "gst_rate": e.gst_rate,
        "gst_amount": e.gst_amount,
        "total_amount": e.total_amount,
        "attachment_count": len(e.attachments),
    }
    if with_lines:
        data["lines"] = [
            {
                "account_id": l.account_id,
                "account_name": l.account.name,
                "debit": l.debit,
                "credit": l.credit,
            }
            for l in e.lines
        ]
        data["attachments"] = [
            {
                "id": a.id,
                "original_name": a.original_name,
                "content_type": a.content_type,
                "url": f"/attachments/{a.id}",
            }
            for a in e.attachments
        ]
    return data
