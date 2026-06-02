"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Ban, Building2, Gift, RotateCcw, ShieldCheck, Trash2, WalletCards } from "lucide-react";
import { Badge, Button, Card, CardContent, CardHeader, Input, Modal, Table, Td, Th } from "@/components/design-system";
import { initialPlatformAccounts, type PlatformAccount } from "@/lib/platform/platform-accounts";
import { buildScopedStorageKey } from "@/lib/storage/local-records";
import type { PlanCode } from "@/lib/plans/plans";

type AdminLabels = {
  title: string;
  subtitle: string;
  companies: string;
  activeSubscriptions: string;
  complimentaryAccounts: string;
  monthlyRevenue: string;
  company: string;
  owner: string;
  email: string;
  plan: string;
  billingStatus: string;
  phone: string;
  discount: string;
  actions: string;
  details: string;
  activatedAt: string;
  couponCode: string;
  dataSummary: string;
  clients: string;
  appointments: string;
  employees: string;
  teams: string;
  blockCompany: string;
  unblockCompany: string;
  deleteCompany: string;
  resetCompanyData: string;
  suspended: string;
  markComplimentary: string;
  removeComplimentary: string;
  discountPercent: string;
  save: string;
  empty: string;
};

const storageKey = "fastclean_platform_accounts";
const companyStorageKeys = [
  { key: "fastclean_clients", label: "clients" },
  { key: "fastclean_appointments", label: "appointments" },
  { key: "fastclean_employees", label: "employees" },
  { key: "fastclean_teams", label: "teams" },
  { key: "fastclean_system_settings", label: "settings" },
  { key: "fastclean_signup", label: "signup" }
];

function readAccounts() {
  const rawValue = window.localStorage.getItem(storageKey);

  if (!rawValue) {
    window.localStorage.setItem(storageKey, JSON.stringify(initialPlatformAccounts));
    return initialPlatformAccounts;
  }

  return JSON.parse(rawValue) as PlatformAccount[];
}

function writeAccounts(accounts: PlatformAccount[]) {
  window.localStorage.setItem(storageKey, JSON.stringify(accounts));
}

function readRecordCount(accountId: string, key: string) {
  try {
    const value = JSON.parse(window.localStorage.getItem(buildScopedStorageKey(key, accountId)) ?? "[]") as unknown;
    return Array.isArray(value) ? value.length : 0;
  } catch {
    return 0;
  }
}

function clearCompanyData(accountId: string) {
  companyStorageKeys.forEach((item) => window.localStorage.removeItem(buildScopedStorageKey(item.key, accountId)));
  window.localStorage.setItem(`fastclean_reset_${accountId}_tenant-scoped-clean-company-v1`, "done");
}

function estimatedPlanPrice(planCode: PlanCode) {
  return planCode === "starter" ? 49 : planCode === "business" ? 199 : planCode === "enterprise" ? 499 : 99;
}

export function PlatformAdminManager({ labels }: { labels: AdminLabels }) {
  const [accounts, setAccounts] = useState<PlatformAccount[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<PlatformAccount | null>(null);

  useEffect(() => {
    setAccounts(readAccounts());
  }, []);

  function updateAccount(accountId: string, changes: Partial<PlatformAccount>) {
    const nextAccounts = accounts.map((account) => (account.id === accountId ? { ...account, ...changes } : account));
    setAccounts(nextAccounts);
    writeAccounts(nextAccounts);
    setSelectedAccount((account) => (account?.id === accountId ? { ...account, ...changes } : account));
  }

  function deleteAccount(accountId: string) {
    const nextAccounts = accounts.filter((account) => account.id !== accountId);
    clearCompanyData(accountId);
    setAccounts(nextAccounts);
    writeAccounts(nextAccounts);
    setSelectedAccount(null);
  }

  const activeSubscriptions = accounts.filter((account) => account.billingStatus === "active").length;
  const complimentaryAccounts = accounts.filter((account) => account.complimentary).length;
  const monthlyRevenue = accounts.reduce((total, account) => {
    if (account.complimentary || account.billingStatus !== "active") {
      return total;
    }

    return total + estimatedPlanPrice(account.planCode) * (1 - account.discountPercent / 100);
  }, 0);

  return (
    <div className="grid gap-6">
      <div>
        <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">FastClean Pro</p>
        <h1 className="mt-2 text-3xl font-black text-slate-950">{labels.title}</h1>
        <p className="mt-2 max-w-3xl text-sm font-semibold text-slate-500">{labels.subtitle}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Metric icon={<Building2 className="h-5 w-5" />} label={labels.companies} value={String(accounts.length)} />
        <Metric icon={<ShieldCheck className="h-5 w-5" />} label={labels.activeSubscriptions} value={String(activeSubscriptions)} />
        <Metric icon={<Gift className="h-5 w-5" />} label={labels.complimentaryAccounts} value={String(complimentaryAccounts)} />
        <Metric icon={<WalletCards className="h-5 w-5" />} label={labels.monthlyRevenue} value={`$${monthlyRevenue.toFixed(0)}`} />
      </div>

      <Card>
        <CardHeader>
          <h2 className="text-base font-black text-slate-950">{labels.companies}</h2>
        </CardHeader>
        <CardContent>
          {accounts.length === 0 ? (
            <p className="rounded-xl bg-slate-50 p-5 text-sm font-bold text-slate-500">{labels.empty}</p>
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>{labels.company}</Th>
                  <Th>{labels.owner}</Th>
                  <Th>{labels.phone}</Th>
                  <Th>{labels.plan}</Th>
                  <Th>{labels.billingStatus}</Th>
                  <Th>{labels.discount}</Th>
                  <Th>{labels.actions}</Th>
                </tr>
              </thead>
              <tbody>
                {accounts.map((account) => (
                  <tr className="cursor-pointer transition hover:bg-cyan-50/50" key={account.id} onClick={() => setSelectedAccount(account)}>
                    <Td>
                      <span className="font-black text-slate-950">{account.companyName}</span>
                      <span className="mt-1 block text-xs font-bold text-slate-400">{account.email}</span>
                    </Td>
                    <Td>{account.ownerName}</Td>
                    <Td>{account.phone || "-"}</Td>
                    <Td><Badge tone="blue">{account.planCode}</Badge></Td>
                    <Td><Badge tone={account.billingStatus === "suspended" ? "red" : account.complimentary ? "green" : "teal"}>{account.billingStatus === "suspended" ? labels.suspended : account.billingStatus}</Badge></Td>
                    <Td>
                      <div onClick={(event) => event.stopPropagation()}>
                        <Input
                          className="w-24"
                          label={labels.discountPercent}
                          max={100}
                          min={0}
                          onChange={(event) => updateAccount(account.id, { discountPercent: Number(event.target.value), complimentary: Number(event.target.value) >= 100, billingStatus: Number(event.target.value) >= 100 ? "complimentary" : "active" })}
                          type="number"
                          value={account.discountPercent}
                        />
                      </div>
                    </Td>
                    <Td>
                      <div onClick={(event) => event.stopPropagation()}>
                        <Button
                          onClick={() => updateAccount(account.id, { complimentary: !account.complimentary, discountPercent: account.complimentary ? 0 : 100, billingStatus: account.complimentary ? "active" : "complimentary" })}
                          type="button"
                          variant={account.complimentary ? "outline" : "secondary"}
                        >
                          {account.complimentary ? labels.removeComplimentary : labels.markComplimentary}
                        </Button>
                      </div>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </CardContent>
      </Card>

      {selectedAccount ? (
        <Modal onClose={() => setSelectedAccount(null)} title={labels.details}>
          <div className="grid gap-5">
            <div className="grid gap-3 rounded-xl bg-slate-50 p-4 sm:grid-cols-2">
              <Detail label={labels.company} value={selectedAccount.companyName} />
              <Detail label={labels.owner} value={selectedAccount.ownerName} />
              <Detail label={labels.email} value={selectedAccount.email} />
              <Detail label={labels.phone} value={selectedAccount.phone || "-"} />
              <Detail label={labels.plan} value={selectedAccount.planCode} />
              <Detail label={labels.billingStatus} value={selectedAccount.billingStatus === "suspended" ? labels.suspended : selectedAccount.billingStatus} />
              <Detail label={labels.discount} value={`${selectedAccount.discountPercent}%`} />
              <Detail label={labels.couponCode} value={selectedAccount.couponCode || "-"} />
              <Detail label={labels.activatedAt} value={new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(selectedAccount.activatedAt))} />
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <h3 className="text-sm font-black text-slate-950">{labels.dataSummary}</h3>
              <div className="mt-3 grid gap-3 sm:grid-cols-4">
                <MiniStat label={labels.clients} value={String(readRecordCount(selectedAccount.id, "fastclean_clients"))} />
                <MiniStat label={labels.appointments} value={String(readRecordCount(selectedAccount.id, "fastclean_appointments"))} />
                <MiniStat label={labels.employees} value={String(readRecordCount(selectedAccount.id, "fastclean_employees"))} />
                <MiniStat label={labels.teams} value={String(readRecordCount(selectedAccount.id, "fastclean_teams"))} />
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button
                onClick={() => updateAccount(selectedAccount.id, { billingStatus: selectedAccount.billingStatus === "suspended" ? "active" : "suspended" })}
                type="button"
                variant={selectedAccount.billingStatus === "suspended" ? "secondary" : "outline"}
              >
                <Ban className="h-4 w-4" />
                {selectedAccount.billingStatus === "suspended" ? labels.unblockCompany : labels.blockCompany}
              </Button>
              <Button
                onClick={() => {
                  clearCompanyData(selectedAccount.id);
                  setSelectedAccount({ ...selectedAccount });
                }}
                type="button"
                variant="outline"
              >
                <RotateCcw className="h-4 w-4" />
                {labels.resetCompanyData}
              </Button>
              <Button onClick={() => deleteAccount(selectedAccount.id)} type="button" variant="danger">
                <Trash2 className="h-4 w-4" />
                {labels.deleteCompany}
              </Button>
            </div>
          </div>
        </Modal>
      ) : null}
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-black uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-1 text-sm font-bold text-slate-800">{value}</p>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-50 p-3 ring-1 ring-slate-100">
      <p className="text-xs font-black uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-1 text-xl font-black text-slate-950">{value}</p>
    </div>
  );
}

function Metric({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-soft">
      <div className="grid h-10 w-10 place-items-center rounded-xl bg-cyan-50 text-primary">{icon}</div>
      <p className="mt-4 text-xs font-black uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-1 text-2xl font-black text-slate-950">{value}</p>
    </div>
  );
}
