export const NAV = [["Features", "#features"], ["Modules", "#modules"], ["Pricing", "#pricing"], ["FAQ", "#faq"]];

export const STATEMENT = [
  ["Client invoices — September", "+ 48,200.00"],
  ["Payroll run — Sept 25", "− 19,640.00"],
  ["Vendor payments (4)", "− 6,115.40"],
  ["Tax reserve, auto-set aside", "− 4,000.00"],
];

export const STATS = [
  { to: 6.2, decimals: 1, suffix: " hrs", label: "saved per business, per month" },
  { to: 99.4, decimals: 1, suffix: "%", label: "of reconciliations auto-matched" },
  { to: 3, decimals: 0, suffix: " days", label: "average close time, down from 14" },
];

export const FEATURES = [
  ["01", "Invoicing & online payments", "Branded, customizable invoices with recurring billing, multi-currency support, and automatic payment reminders before and after due dates."],
  ["02", "Quotes & sales orders", "Turn an estimate into a sales order, then an invoice, without re-entering a single line item."],
  ["03", "Accounts payable", "Track vendor bills, convert purchase orders to bills in a click, and schedule payments so nothing slips past its due date."],
  ["04", "Bank feeds & reconciliation", "Connect bank and credit card accounts, auto-import transactions, and match them against your books for a same-day close."],
  ["05", "Inventory management", "Track stock by SKU across warehouses, set reorder points, and generate purchase orders automatically when stock runs low."],
  ["06", "Projects & time tracking", "Log billable hours against a project, then invoice the client directly from the timesheet."],
  ["07", "Tax & compliance", "Generate tax-compliant invoices, calculate liability automatically, and file returns without leaving the app."],
  ["08", "Financial reports", "70+ built-in reports — P&L, balance sheet, cash flow, aging summaries — exportable to PDF, Excel, or CSV."],
  ["09", "Client & vendor portals", "Give clients a dedicated portal to view invoices, approve estimates, and pay online, without an email back-and-forth."],
  ["10", "Multi-entity accounting", "Run payroll, AP, AR, and tax reserves for every entity you manage from one running ledger."],
  ["11", "Roles & approval workflows", "Add your accountant with scoped permissions, and route expenses or bills through custom approval chains."],
  ["12", "Mobile access", "Scan receipts, send invoices, and check your running balance from the iOS or Android app."],
];

export const MODULES = [
  { tag: "Invoicing", title: "Invoices that get paid, not just sent", body: "Build a branded invoice in under a minute, attach it to a recurring schedule, and let automatic reminders do the following up. Clients pay by card, bank transfer, or wallet, straight from the invoice.", heading: "Invoice #INV-2044", lines: [["Consulting — Sept retainer", "12,000.00"], ["Design revisions (3 rounds)", "3,400.00"], ["Late fee waived", "0.00"]], total: "15,400.00", footer: "Due Oct 5 — reminder sent Sept 28" },
  { tag: "Banking", title: "A bank feed that reconciles itself", body: "Transactions land in Ledgerly the moment they clear. Rules match recurring vendors and customers automatically, so your team reviews exceptions, not every line.", heading: "Bank feed — Business checking", lines: [["Stripe payout, matched", "8,240.00"], ["AWS, auto-categorized", "− 612.40"], ["Unmatched — needs review", "− 85.00"]], total: "7,542.60", footer: "3 of 4 transactions matched automatically" },
  { tag: "Reports", title: "Statements your accountant doesn’t have to fix", body: "Every report is formatted the way a CPA already expects it — P&L, balance sheet, and cash flow, exportable in one click and ready for filing, not further cleanup.", heading: "Profit & loss — Q3 2026", lines: [["Revenue", "142,300.00"], ["Cost of services", "− 54,120.00"], ["Operating expenses", "− 31,860.00"]], total: "56,320.00", footer: "Net profit, quarter to date" },
];

export const PLANS = [
  { name: "Standard", price: "29", desc: "For freelancers and small teams getting their first books online.", features: ["3 users", "1,000 invoices / year", "Bank reconciliation", "Core reports"] },
  { name: "Professional", price: "59", desc: "For growing businesses running payroll and inventory in parallel.", features: ["10 users", "Unlimited invoices", "Inventory management", "Projects & time tracking", "Approval workflows"], highlight: true },
  { name: "Elite", price: "99", desc: "For multi-entity operations that need every module, unrestricted.", features: ["Unlimited users", "Multi-entity ledgers", "Custom roles", "Advanced reporting suite", "Priority support"] },
];

export const FAQS = [
  ["Can Ledgerly handle more than one entity?", "Yes. Each entity gets its own ledger, bank feeds, and reports, and you can view a consolidated running balance across all of them from one dashboard."],
  ["Does it connect to my bank automatically?", "Ledgerly connects directly to your bank and credit card accounts to pull transactions daily. You can also import statements manually if your bank isn’t yet supported."],
  ["Is there an accountant or client portal?", "Both. Accountants get scoped access to review and adjust entries, and clients get a portal to view invoices, approve estimates, and pay online."],
  ["Can I export reports for filing?", "All 70+ reports export to PDF, Excel, or CSV, pre-formatted to match what most CPAs and tax filers expect to receive."],
  ["What happens after the free demo?", "You’ll get a 14-day trial on the plan that fits your team, with your sample close already loaded in so you can see real output before committing."],
];
