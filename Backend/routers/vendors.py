from routers.models_contacts import Vendor
from routers.contacts_base import build_router

# Vendor = purchase side -> supplier account (liability)
router = build_router("/vendors", "Vendors", Vendor, "vendor_id", "liability", "supplier")
