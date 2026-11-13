# Run

```
pip install fastapi "uvicorn[standard]" sqlalchemy "psycopg[binary]" pydantic python-multipart
uvicorn main:app --reload
```

# Upgrading an existing PostgreSQL database

`create_all` only creates missing tables; it does NOT add columns to existing ones.
Either drop the tables and let them be recreated, or run this SQL once:

```sql
ALTER TABLE journal_entries
  ADD COLUMN entry_type VARCHAR NOT NULL DEFAULT 'general',
  ADD COLUMN party_id INTEGER REFERENCES accounts(id),
  ADD COLUMN invoice_no VARCHAR,
  ADD COLUMN taxable_amount NUMERIC(15,2),
  ADD COLUMN gst_rate NUMERIC(5,2),
  ADD COLUMN gst_amount NUMERIC(15,2),
  ADD COLUMN total_amount NUMERIC(15,2);

CREATE INDEX ix_journal_entries_entry_type ON journal_entries(entry_type);
CREATE INDEX ix_journal_entries_party_id ON journal_entries(party_id);
```

The new tables (`attachments`, `stock_movements`) are created automatically on startup.

# Project layout

```
accounting/
  main.py            # only creates the app and includes routers
  database.py        # engine, session, Base
  deps.py            # get_db
  models.py  schemas.py
  helpers.py         # balance, GST calc, system accounts, negative check
  files.py           # bill image/PDF upload helpers
  posting.py         # shared saving logic for sales + purchase
  serializers.py
  routers/
    accounts.py  journal.py  sales.py  purchase.py  attachments.py  items.py
```

# Endpoints

| Method | URL | Purpose |
|---|---|---|
| POST | /sales-entries | multipart form: entry_date, customer_id, taxable_amount, gst_rate, invoice_no, narration, files[] |
| POST | /purchase-entries | same, with supplier_id |
| GET | /sales-entries | sales register |
| GET | /purchase-entries | purchase register |
| GET | /journal-entries?entry_type=sales | all entries, filter by type |
| GET | /journal-entries/{id} | entry with lines and attachment links |
| POST | /journal-entries/{id}/attachments | add more bill images later |
| GET | /attachments/{id} | open the image / PDF |
| DELETE | /attachments/{id} | remove an attachment |
