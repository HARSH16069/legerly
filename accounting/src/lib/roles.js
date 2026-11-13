// Which role can open which page. The backend enforces the same rules (backend/guard.py);
// this file only decides what to show, so people don't see pages they can't use.
export const ROLE_LABEL = { owner: "Owner", admin: "Admin", accountant: "Accountant", sales: "Sales person" };

const BOOKS = ["owner", "admin", "accountant"], ALL = [...BOOKS, "sales"], ADMINS = ["owner", "admin"];
const ACCESS = {
  "/dashboard": BOOKS, "/accounts": BOOKS, "/ledger": BOOKS, "/purchases": BOOKS, "/journal": BOOKS,
  "/reminders": BOOKS, "/audit": ALL, "/team": ADMINS, "/contacts": ALL, "/sales": ALL,
};

export const can = (role, path) => (ACCESS[path] || BOOKS).includes(role);
export const homeFor = (role) => (role === "sales" ? "/sales" : "/dashboard");
