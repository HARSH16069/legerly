
"use client";

import { useMemo, useState } from "react";
import {
  Btn,
  Card,
  Empty,
  Field,
  Input,
  Modal,
  PageHeader,
  Pill,
  Select,
  useToast,
} from "@/components/ui";

import { useUser } from "@/components/Session";
import { useAsync } from "@/hooks/useAsync";
import { api, send } from "@/lib/api";
import { ROLE_LABEL } from "@/lib/roles";

const ACCESS = [
  {
    role: "owner",
    description:
      "Complete control over the business workspace, team, users and permissions.",
    permissions: [
      "All accounts",
      "All transactions",
      "Reports & analytics",
      "Team management",
      "Role management",
    ],
  },
  {
    role: "admin",
    description:
      "Full operational access, except changing owner accounts.",
    permissions: [
      "All accounts",
      "All transactions",
      "Reports & analytics",
      "Manage staff",
      "Business settings",
    ],
  },
  {
    role: "accountant",
    description:
      "Manage accounting records, entries, reports and audit history.",
    permissions: [
      "All books",
      "Journal entries",
      "Ledger & reports",
      "Audit log",
      "Edit entries",
    ],
  },
  {
    role: "sales",
    description:
      "Focused access to sales operations and customer management.",
    permissions: [
      "Sales entries",
      "Customers",
      "Sales register",
      "No purchase access",
      "No ledger access",
    ],
  },
];

const when = (t) =>
  t
    ? new Date(t.endsWith("Z") ? t : t + "Z").toLocaleString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "Never";

function Icon({ name, size = 19 }) {
  const icons = {
    users: (
      <>
        <path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="10" cy="7" r="4" />
        <path d="M20 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
      </>
    ),
    active: <path d="m5 12 4 4L19 6" />,
    shield: (
      <>
        <path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11z" />
        <path d="m9 12 2 2 4-4" />
      </>
    ),
    search: (
      <>
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-4-4" />
      </>
    ),
    lock: (
      <>
        <rect x="3" y="11" width="18" height="11" rx="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
      </>
    ),
    plus: <path d="M12 5v14M5 12h14" />,
    user: (
      <>
        <circle cx="12" cy="8" r="4" />
        <path d="M5 21a7 7 0 0 1 14 0" />
      </>
    ),
  };

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {icons[name]}
    </svg>
  );
}

function StatCard({ label, value, detail, icon }) {
  return (
    <div className="group rounded-2xl border border-[#132622]/10 bg-white p-4 transition-all duration-200 hover:-translate-y-1 hover:shadow-lg sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-[#132622]/55">
            {label}
          </p>

          <p className="mt-3 text-3xl font-bold tracking-tight text-[#132622]">
            {value}
          </p>

          <p className="mt-1 text-xs text-[#132622]/45">
            {detail}
          </p>
        </div>

        <div className="shrink-0 rounded-xl bg-[#EFEADB] p-3 text-[#1F5D46] transition-transform duration-200 group-hover:scale-110">
          <Icon name={icon} size={21} />
        </div>
      </div>
    </div>
  );
}

function RoleCard({ item }) {
  return (
    <div className="h-full rounded-2xl border border-[#132622]/10 bg-white p-5 transition-all duration-200 hover:-translate-y-1 hover:shadow-lg">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-lg font-semibold tracking-tight text-[#132622]">
          {ROLE_LABEL[item.role]}
        </h3>

        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#EFEADB] text-[#1F5D46]">
          <Icon name="shield" size={19} />
        </div>
      </div>

      <p className="mt-3 text-sm leading-relaxed text-[#132622]/60">
        {item.description}
      </p>

      <div className="mt-5 border-t border-[#132622]/10 pt-4">
        <p className="mb-3 text-[10px] font-bold uppercase tracking-wider text-[#132622]/40">
          Access overview
        </p>

        <div className="flex flex-wrap gap-2">
          {item.permissions.map((permission) => (
            <span
              key={permission}
              className="rounded-lg border border-[#132622]/10 bg-[#FAF9F4] px-2.5 py-1.5 text-[11px] font-medium text-[#132622]/70"
            >
              {permission}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function MemberAvatar({ name, email }) {
  return (
    <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#EFEADB] text-base font-bold text-[#1F5D46]">
      {(name || email || "?").charAt(0).toUpperCase()}
    </div>
  );
}

function MemberActions({ u, manageable, patch, setReset }) {
  if (!manageable) {
    return (
      <span className="text-xs font-medium text-[#132622]/40">
        Protected account
      </span>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {u.is_active ? (
        <Btn
          variant="danger"
          className="!rounded-lg !px-3 !py-2 !text-xs"
          onClick={() =>
            patch(u, { is_active: false }, "Account switched off.")
          }
        >
          Switch off
        </Btn>
      ) : (
        <Btn
          className="!rounded-lg !px-3 !py-2 !text-xs"
          onClick={() =>
            patch(u, { is_active: true }, "Account switched on.")
          }
        >
          Switch on
        </Btn>
      )}

      <Btn
        variant="line"
        className="!rounded-lg !px-3 !py-2 !text-xs"
        onClick={() => setReset(u)}
      >
        Reset password
      </Btn>
    </div>
  );
}

export default function Team() {
  const me = useUser();
  const toast = useToast();

  const { data, error, loading, reload } = useAsync(() => api("/team"));

  const [add, setAdd] = useState(false);
  const [f, setF] = useState({
    name: "",
    email: "",
    password: "",
    role: "sales",
  });

  const [reset, setReset] = useState(null);
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");

  const set = (key) => (e) =>
    setF((s) => ({ ...s, [key]: e.target.value }));

  const isOwner = me.role === "owner";

  const manageable = (u) =>
    u.id !== me.id &&
    (isOwner || !["owner", "admin"].includes(u.role));

  const roles = Object.keys(ROLE_LABEL).filter(
    (r) => isOwner || !["owner", "admin"].includes(r)
  );

  const members = data || [];

  const activeCount = members.filter((u) => u.is_active).length;
  const inactiveCount = members.length - activeCount;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();

    return members.filter((u) => {
      const matchesSearch =
        !q ||
        [u.name, u.email, ROLE_LABEL[u.role]].some((v) =>
          String(v || "").toLowerCase().includes(q)
        );

      const matchesFilter =
        filter === "all" ||
        (filter === "active" && u.is_active) ||
        (filter === "inactive" && !u.is_active);

      return matchesSearch && matchesFilter;
    });
  }, [members, search, filter]);

  async function patch(u, body, ok = "Saved.") {
    try {
      await api(`/team/${u.id}`, send("PUT", body));
      toast(ok);
      reload();
    } catch (er) {
      toast(er.message, true);
    }
  }

  async function create(e) {
    e.preventDefault();
    setBusy(true);

    try {
      await api("/team", send("POST", f));

      toast("Team member added successfully.");
      setAdd(false);
      setF({
        name: "",
        email: "",
        password: "",
        role: "sales",
      });

      reload();
    } catch (er) {
      toast(er.message, true);
    } finally {
      setBusy(false);
    }
  }

  async function doReset(e) {
    e.preventDefault();
    setBusy(true);

    try {
      await api(
        `/team/${reset.id}`,
        send("PUT", { password: pw })
      );

      toast("Password reset. They are signed out everywhere.");
      setReset(null);
      setPw("");
    } catch (er) {
      toast(er.message, true);
    } finally {
      setBusy(false);
    }
  }

  const filters = [
    ["all", "All members"],
    ["active", "Active"],
    ["inactive", "Switched off"],
  ];

  return (
    <main className="min-w-0 w-full space-y-6 overflow-hidden font-sans text-[#132622]">
      <PageHeader eyebrow="Workspace control" title="Team & Access">
        <Btn onClick={() => setAdd(true)}>
          <span className="flex items-center gap-2">
            <Icon name="plus" size={16} />
            Add member
          </span>
        </Btn>
      </PageHeader>

      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl bg-[#132622] p-5 text-white sm:p-8">
        <div className="relative z-10 flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
          <div className="max-w-xl">
            <div className="mb-3 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.2em] text-[#B5CDBF]">
              <Icon name="shield" size={15} />
              Business security
            </div>

            <h2 className="text-2xl font-bold leading-tight tracking-tight sm:text-4xl">
              Your team. Your rules.
              <span className="text-[#B5CDBF]"> Your control.</span>
            </h2>

            <p className="mt-3 max-w-lg text-sm leading-relaxed text-white/60">
              Manage your people, control access to financial data
              and keep your business workspace organised.
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[.06] p-4 sm:min-w-[190px]">
            <p className="text-xs text-white/50">
              Workspace members
            </p>

            <p className="mt-1 text-4xl font-bold tracking-tight">
              {members.length}
            </p>

            <p className="mt-1 text-xs text-[#B5CDBF]">
              Registered team accounts
            </p>
          </div>
        </div>

        <div className="pointer-events-none absolute -right-16 -top-28 h-64 w-64 rounded-full border border-white/10 shadow-[0_0_0_35px_rgba(255,255,255,0.025),0_0_0_70px_rgba(255,255,255,0.02)]" />
      </section>

      {/* Stats */}
      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total members"
          value={loading ? "—" : members.length}
          detail="All team accounts"
          icon="users"
        />

        <StatCard
          label="Active members"
          value={loading ? "—" : activeCount}
          detail="Can access workspace"
          icon="active"
        />

        <StatCard
          label="Switched off"
          value={loading ? "—" : inactiveCount}
          detail="Access currently disabled"
          icon="lock"
        />

        <StatCard
          label="Available roles"
          value={ACCESS.length}
          detail="Permission levels"
          icon="shield"
        />
      </section>

      {/* Team register */}
      <Card className="mb-8 min-w-0 overflow-hidden">
        <div className="mb-5 flex flex-col justify-between gap-4 xl:flex-row xl:items-center">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-[#132622] sm:text-2xl">
              Team members
            </h2>

            <p className="mt-1 text-sm text-[#132622]/50">
              Manage roles, account status and staff credentials.
            </p>
          </div>

          <div className="grid w-full grid-cols-1 gap-2 sm:grid-cols-[1fr_190px] xl:w-auto">
            <div className="relative min-w-0">
              <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#132622]/40">
                <Icon name="search" size={17} />
              </div>

              <input
                type="search"
                placeholder="Search name or email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-11 w-full rounded-xl border border-[#132622]/15 bg-white py-2 pl-10 pr-3 text-sm font-medium text-[#132622] outline-none transition placeholder:text-[#132622]/40 focus:border-[#1F5D46] focus:ring-2 focus:ring-[#1F5D46]/10"
              />
            </div>

            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="h-11 w-full rounded-xl border border-[#132622]/15 bg-white px-3 text-sm font-medium text-[#132622] outline-none transition focus:border-[#1F5D46] focus:ring-2 focus:ring-[#1F5D46]/10"
            >
              <option value="all">All members</option>
              <option value="active">Active only</option>
              <option value="inactive">Switched off</option>
            </select>
          </div>
        </div>

        {/* Filters */}
        <div className="mb-5 flex flex-wrap gap-2">
          {filters.map(([value, label]) => (
            <button
              type="button"
              key={value}
              onClick={() => setFilter(value)}
              className={`rounded-full border px-4 py-2 text-xs font-semibold transition ${
                filter === value
                  ? "border-[#132622] bg-[#132622] text-white"
                  : "border-[#132622]/15 bg-white text-[#132622]/60 hover:border-[#1F5D46] hover:text-[#1F5D46]"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="grid gap-3">
            {[1, 2, 3].map((n) => (
              <div
                key={n}
                className="h-20 animate-pulse rounded-xl bg-[#EFEADB]"
              />
            ))}
          </div>
        ) : error ? (
          <Empty error>{error}</Empty>
        ) : filtered.length ? (
          <>
            {/* Desktop table */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[760px] border-collapse text-left">
                <thead>
                  <tr className="border-b border-[#132622]/15">
                    {[
                      "Member",
                      "Role",
                      "Status",
                      "Last sign-in",
                      "Actions",
                    ].map((heading) => (
                      <th
                        key={heading}
                        className="whitespace-nowrap px-4 py-4 text-xs font-bold uppercase tracking-wider text-[#132622]/45 first:pl-2"
                      >
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  {filtered.map((u) => (
                    <tr
                      key={u.id}
                      className="border-b border-[#132622]/10 transition-colors last:border-0 hover:bg-[#EFEADB]/40"
                    >
                      <td className="px-4 py-4 first:pl-2">
                        <div className="flex min-w-[190px] items-center gap-3">
                          <MemberAvatar name={u.name} email={u.email} />

                          <div className="min-w-0">
                            <p className="font-semibold text-[#132622]">
                              {u.name}

                              {u.id === me.id && (
                                <span className="ml-2 text-[10px] font-bold uppercase tracking-wider text-[#1F5D46]">
                                  You
                                </span>
                              )}
                            </p>

                            <p className="max-w-[210px] truncate text-xs text-[#132622]/50">
                              {u.email}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-4">
                        {manageable(u) ? (
                          <select
                            value={u.role}
                            onChange={(e) =>
                              patch(
                                u,
                                { role: e.target.value },
                                "Role changed."
                              )
                            }
                            className="h-10 min-w-[150px] rounded-lg border border-[#132622]/15 bg-white px-3 text-sm font-medium text-[#132622] outline-none focus:border-[#1F5D46]"
                          >
                            {Object.keys(ROLE_LABEL)
                              .filter(
                                (r) => roles.includes(r) || r === u.role
                              )
                              .map((r) => (
                                <option key={r} value={r}>
                                  {ROLE_LABEL[r]}
                                </option>
                              ))}
                          </select>
                        ) : (
                          <Pill>{ROLE_LABEL[u.role]}</Pill>
                        )}
                      </td>

                      <td className="px-4 py-4">
                        <Pill tone={u.is_active ? "ok" : "bad"}>
                          {u.is_active ? "Active" : "Switched off"}
                        </Pill>
                      </td>

                      <td className="whitespace-nowrap px-4 py-4 text-xs text-[#132622]/55">
                        {when(u.last_login)}
                      </td>

                      <td className="px-4 py-4">
                        <MemberActions
                          u={u}
                          manageable={manageable(u)}
                          patch={patch}
                          setReset={setReset}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile member cards */}
            <div className="grid gap-3 md:hidden">
              {filtered.map((u) => (
                <div
                  key={u.id}
                  className="min-w-0 rounded-2xl border border-[#132622]/10 bg-[#FAF9F4] p-4"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <MemberAvatar name={u.name} email={u.email} />

                    <div className="min-w-0 flex-1">
                      <p className="break-words text-sm font-bold text-[#132622]">
                        {u.name}

                        {u.id === me.id && (
                          <span className="ml-2 text-[10px] font-bold uppercase text-[#1F5D46]">
                            You
                          </span>
                        )}
                      </p>

                      <p className="break-all text-xs text-[#132622]/50">
                        {u.email}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3 border-t border-[#132622]/10 pt-4">
                    <div className="min-w-0">
                      <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-[#132622]/40">
                        Role
                      </p>

                      {manageable(u) ? (
                        <select
                          value={u.role}
                          onChange={(e) =>
                            patch(
                              u,
                              { role: e.target.value },
                              "Role changed."
                            )
                          }
                          className="h-10 w-full min-w-0 rounded-lg border border-[#132622]/15 bg-white px-2 text-xs font-semibold text-[#132622] outline-none focus:border-[#1F5D46]"
                        >
                          {Object.keys(ROLE_LABEL)
                            .filter(
                              (r) => roles.includes(r) || r === u.role
                            )
                            .map((r) => (
                              <option key={r} value={r}>
                                {ROLE_LABEL[r]}
                              </option>
                            ))}
                        </select>
                      ) : (
                        <Pill>{ROLE_LABEL[u.role]}</Pill>
                      )}
                    </div>

                    <div>
                      <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-[#132622]/40">
                        Status
                      </p>

                      <Pill tone={u.is_active ? "ok" : "bad"}>
                        {u.is_active ? "Active" : "Switched off"}
                      </Pill>
                    </div>
                  </div>

                  <div className="mt-4">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-[#132622]/40">
                      Last sign-in
                    </p>

                    <p className="mt-1 text-xs text-[#132622]/60">
                      {when(u.last_login)}
                    </p>
                  </div>

                  <div className="mt-4 border-t border-[#132622]/10 pt-4">
                    <MemberActions
                      u={u}
                      manageable={manageable(u)}
                      patch={patch}
                      setReset={setReset}
                    />
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <Empty>
            {search
              ? "No team members match your search."
              : "No members in this filter."}
          </Empty>
        )}

        {!loading && !error && (
          <div className="mt-4 border-t border-[#132622]/10 pt-4 text-xs text-[#132622]/45">
            Showing {filtered.length} of {members.length} team members
          </div>
        )}
      </Card>

      {/* Permissions */}
      <section className="space-y-4">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[.18em] text-[#1F5D46]">
              Permission management
            </p>

            <h2 className="mt-1 text-xl font-bold tracking-tight text-[#132622] sm:text-2xl">
              What each role can access
            </h2>
          </div>

          <Pill tone="ok">Role overview</Pill>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {ACCESS.map((item) => (
            <RoleCard key={item.role} item={item} />
          ))}
        </div>
      </section>

      {/* Add member modal */}
      {add && (
        <Modal
          title="Add team member"
          sub="Create a staff account with controlled workspace access."
          onClose={() => !busy && setAdd(false)}
        >
          <form onSubmit={create} className="grid gap-4 font-sans">
            <div className="rounded-xl bg-[#EFEADB] p-4">
              <div className="flex items-center gap-2 text-sm font-bold text-[#1F5D46]">
                <Icon name="user" />
                New workspace member
              </div>

              <p className="mt-1 text-xs leading-relaxed text-[#132622]/55">
                They can sign in using the email and temporary password
                you create here.
              </p>
            </div>

            <Field label="Full name">
              <Input
                required
                value={f.name}
                onChange={set("name")}
                placeholder="Enter full name"
              />
            </Field>

            <Field label="Email address">
              <Input
                type="email"
                required
                value={f.email}
                onChange={set("email")}
                placeholder="name@company.com"
              />
            </Field>

            <Field label="Temporary password (8 to 72 characters)">
              <Input
                type="password"
                minLength={8}
                maxLength={72}
                required
                value={f.password}
                onChange={set("password")}
                placeholder="Create a temporary password"
              />
            </Field>

            <Field label="Access role">
              <Select
                value={f.role}
                onChange={set("role")}
              >
                {roles.map((r) => (
                  <option key={r} value={r}>
                    {ROLE_LABEL[r]}
                  </option>
                ))}
              </Select>
            </Field>

            <div className="flex flex-col-reverse gap-2 border-t border-[#132622]/10 pt-4 sm:flex-row sm:justify-end">
              <Btn
                variant="line"
                onClick={() => setAdd(false)}
                disabled={busy}
              >
                Cancel
              </Btn>

              <Btn type="submit" disabled={busy}>
                {busy ? "Creating account..." : "Create member"}
              </Btn>
            </div>
          </form>
        </Modal>
      )}

      {/* Reset password modal */}
      {reset && (
        <Modal
          title="Reset password"
          sub={`${reset.name} will be signed out on every device.`}
          onClose={() => !busy && setReset(null)}
        >
          <form onSubmit={doReset} className="grid gap-4 font-sans">
            <div className="rounded-xl border border-[#132622]/10 bg-[#FAF9F4] p-4">
              <p className="text-xs text-[#132622]/50">Account</p>
              <p className="mt-1 font-bold text-[#132622]">
                {reset.name}
              </p>
              <p className="break-all text-xs text-[#132622]/50">
                {reset.email}
              </p>
            </div>

            <Field label="New password (8 to 72 characters)">
              <Input
                type="password"
                minLength={8}
                maxLength={72}
                required
                autoFocus
                value={pw}
                onChange={(e) => setPw(e.target.value)}
                placeholder="Enter new password"
              />
            </Field>

            <div className="flex flex-col-reverse gap-2 border-t border-[#132622]/10 pt-4 sm:flex-row sm:justify-end">
              <Btn
                variant="line"
                onClick={() => setReset(null)}
                disabled={busy}
              >
                Cancel
              </Btn>

              <Btn type="submit" disabled={busy}>
                {busy ? "Resetting..." : "Reset password"}
              </Btn>
            </div>
          </form>
        </Modal>
      )}
    </main>
  );
}
