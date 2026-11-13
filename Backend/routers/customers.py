from routers.models_contacts import Customer
from routers.contacts_base import build_router

# Customer = sale side -> customer account (asset / receivable)
router = build_router("/customers", "Customers", Customer, "customer_id", "asset", "customer")
