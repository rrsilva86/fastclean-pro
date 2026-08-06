"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  AlertTriangle,
  BadgeCheck,
  CalendarClock,
  ChevronDown,
  FileText,
  History,
  Lock,
  Pencil,
  Plus,
  Save,
  ShieldCheck,
  Trash2,
  UserRound,
  WalletCards,
  X
} from "lucide-react";
import { Badge, Button, Card, CardContent, EmptyState, Input, Table, Td, Th } from "@/components/design-system";
import { fallbackSession } from "@/lib/auth/session";
import { hasPermission } from "@/lib/permissions/permissions";
import { readLocalRecords, readRemoteRecords, writeLocalRecords } from "@/lib/storage/local-records";
import {
  createDefaultEmployeeProfile,
  defaultEmployees,
  normalizeEmployee,
  type EmployeeDocument,
  type EmployeeHistoryEvent,
  type EmployeeProfile,
  type EmployeeRecord,
  type EmployeeSkill
} from "@/modules/employees/types";
import { defaultTeams, type TeamRecord } from "@/modules/teams/types";

const storageKey = "fastclean_employees";
const teamsStorageKey = "fastclean_teams";

type LabelMap = Record<string, string>;

type EmployeeProfileLabels = {
  tabs: LabelMap;
  sections: LabelMap;
  fields: LabelMap;
  options: Record<string, LabelMap>;
  actions: LabelMap;
  messages: LabelMap;
  permissions: Record<string, LabelMap>;
  permissionGroups: LabelMap;
  historyActions: LabelMap;
};

type EmployeesLabels = {
  addEmployee: string;
  saveEmployee: string;
  cancel: string;
  delete: string;
  deleteEmployee: string;
  deleteEmployeeConfirm: string;
  edit: string;
  editEmployee: string;
  name: string;
  role: string;
  saveChanges: string;
  phone: string;
  email: string;
  hireDate: string;
  status: string;
  active: string;
  emptyTitle: string;
  emptyDescription: string;
  profile: EmployeeProfileLabels;
};

type ModalMode = "create" | "edit";
type EmployeeFormErrors = Partial<Record<"name" | "role" | "hireDate" | "status" | "workerClassification" | "email", string>>;

const professionalRoles = ["Cleaner", "Driver", "Team Leader", "Supervisor", "Office Staff", "Manager", "Carpenter", "Installer", "Helper", "Custom"];
const secondaryRoles = professionalRoles.filter((role) => role !== "Custom");
const employmentStatuses = ["active", "inactive", "on_leave", "vacation", "terminated"];
const workerClassifications = ["employee", "independent_contractor", "subcontractor", "temporary"];
const workScheduleTypes = ["full_time", "part_time", "on_call", "temporary"];
const paymentTypes = ["hourly", "daily", "weekly_salary", "monthly_salary", "per_job", "commission", "custom"];
const paymentFrequencies = ["weekly", "biweekly", "semimonthly", "monthly", "per_job"];
const paymentMethods = ["direct_deposit", "check", "cash", "zelle", "ach", "other"];
const taxClassifications = ["w2", "1099", "subcontractor", "not_defined"];
const documentTypes = [
  "drivers_license",
  "state_id",
  "passport",
  "work_authorization",
  "social_security_document",
  "w4",
  "w9",
  "i9",
  "employment_agreement",
  "contractor_agreement",
  "nda",
  "background_check",
  "insurance",
  "certification",
  "safety_training",
  "company_policy",
  "other"
];
const documentStatuses = ["pending", "valid", "expiring_soon", "expired", "rejected"];
const skillLevels = ["beginner", "intermediate", "advanced", "expert"];
const skillExamples = ["Standard Cleaning", "Deep Cleaning", "Commercial Cleaning", "Airbnb Turnover", "Move-in/Move-out", "Laundry", "Organization", "Window Cleaning", "Finish Carpentry", "Cabinet Installation", "Drywall", "Painting", "Flooring", "Tile", "Electrical", "Plumbing", "Project Supervision"];
const systemRoles = ["employee", "team_leader", "supervisor", "office_staff", "manager", "administrator", "custom"];
const sensitivePermissions = new Set(["dashboard.financial_values", "dashboard.profitability", "employees.pay_rates", "employees.permissions", "time_payroll.payroll", "time_payroll.employee_pay_rates", "time_payroll.edit_pay_rates", "finance.income", "finance.expenses", "finance.bank_accounts", "finance.reports", "finance.export", "settings.users", "settings.plans", "settings.permission_templates", "settings.audit_logs"]);

const permissionGroups = {
  dashboard: ["dashboard.view", "dashboard.kpis", "dashboard.financial_values", "dashboard.profitability"],
  clients: ["clients.view", "clients.create", "clients.edit", "clients.delete", "clients.contact", "clients.address", "clients.export"],
  schedule: ["schedule.own", "schedule.team", "schedule.all", "schedule.create", "schedule.edit", "schedule.cancel", "schedule.reassign", "schedule.customer_notes"],
  jobs: ["jobs.assigned", "jobs.all", "jobs.create", "jobs.edit", "jobs.status", "jobs.photos", "jobs.notes", "jobs.customer_prices", "jobs.project_costs", "jobs.delete"],
  estimatesInvoices: ["estimates.view", "estimates.create", "estimates.edit", "estimates.send", "estimates.discounts", "estimates.delete", "invoices.view", "invoices.create", "invoices.edit", "invoices.send", "invoices.paid", "invoices.delete"],
  employees: ["employees.view", "employees.contact", "employees.pay_rates", "employees.create", "employees.edit", "employees.deactivate", "employees.terminate", "employees.documents", "employees.permissions", "employees.delete"],
  timePayroll: ["time_payroll.record_own", "time_payroll.edit_own", "time_payroll.own_timesheets", "time_payroll.team_timesheets", "time_payroll.all_timesheets", "time_payroll.approve", "time_payroll.payroll", "time_payroll.process", "time_payroll.employee_pay_rates", "time_payroll.edit_pay_rates"],
  finance: ["finance.income", "finance.expenses", "finance.record_expenses", "finance.edit_expenses", "finance.delete_expenses", "finance.bank_accounts", "finance.reports", "finance.export"],
  settings: ["settings.company", "settings.users", "settings.integrations", "settings.plans", "settings.custom_fields", "settings.permission_templates", "settings.audit_logs"]
};

const roleDefaults: Record<string, string[]> = {
  employee: ["dashboard.view", "schedule.own", "jobs.assigned", "jobs.status", "jobs.photos", "jobs.notes", "time_payroll.record_own", "time_payroll.own_timesheets"],
  team_leader: ["dashboard.view", "clients.view", "clients.contact", "clients.address", "schedule.own", "schedule.team", "jobs.assigned", "jobs.status", "jobs.photos", "jobs.notes", "employees.view", "time_payroll.record_own", "time_payroll.team_timesheets"],
  supervisor: ["dashboard.view", "dashboard.kpis", "clients.view", "schedule.team", "schedule.all", "schedule.edit", "schedule.reassign", "jobs.assigned", "jobs.all", "jobs.edit", "employees.view", "employees.contact", "time_payroll.team_timesheets", "time_payroll.approve"],
  office_staff: ["dashboard.view", "clients.view", "clients.create", "clients.edit", "clients.contact", "clients.address", "schedule.all", "schedule.create", "schedule.edit", "estimates.view", "estimates.create", "invoices.view", "invoices.create", "employees.view"],
  manager: Object.values(permissionGroups).flat().filter((permission) => permission !== "settings.plans" && permission !== "employees.delete"),
  administrator: Object.values(permissionGroups).flat(),
  custom: []
};

function getToday() {
  return new Date().toISOString().slice(0, 10);
}

function formatDateTime(value: string) {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function fieldClass(hasError?: boolean) {
  return `h-11 w-full min-w-0 rounded-lg border bg-white px-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-primary focus:ring-4 focus:ring-cyan-100 ${
    hasError ? "border-red-300 bg-red-50" : "border-slate-200"
  }`;
}

function textAreaClass() {
  return "min-h-24 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-primary focus:ring-4 focus:ring-cyan-100";
}

function makeHistoryEvent(action: string, actor = fallbackSession.name, previousValue?: string, newValue?: string): EmployeeHistoryEvent {
  return {
    id: `history_${Date.now()}_${Math.random().toString(16).slice(2)}`,
    occurredAt: new Date().toISOString(),
    action,
    actor,
    previousValue,
    newValue
  };
}

function calculateCompanyCost(profile: EmployeeProfile) {
  const baseRate = Number(profile.payment.internalCostRate || profile.payment.hourlyRate || 0);
  const burden = Number(profile.payment.payrollBurdenPercentage || 0);
  const overhead = Number(profile.payment.additionalHourlyOverhead || 0);
  return baseRate + baseRate * (burden / 100) + overhead;
}

function getDocumentTone(document: EmployeeDocument): "red" | "orange" | "green" {
  if (document.status === "expired" || document.status === "rejected") {
    return "red";
  }
  if (document.status === "expiring_soon" || document.status === "pending") {
    return "orange";
  }
  return "green";
}

function hasLinkedRecords(employeeId: string) {
  const teams = readLocalRecords<TeamRecord>(teamsStorageKey, defaultTeams);
  return teams.some((team) => team.driverId === employeeId || team.helperIds.includes(employeeId));
}

export function EmployeesManager({ labels }: { labels: EmployeesLabels }) {
  const [employees, setEmployees] = useState<EmployeeRecord[]>(defaultEmployees);
  const [modalState, setModalState] = useState<{ mode: ModalMode; employee: EmployeeRecord | null } | null>(null);

  useEffect(() => {
    const normalizedEmployees = readLocalRecords(storageKey, defaultEmployees).map(normalizeEmployee);
    setEmployees(normalizedEmployees);
    writeLocalRecords(storageKey, normalizedEmployees);
    readRemoteRecords(storageKey, normalizedEmployees).then((records) => {
      const remoteEmployees = records.map(normalizeEmployee);
      setEmployees(remoteEmployees);
      writeLocalRecords(storageKey, remoteEmployees);
    });
  }, []);

  function persistEmployees(nextEmployees: EmployeeRecord[]) {
    setEmployees(nextEmployees);
    writeLocalRecords(storageKey, nextEmployees);
  }

  function saveEmployee(employee: EmployeeRecord) {
    const normalizedEmployee = normalizeEmployee(employee);
    const nextEmployees = employees.some((item) => item.id === normalizedEmployee.id)
      ? employees.map((item) => (item.id === normalizedEmployee.id ? normalizedEmployee : item))
      : [normalizedEmployee, ...employees];
    persistEmployees(nextEmployees);
    setModalState(null);
  }

  function deleteEmployee(employeeId: string) {
    if (hasLinkedRecords(employeeId)) {
      window.alert(labels.profile.messages.deleteBlocked);
      return;
    }

    if (!window.confirm(labels.deleteEmployeeConfirm)) {
      return;
    }

    const nextEmployees = employees.filter((employee) => employee.id !== employeeId);
    persistEmployees(nextEmployees);
    setModalState(null);
  }

  function deactivateEmployee(employee: EmployeeRecord) {
    const profile = createDefaultEmployeeProfile(employee);
    const nextEmployee = normalizeEmployee({
      ...employee,
      status: "inactive",
      profile: {
        ...profile,
        employment: { ...profile.employment, status: "inactive" },
        history: [makeHistoryEvent("deactivated"), ...profile.history]
      }
    });
    persistEmployees(employees.map((item) => (item.id === employee.id ? nextEmployee : item)));
    setModalState({ mode: "edit", employee: nextEmployee });
  }

  function reactivateEmployee(employee: EmployeeRecord) {
    const profile = createDefaultEmployeeProfile(employee);
    const nextEmployee = normalizeEmployee({
      ...employee,
      status: "active",
      profile: {
        ...profile,
        employment: { ...profile.employment, status: "active", terminationDate: "", terminationReason: "" },
        history: [makeHistoryEvent("reactivated"), ...profile.history]
      }
    });
    persistEmployees(employees.map((item) => (item.id === employee.id ? nextEmployee : item)));
    setModalState({ mode: "edit", employee: nextEmployee });
  }

  return (
    <div className="grid gap-6">
      <div className="flex justify-end">
        <Button onClick={() => setModalState({ mode: "create", employee: null })} type="button">
          <Plus className="h-4 w-4" />
          {labels.addEmployee}
        </Button>
      </div>

      <Card>
        <CardContent className="hidden lg:block">
          <Table>
            <thead>
              <tr>
                <Th>{labels.name}</Th>
                <Th>{labels.role}</Th>
                <Th>{labels.phone}</Th>
                <Th>{labels.hireDate}</Th>
                <Th>{labels.status}</Th>
                <Th>{labels.edit}</Th>
              </tr>
            </thead>
            <tbody>
              {employees.map((employee) => (
                <tr className="cursor-pointer transition hover:bg-cyan-50/30" key={employee.id} onClick={() => setModalState({ mode: "edit", employee })}>
                  <Td>
                    <div className="flex items-center gap-3">
                      <span className="grid h-10 w-10 place-items-center rounded-xl bg-teal-50 text-teal-600 ring-1 ring-teal-100">
                        <ShieldCheck className="h-5 w-5" />
                      </span>
                      <div>
                        <span className="font-black text-slate-950">{employee.name}</span>
                        <p className="text-xs font-semibold text-slate-400">{employee.email || "-"}</p>
                      </div>
                    </div>
                  </Td>
                  <Td>{employee.profile?.employment.primaryRole || employee.role}</Td>
                  <Td>{employee.phone || "-"}</Td>
                  <Td>{employee.hireDate || "-"}</Td>
                  <Td>
                    <Badge tone={employee.status === "active" ? "green" : "orange"}>{employee.status === "active" ? labels.active : labels.profile.options.employmentStatus.inactive}</Badge>
                  </Td>
                  <Td>
                    <div className="flex gap-2">
                      <Button onClick={(event) => { event.stopPropagation(); setModalState({ mode: "edit", employee }); }} type="button" variant="outline">
                        <Pencil className="h-4 w-4" />
                        {labels.edit}
                      </Button>
                      <Button onClick={(event) => { event.stopPropagation(); deleteEmployee(employee.id); }} type="button" variant="danger">
                        <Trash2 className="h-4 w-4" />
                        {labels.delete}
                      </Button>
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:hidden">
        {employees.map((employee) => (
          <Card className="cursor-pointer" key={employee.id}>
            <CardContent>
              <div className="flex items-start gap-3" onClick={() => setModalState({ mode: "edit", employee })}>
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-teal-50 text-teal-600 ring-1 ring-teal-100">
                  <ShieldCheck className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <p className="font-black text-slate-950">{employee.name}</p>
                  <p className="truncate text-xs font-semibold text-slate-400">{employee.email || "-"}</p>
                </div>
                <div className="ml-auto">
                  <Badge tone={employee.status === "active" ? "green" : "orange"}>{employee.status === "active" ? labels.active : labels.profile.options.employmentStatus.inactive}</Badge>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-lg bg-slate-50 p-3">
                  <p className="text-xs font-black uppercase tracking-wide text-slate-400">{labels.role}</p>
                  <p className="mt-1 font-black text-slate-950">{employee.profile?.employment.primaryRole || employee.role}</p>
                </div>
                <div className="rounded-lg bg-slate-50 p-3">
                  <p className="text-xs font-black uppercase tracking-wide text-slate-400">{labels.hireDate}</p>
                  <p className="mt-1 font-black text-slate-950">{employee.hireDate || "-"}</p>
                </div>
              </div>
              <p className="mt-4 text-sm font-bold text-slate-600">{employee.phone || "-"}</p>
              <div className="mt-4 flex gap-2">
                <Button className="flex-1" onClick={() => setModalState({ mode: "edit", employee })} type="button" variant="outline">
                  <Pencil className="h-4 w-4" />
                  {labels.edit}
                </Button>
                <Button className="flex-1" onClick={() => deleteEmployee(employee.id)} type="button" variant="danger">
                  <Trash2 className="h-4 w-4" />
                  {labels.delete}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {employees.length === 0 ? <EmptyState title={labels.emptyTitle} description={labels.emptyDescription} /> : null}

      {modalState ? (
        <EmployeeProfileModal
          employee={modalState.employee}
          labels={labels}
          mode={modalState.mode}
          onClose={() => setModalState(null)}
          onDeactivate={deactivateEmployee}
          onDelete={deleteEmployee}
          onReactivate={reactivateEmployee}
          onSave={saveEmployee}
        />
      ) : null}
    </div>
  );
}

function EmployeeProfileModal({
  employee,
  labels,
  mode,
  onClose,
  onDeactivate,
  onDelete,
  onReactivate,
  onSave
}: {
  employee: EmployeeRecord | null;
  labels: EmployeesLabels;
  mode: ModalMode;
  onClose: () => void;
  onDeactivate: (employee: EmployeeRecord) => void;
  onDelete: (employeeId: string) => void;
  onReactivate: (employee: EmployeeRecord) => void;
  onSave: (employee: EmployeeRecord) => void;
}) {
  const normalizedEmployee = useMemo(() => normalizeEmployee(employee ?? {
    id: `employee_${Date.now()}`,
    name: "",
    role: "Cleaner",
    phone: "",
    email: "",
    hireDate: getToday(),
    status: "active"
  }), [employee]);
  const [formEmployee, setFormEmployee] = useState<EmployeeRecord>(normalizedEmployee);
  const [activeTab, setActiveTab] = useState("basic");
  const [errors, setErrors] = useState<EmployeeFormErrors>({});
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [documentFilter, setDocumentFilter] = useState("all");
  const [historyFilter, setHistoryFilter] = useState("");
  const canViewSensitivePay = hasPermission(fallbackSession.role, "payroll.read");
  const profile = createDefaultEmployeeProfile(formEmployee);
  const title = formEmployee.name || labels.profile.messages.newEmployee;
  const initials = (formEmployee.name || labels.profile.messages.newEmployee).split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase();
  const activeDefaults = roleDefaults[profile.permissions.systemRole] ?? [];
  const effectivePermissions = new Set([...activeDefaults, ...Object.entries(profile.permissions.overrides).filter(([, enabled]) => enabled).map(([permission]) => permission)]);
  const warningsByTab = getWarningsByTab(formEmployee, errors);

  function updateEmployee(nextEmployee: EmployeeRecord) {
    setFormEmployee(normalizeEmployee(nextEmployee));
    setIsDirty(true);
    setMessage(null);
  }

  function updateProfile(nextProfile: EmployeeProfile) {
    updateEmployee({
      ...formEmployee,
      name: formEmployee.name,
      role: nextProfile.employment.primaryRole === "Custom" ? nextProfile.employment.customRole || "Custom" : nextProfile.employment.primaryRole,
      phone: formEmployee.phone,
      email: formEmployee.email,
      hireDate: formEmployee.hireDate,
      status: nextProfile.employment.status === "active" ? "active" : "inactive",
      profile: nextProfile
    });
  }

  function updatePayment<K extends keyof EmployeeProfile["payment"]>(key: K, value: EmployeeProfile["payment"][K]) {
    updateProfile({ ...profile, payment: { ...profile.payment, [key]: value } });
  }

  function updateSchedule<K extends keyof EmployeeProfile["schedule"]>(key: K, value: EmployeeProfile["schedule"][K]) {
    updateProfile({ ...profile, schedule: { ...profile.schedule, [key]: value } });
  }

  function closeModal() {
    if (isDirty && !window.confirm(labels.profile.messages.unsavedConfirm)) {
      return;
    }

    onClose();
  }

  function validate() {
    const nextErrors: EmployeeFormErrors = {};
    if (!formEmployee.name.trim()) nextErrors.name = labels.profile.messages.required;
    if (!profile.employment.primaryRole) nextErrors.role = labels.profile.messages.required;
    if (!formEmployee.hireDate) nextErrors.hireDate = labels.profile.messages.required;
    if (!profile.employment.status) nextErrors.status = labels.profile.messages.required;
    if (!profile.employment.workerClassification) nextErrors.workerClassification = labels.profile.messages.required;
    if (formEmployee.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formEmployee.email)) nextErrors.email = labels.profile.messages.invalidEmail;
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      setActiveTab("basic");
      setMessage({ tone: "error", text: labels.profile.messages.validationError });
      return false;
    }

    return true;
  }

  async function saveEmployee({ draft = false }: { draft?: boolean } = {}) {
    if (!draft && !validate()) {
      return;
    }

    setIsSaving(true);
    try {
      const nextProfile = {
        ...profile,
        history: [
          makeHistoryEvent(mode === "create" ? "created" : draft ? "draft_saved" : "updated"),
          ...profile.history
        ]
      };
      const nextEmployee = normalizeEmployee({
        ...formEmployee,
        role: nextProfile.employment.primaryRole === "Custom" ? nextProfile.employment.customRole || "Custom" : nextProfile.employment.primaryRole,
        status: nextProfile.employment.status === "active" ? "active" : "inactive",
        profile: nextProfile
      });
      await new Promise((resolve) => setTimeout(resolve, 250));
      onSave(nextEmployee);
    } catch {
      setMessage({ tone: "error", text: labels.profile.messages.saveFailure });
      setIsSaving(false);
      return;
    }
    setIsSaving(false);
    setMessage({ tone: "success", text: labels.profile.messages.saveSuccess });
  }

  function addDocument() {
    const nextDocument: EmployeeDocument = {
      id: `document_${Date.now()}`,
      name: labels.profile.messages.untitledDocument,
      type: "other",
      number: "",
      issuer: "",
      issueDate: "",
      expirationDate: "",
      fileName: "",
      status: "pending",
      verifiedBy: "",
      verificationDate: "",
      notes: "",
      createdDate: getToday(),
      updatedDate: getToday()
    };
    updateProfile({ ...profile, documents: [nextDocument, ...profile.documents], history: [makeHistoryEvent("document_uploaded"), ...profile.history] });
  }

  function updateDocument(documentId: string, nextDocument: EmployeeDocument) {
    updateProfile({ ...profile, documents: profile.documents.map((document) => (document.id === documentId ? { ...nextDocument, updatedDate: getToday() } : document)) });
  }

  function addSkill() {
    const nextSkill: EmployeeSkill = {
      id: `skill_${Date.now()}`,
      name: "",
      category: "Cleaning",
      level: "beginner",
      years: "",
      certificationName: "",
      certificationFileName: "",
      issueDate: "",
      expirationDate: "",
      notes: "",
      active: true
    };
    updateProfile({ ...profile, skills: [nextSkill, ...profile.skills] });
  }

  function updateSkill(skillId: string, nextSkill: EmployeeSkill) {
    updateProfile({ ...profile, skills: profile.skills.map((skill) => (skill.id === skillId ? nextSkill : skill)) });
  }

  function removeSkill(skillId: string) {
    updateProfile({ ...profile, skills: profile.skills.filter((skill) => skill.id !== skillId) });
  }

  function setPermission(permission: string, enabled: boolean) {
    if (enabled && sensitivePermissions.has(permission) && !window.confirm(labels.profile.messages.sensitivePermissionConfirm)) {
      return;
    }

    updateProfile({
      ...profile,
      permissions: {
        ...profile.permissions,
        overrides: { ...profile.permissions.overrides, [permission]: enabled }
      },
      history: [makeHistoryEvent("permission_changed", fallbackSession.name, permission, enabled ? labels.profile.messages.enabled : labels.profile.messages.disabled), ...profile.history]
    });
  }

  function restoreRoleDefaults() {
    updateProfile({ ...profile, permissions: { ...profile.permissions, overrides: {} } });
  }

  const visibleDocuments = profile.documents
    .filter((document) => documentFilter === "all" || document.status === documentFilter)
    .sort((first, second) => (first.expirationDate || "9999").localeCompare(second.expirationDate || "9999"));
  const visibleHistory = profile.history.filter((event) => `${event.action} ${event.actor} ${event.previousValue ?? ""} ${event.newValue ?? ""}`.toLowerCase().includes(historyFilter.toLowerCase()));

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/35 p-3 backdrop-blur-sm" onClick={closeModal}>
      <section className="flex max-h-[94vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-premium" onClick={(event) => event.stopPropagation()}>
        <header className="sticky top-0 z-10 border-b border-slate-100 bg-white">
          <div className="flex flex-wrap items-center gap-4 px-5 py-4">
            <div className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-2xl bg-cyan-50 text-lg font-black text-cyan-700 ring-1 ring-cyan-100">
              {profile.photoDataUrl ? <img alt="" className="h-full w-full object-cover" src={profile.photoDataUrl} /> : initials}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="truncate text-xl font-black text-slate-950">{title}</h2>
                <Badge tone={formEmployee.status === "active" ? "green" : "orange"}>{labels.profile.options.employmentStatus[profile.employment.status] || profile.employment.status}</Badge>
                {isDirty ? <Badge tone="orange">{labels.profile.messages.unsaved}</Badge> : null}
              </div>
              <p className="mt-1 text-sm font-semibold text-slate-500">{labels.profile.fields.employeeCode}: {profile.employment.employeeCode}</p>
            </div>
            <MoreActions
              employee={formEmployee}
              labels={labels}
              onDeactivate={() => onDeactivate(formEmployee)}
              onDelete={() => onDelete(formEmployee.id)}
              onReactivate={() => onReactivate(formEmployee)}
            />
            <button className="grid h-10 w-10 place-items-center rounded-lg text-slate-500 transition hover:bg-slate-100" onClick={closeModal} type="button">
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="flex gap-2 overflow-x-auto px-5 pb-3">
            {[
              ["basic", UserRound],
              ["payment", WalletCards],
              ["schedule", CalendarClock],
              ["documents", FileText],
              ["skills", BadgeCheck],
              ["permissions", Lock],
              ["history", History]
            ].map(([tab, Icon]) => (
              <button
                className={`inline-flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-black transition ${
                  activeTab === tab ? "bg-cyan-50 text-cyan-700 ring-1 ring-cyan-100" : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                }`}
                key={tab as string}
                onClick={() => setActiveTab(tab as string)}
                type="button"
              >
                <Icon className="h-4 w-4" />
                {labels.profile.tabs[tab as string]}
                {warningsByTab[tab as string] ? <span className="grid h-5 min-w-5 place-items-center rounded-full bg-red-500 px-1 text-[11px] text-white">{warningsByTab[tab as string]}</span> : null}
              </button>
            ))}
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto bg-slate-50/70 p-5">
          {message ? (
            <div className={`mb-4 rounded-xl p-4 text-sm font-bold ring-1 ${message.tone === "success" ? "bg-emerald-50 text-emerald-700 ring-emerald-100" : "bg-red-50 text-red-700 ring-red-100"}`}>
              {message.text}
            </div>
          ) : null}

          {activeTab === "basic" ? (
            <div className="grid gap-4">
              <Section title={labels.profile.sections.personalInformation}>
                <div className="grid gap-4 lg:grid-cols-2">
                  <label className="grid gap-2 text-sm font-medium text-slate-700">
                    {labels.profile.fields.photo}
                    <input
                      accept="image/*"
                      className={fieldClass()}
                      type="file"
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        if (!file) return;
                        const reader = new FileReader();
                        reader.onload = () => updateProfile({ ...profile, photoDataUrl: String(reader.result ?? "") });
                        reader.readAsDataURL(file);
                      }}
                    />
                  </label>
                  <LabeledField error={errors.name} label={labels.profile.fields.fullName}>
                    <input className={fieldClass(Boolean(errors.name))} value={formEmployee.name} onChange={(event) => updateEmployee({ ...formEmployee, name: event.target.value })} />
                  </LabeledField>
                  <Input label={labels.profile.fields.preferredName} value={profile.preferredName} onChange={(event) => updateProfile({ ...profile, preferredName: event.target.value })} />
                  <Input label={labels.profile.fields.primaryPhone} value={formEmployee.phone} onChange={(event) => updateEmployee({ ...formEmployee, phone: event.target.value.replace(/[^\d()+\-\s]/g, "") })} />
                  <Input label={labels.profile.fields.secondaryPhone} value={profile.secondaryPhone} onChange={(event) => updateProfile({ ...profile, secondaryPhone: event.target.value.replace(/[^\d()+\-\s]/g, "") })} />
                  <LabeledField error={errors.email} label={labels.profile.fields.email}>
                    <input className={fieldClass(Boolean(errors.email))} type="email" value={formEmployee.email} onChange={(event) => updateEmployee({ ...formEmployee, email: event.target.value })} />
                  </LabeledField>
                  <Input label={labels.profile.fields.dateOfBirth} type="date" value={profile.dateOfBirth} onChange={(event) => updateProfile({ ...profile, dateOfBirth: event.target.value })} />
                  <SelectField label={labels.profile.fields.preferredLanguage} options={labels.profile.options.language} value={profile.preferredLanguage} onChange={(value) => updateProfile({ ...profile, preferredLanguage: value as "en" | "pt" | "es" })} />
                </div>
              </Section>

              <Section title={labels.profile.sections.address}>
                <div className="grid gap-4 lg:grid-cols-3">
                  <Input className="lg:col-span-2" label={labels.profile.fields.streetAddress} value={profile.address.street} onChange={(event) => updateProfile({ ...profile, address: { ...profile.address, street: event.target.value } })} />
                  <Input label={labels.profile.fields.addressLine2} value={profile.address.line2} onChange={(event) => updateProfile({ ...profile, address: { ...profile.address, line2: event.target.value } })} />
                  <Input label={labels.profile.fields.city} value={profile.address.city} onChange={(event) => updateProfile({ ...profile, address: { ...profile.address, city: event.target.value } })} />
                  <Input label={labels.profile.fields.state} value={profile.address.state} onChange={(event) => updateProfile({ ...profile, address: { ...profile.address, state: event.target.value } })} />
                  <Input label={labels.profile.fields.zipCode} value={profile.address.zipCode} onChange={(event) => updateProfile({ ...profile, address: { ...profile.address, zipCode: event.target.value } })} />
                  <Input label={labels.profile.fields.country} value={profile.address.country} onChange={(event) => updateProfile({ ...profile, address: { ...profile.address, country: event.target.value } })} />
                </div>
              </Section>

              <Section title={labels.profile.sections.emergencyContact}>
                <div className="grid gap-4 lg:grid-cols-2">
                  {(["name", "relationship", "primaryPhone", "secondaryPhone", "email"] as const).map((field) => (
                    <Input
                      key={field}
                      label={labels.profile.fields[`emergency_${field}`] || labels.profile.fields[field]}
                      type={field === "email" ? "email" : "text"}
                      value={profile.emergencyContact[field]}
                      onChange={(event) => updateProfile({ ...profile, emergencyContact: { ...profile.emergencyContact, [field]: event.target.value } })}
                    />
                  ))}
                  <label className="grid gap-2 text-sm font-medium text-slate-700 lg:col-span-2">
                    {labels.profile.fields.notes}
                    <textarea className={textAreaClass()} value={profile.emergencyContact.notes} onChange={(event) => updateProfile({ ...profile, emergencyContact: { ...profile.emergencyContact, notes: event.target.value } })} />
                  </label>
                </div>
              </Section>

              <Section title={labels.profile.sections.employmentInformation}>
                <div className="grid gap-4 lg:grid-cols-2">
                  <Input disabled label={labels.profile.fields.employeeCode} value={profile.employment.employeeCode} />
                  <LabeledField error={errors.role} label={labels.profile.fields.primaryRole}>
                    <select className={fieldClass(Boolean(errors.role))} value={profile.employment.primaryRole} onChange={(event) => updateProfile({ ...profile, employment: { ...profile.employment, primaryRole: event.target.value } })}>
                      {professionalRoles.map((role) => <option key={role} value={role}>{labels.profile.options.professionalRole[role] || role}</option>)}
                    </select>
                  </LabeledField>
                  {profile.employment.primaryRole === "Custom" ? <Input label={labels.profile.fields.customRole} value={profile.employment.customRole} onChange={(event) => updateProfile({ ...profile, employment: { ...profile.employment, customRole: event.target.value } })} /> : null}
                  <label className="grid gap-2 text-sm font-medium text-slate-700">
                    {labels.profile.fields.secondaryRoles}
                    <select className="min-h-28 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-primary focus:ring-4 focus:ring-cyan-100" multiple value={profile.employment.secondaryRoles} onChange={(event) => updateProfile({ ...profile, employment: { ...profile.employment, secondaryRoles: Array.from(event.target.selectedOptions).map((option) => option.value) } })}>
                      {secondaryRoles.map((role) => <option key={role} value={role}>{labels.profile.options.professionalRole[role] || role}</option>)}
                    </select>
                  </label>
                  <LabeledField error={errors.hireDate} label={labels.profile.fields.hireDate}>
                    <input className={fieldClass(Boolean(errors.hireDate))} type="date" value={formEmployee.hireDate} onChange={(event) => updateEmployee({ ...formEmployee, hireDate: event.target.value })} />
                  </LabeledField>
                  <SelectField label={labels.profile.fields.employmentStatus} options={labels.profile.options.employmentStatus} values={employmentStatuses} value={profile.employment.status} onChange={(value) => updateProfile({ ...profile, employment: { ...profile.employment, status: value as EmployeeProfile["employment"]["status"] } })} />
                  <SelectField label={labels.profile.fields.workerClassification} options={labels.profile.options.workerClassification} values={workerClassifications} value={profile.employment.workerClassification} onChange={(value) => updateProfile({ ...profile, employment: { ...profile.employment, workerClassification: value as EmployeeProfile["employment"]["workerClassification"] } })} />
                  <SelectField label={labels.profile.fields.workScheduleType} options={labels.profile.options.workScheduleType} values={workScheduleTypes} value={profile.employment.workScheduleType} onChange={(value) => updateProfile({ ...profile, employment: { ...profile.employment, workScheduleType: value as EmployeeProfile["employment"]["workScheduleType"] } })} />
                  {profile.employment.status === "terminated" ? (
                    <>
                      <Input label={labels.profile.fields.terminationDate} type="date" value={profile.employment.terminationDate} onChange={(event) => updateProfile({ ...profile, employment: { ...profile.employment, terminationDate: event.target.value } })} />
                      <Input label={labels.profile.fields.terminationReason} value={profile.employment.terminationReason} onChange={(event) => updateProfile({ ...profile, employment: { ...profile.employment, terminationReason: event.target.value } })} />
                    </>
                  ) : null}
                  <label className="grid gap-2 text-sm font-medium text-slate-700 lg:col-span-2">
                    {labels.profile.fields.internalNotes}
                    <textarea className={textAreaClass()} value={profile.employment.internalNotes} onChange={(event) => updateProfile({ ...profile, employment: { ...profile.employment, internalNotes: event.target.value } })} />
                  </label>
                </div>
              </Section>
            </div>
          ) : null}

          {activeTab === "payment" ? (
            canViewSensitivePay ? (
              <div className="grid gap-4">
                <Section title={labels.profile.sections.paymentType}>
                  <div className="grid gap-4 lg:grid-cols-3">
                    <SelectField label={labels.profile.fields.paymentType} options={labels.profile.options.paymentType} values={paymentTypes} value={profile.payment.type} onChange={(value) => updatePayment("type", value as EmployeeProfile["payment"]["type"])} />
                    {profile.payment.type === "hourly" ? <Input label={labels.profile.fields.hourlyRate} type="number" value={profile.payment.hourlyRate} onChange={(event) => updatePayment("hourlyRate", event.target.value)} /> : null}
                    {profile.payment.type === "daily" ? <Input label={labels.profile.fields.dailyRate} type="number" value={profile.payment.dailyRate} onChange={(event) => updatePayment("dailyRate", event.target.value)} /> : null}
                    {profile.payment.type === "weekly_salary" ? <Input label={labels.profile.fields.weeklySalary} type="number" value={profile.payment.weeklySalary} onChange={(event) => updatePayment("weeklySalary", event.target.value)} /> : null}
                    {profile.payment.type === "monthly_salary" ? <Input label={labels.profile.fields.monthlySalary} type="number" value={profile.payment.monthlySalary} onChange={(event) => updatePayment("monthlySalary", event.target.value)} /> : null}
                    {profile.payment.type === "per_job" ? <Input label={labels.profile.fields.perJobRate} type="number" value={profile.payment.perJobRate} onChange={(event) => updatePayment("perJobRate", event.target.value)} /> : null}
                    {profile.payment.type === "commission" ? <Input label={labels.profile.fields.commissionPercentage} type="number" value={profile.payment.commissionPercentage} onChange={(event) => updatePayment("commissionPercentage", event.target.value)} /> : null}
                    {profile.payment.type === "custom" ? (
                      <>
                        <Input label={labels.profile.fields.customRateLabel} value={profile.payment.customRateLabel} onChange={(event) => updatePayment("customRateLabel", event.target.value)} />
                        <Input label={labels.profile.fields.customRateAmount} type="number" value={profile.payment.customRateAmount} onChange={(event) => updatePayment("customRateAmount", event.target.value)} />
                      </>
                    ) : null}
                  </div>
                </Section>
                <Section title={labels.profile.sections.overtime}>
                  <div className="grid gap-4 lg:grid-cols-4">
                    <Toggle label={labels.profile.fields.overtimeEnabled} checked={profile.payment.overtimeEnabled} onChange={(checked) => updatePayment("overtimeEnabled", checked)} />
                    <Input label={labels.profile.fields.regularHoursBeforeOvertime} type="number" value={profile.payment.regularHoursBeforeOvertime} onChange={(event) => updatePayment("regularHoursBeforeOvertime", event.target.value)} />
                    <Input label={labels.profile.fields.overtimeMultiplier} type="number" value={profile.payment.overtimeMultiplier} onChange={(event) => updatePayment("overtimeMultiplier", event.target.value)} />
                    <Input label={labels.profile.fields.customOvertimeRate} type="number" value={profile.payment.customOvertimeRate} onChange={(event) => updatePayment("customOvertimeRate", event.target.value)} />
                  </div>
                </Section>
                <Section title={labels.profile.sections.paymentSchedule}>
                  <div className="grid gap-4 lg:grid-cols-4">
                    <SelectField label={labels.profile.fields.paymentFrequency} options={labels.profile.options.paymentFrequency} values={paymentFrequencies} value={profile.payment.paymentFrequency} onChange={(value) => updatePayment("paymentFrequency", value as EmployeeProfile["payment"]["paymentFrequency"])} />
                    <Input label={labels.profile.fields.firstPaymentDate} type="date" value={profile.payment.firstPaymentDate} onChange={(event) => updatePayment("firstPaymentDate", event.target.value)} />
                    <Input label={labels.profile.fields.defaultPaymentDay} value={profile.payment.defaultPaymentDay} onChange={(event) => updatePayment("defaultPaymentDay", event.target.value)} />
                    <Input label={labels.profile.fields.paymentNotes} value={profile.payment.paymentNotes} onChange={(event) => updatePayment("paymentNotes", event.target.value)} />
                  </div>
                </Section>
                <Section title={labels.profile.sections.paymentMethod}>
                  <div className="grid gap-4 lg:grid-cols-2">
                    <SelectField label={labels.profile.fields.defaultPaymentMethod} options={labels.profile.options.paymentMethod} values={paymentMethods} value={profile.payment.defaultPaymentMethod} onChange={(value) => updatePayment("defaultPaymentMethod", value)} />
                    <Input label={labels.profile.fields.paymentRecipientName} value={profile.payment.paymentRecipientName} onChange={(event) => updatePayment("paymentRecipientName", event.target.value)} />
                    <Input label={labels.profile.fields.maskedPaymentDetails} value={profile.payment.maskedPaymentDetails} onChange={(event) => updatePayment("maskedPaymentDetails", event.target.value)} />
                    <Input label={labels.profile.fields.internalPaymentNotes} value={profile.payment.internalPaymentNotes} onChange={(event) => updatePayment("internalPaymentNotes", event.target.value)} />
                  </div>
                </Section>
                <Section title={labels.profile.sections.taxClassification}>
                  <div className="grid gap-4 lg:grid-cols-4">
                    <SelectField label={labels.profile.fields.taxClassification} options={labels.profile.options.taxClassification} values={taxClassifications} value={profile.payment.taxClassification} onChange={(value) => updatePayment("taxClassification", value)} />
                    <Input label={labels.profile.fields.taxIdStatus} value={profile.payment.taxIdStatus} onChange={(event) => updatePayment("taxIdStatus", event.target.value)} />
                    <Input label={labels.profile.fields.requiredTaxDocumentsStatus} value={profile.payment.requiredTaxDocumentsStatus} onChange={(event) => updatePayment("requiredTaxDocumentsStatus", event.target.value)} />
                    <Input label={labels.profile.fields.taxNotes} value={profile.payment.taxNotes} onChange={(event) => updatePayment("taxNotes", event.target.value)} />
                  </div>
                </Section>
                <Section title={labels.profile.sections.reimbursements}>
                  <div className="grid gap-3 lg:grid-cols-3">
                    <Toggle label={labels.profile.fields.mileageReimbursementEnabled} checked={profile.payment.mileageReimbursementEnabled} onChange={(checked) => updatePayment("mileageReimbursementEnabled", checked)} />
                    <Input label={labels.profile.fields.mileageReimbursementRate} type="number" value={profile.payment.mileageReimbursementRate} onChange={(event) => updatePayment("mileageReimbursementRate", event.target.value)} />
                    <Toggle label={labels.profile.fields.fuelReimbursementEnabled} checked={profile.payment.fuelReimbursementEnabled} onChange={(checked) => updatePayment("fuelReimbursementEnabled", checked)} />
                    <Toggle label={labels.profile.fields.materialsReimbursementEnabled} checked={profile.payment.materialsReimbursementEnabled} onChange={(checked) => updatePayment("materialsReimbursementEnabled", checked)} />
                    <Toggle label={labels.profile.fields.toolReimbursementEnabled} checked={profile.payment.toolReimbursementEnabled} onChange={(checked) => updatePayment("toolReimbursementEnabled", checked)} />
                    <Toggle label={labels.profile.fields.allowExpenseSubmissions} checked={profile.payment.allowExpenseSubmissions} onChange={(checked) => updatePayment("allowExpenseSubmissions", checked)} />
                    <Toggle label={labels.profile.fields.expenseApprovalRequired} checked={profile.payment.expenseApprovalRequired} onChange={(checked) => updatePayment("expenseApprovalRequired", checked)} />
                  </div>
                </Section>
                <Section title={labels.profile.sections.jobCosting}>
                  <div className="grid gap-4 lg:grid-cols-5">
                    <Toggle label={labels.profile.fields.includeInProjectCosting} checked={profile.payment.includeInProjectCosting} onChange={(checked) => updatePayment("includeInProjectCosting", checked)} />
                    <Input label={labels.profile.fields.internalCostRate} type="number" value={profile.payment.internalCostRate} onChange={(event) => updatePayment("internalCostRate", event.target.value)} />
                    <Input label={labels.profile.fields.payrollBurdenPercentage} type="number" value={profile.payment.payrollBurdenPercentage} onChange={(event) => updatePayment("payrollBurdenPercentage", event.target.value)} />
                    <Input label={labels.profile.fields.additionalHourlyOverhead} type="number" value={profile.payment.additionalHourlyOverhead} onChange={(event) => updatePayment("additionalHourlyOverhead", event.target.value)} />
                    <Input label={labels.profile.fields.customerBillingRate} type="number" value={profile.payment.customerBillingRate} onChange={(event) => updatePayment("customerBillingRate", event.target.value)} />
                  </div>
                  <div className="mt-4 rounded-xl bg-cyan-50 p-4 text-sm font-black text-cyan-800 ring-1 ring-cyan-100">
                    {labels.profile.fields.calculatedCompanyCost}: ${calculateCompanyCost(profile).toFixed(2)}
                  </div>
                </Section>
              </div>
            ) : (
              <LockedState labels={labels.profile} />
            )
          ) : null}

          {activeTab === "schedule" ? (
            <div className="grid gap-4">
              <Section title={labels.profile.sections.weeklyAvailability}>
                <div className="grid gap-3">
                  {profile.schedule.availability.map((day, index) => (
                    <div className="grid gap-3 rounded-xl border border-slate-100 bg-white p-3 lg:grid-cols-[1fr_120px_120px_120px_120px_1.5fr]" key={day.day}>
                      <Toggle label={labels.profile.options.weekdays[day.day] || day.day} checked={day.available} onChange={(checked) => {
                        const availability = [...profile.schedule.availability];
                        availability[index] = { ...day, available: checked };
                        updateSchedule("availability", availability);
                      }} />
                      <input className={fieldClass()} type="time" value={day.startTime} onChange={(event) => {
                        const availability = [...profile.schedule.availability];
                        availability[index] = { ...day, startTime: event.target.value };
                        updateSchedule("availability", availability);
                      }} />
                      <input className={fieldClass()} type="time" value={day.endTime} onChange={(event) => {
                        const availability = [...profile.schedule.availability];
                        availability[index] = { ...day, endTime: event.target.value };
                        updateSchedule("availability", availability);
                      }} />
                      <input className={fieldClass()} type="time" value={day.secondStartTime} onChange={(event) => {
                        const availability = [...profile.schedule.availability];
                        availability[index] = { ...day, secondStartTime: event.target.value };
                        updateSchedule("availability", availability);
                      }} />
                      <input className={fieldClass()} type="time" value={day.secondEndTime} onChange={(event) => {
                        const availability = [...profile.schedule.availability];
                        availability[index] = { ...day, secondEndTime: event.target.value };
                        updateSchedule("availability", availability);
                      }} />
                      <input className={fieldClass()} placeholder={labels.profile.fields.notes} value={day.notes} onChange={(event) => {
                        const availability = [...profile.schedule.availability];
                        availability[index] = { ...day, notes: event.target.value };
                        updateSchedule("availability", availability);
                      }} />
                    </div>
                  ))}
                </div>
                <div className="mt-4 grid gap-4 lg:grid-cols-5">
                  <Input label={labels.profile.fields.maximumWeeklyHours} type="number" value={profile.schedule.maximumWeeklyHours} onChange={(event) => updateSchedule("maximumWeeklyHours", event.target.value)} />
                  <Input label={labels.profile.fields.effectiveDate} type="date" value={profile.schedule.effectiveDate} onChange={(event) => updateSchedule("effectiveDate", event.target.value)} />
                  <Toggle label={labels.profile.fields.availableForOvertime} checked={profile.schedule.availableForOvertime} onChange={(checked) => updateSchedule("availableForOvertime", checked)} />
                  <Toggle label={labels.profile.fields.availableOnWeekends} checked={profile.schedule.availableOnWeekends} onChange={(checked) => updateSchedule("availableOnWeekends", checked)} />
                  <Input label={labels.profile.fields.recurringUnavailablePeriods} value={profile.schedule.recurringUnavailablePeriods} onChange={(event) => updateSchedule("recurringUnavailablePeriods", event.target.value)} />
                </div>
              </Section>
              <Section title={labels.profile.sections.timeTracking}>
                <div className="grid gap-3 lg:grid-cols-4">
                  {(["clockInEnabled", "clockOutEnabled", "requireGps", "requireClockInPhoto", "requireClockOutPhoto", "requireGeofence", "requireTimesheetApproval", "allowManualTimeEditing", "requireManualEditReason", "automaticBreakEnabled", "roundClockTimes", "lateArrivalNotification", "absenceNotification"] as const).map((field) => (
                    <Toggle key={field} label={labels.profile.fields[field]} checked={Boolean(profile.schedule[field])} onChange={(checked) => updateSchedule(field, checked)} />
                  ))}
                  <Input label={labels.profile.fields.defaultBreakDuration} type="number" value={profile.schedule.defaultBreakDuration} onChange={(event) => updateSchedule("defaultBreakDuration", event.target.value)} />
                  <Input label={labels.profile.fields.minimumShiftDuration} type="number" value={profile.schedule.minimumShiftDuration} onChange={(event) => updateSchedule("minimumShiftDuration", event.target.value)} />
                </div>
              </Section>
              <Section title={labels.profile.sections.workCapabilities}>
                <div className="grid gap-3 lg:grid-cols-4">
                  {(["canWorkAlone", "canLeadTeam", "hasPersonalTransportation", "canDriveCompanyVehicle", "canTransportEmployees", "canPickUpMaterials", "canAccessCustomerPropertyAlone", "requiresSupervision"] as const).map((field) => (
                    <Toggle key={field} label={labels.profile.fields[field]} checked={Boolean(profile.schedule[field])} onChange={(checked) => updateSchedule(field, checked)} />
                  ))}
                </div>
              </Section>
            </div>
          ) : null}

          {activeTab === "documents" ? (
            <Section
              action={<Button onClick={addDocument} type="button"><Plus className="h-4 w-4" />{labels.profile.actions.addDocument}</Button>}
              title={labels.profile.sections.documents}
            >
              <div className="mb-4 flex flex-wrap items-center gap-3">
                <SelectField label={labels.profile.fields.filter} options={{ all: labels.profile.fields.all, ...labels.profile.options.documentStatus }} values={["all", ...documentStatuses]} value={documentFilter} onChange={setDocumentFilter} />
              </div>
              {visibleDocuments.length === 0 ? <EmptyPanel icon={<FileText className="h-5 w-5" />} title={labels.profile.messages.emptyDocuments} /> : null}
              <div className="grid gap-3">
                {visibleDocuments.map((document) => (
                  <div className="grid gap-3 rounded-xl border border-slate-100 bg-white p-4 lg:grid-cols-4" key={document.id}>
                    <Input label={labels.profile.fields.documentName} value={document.name} onChange={(event) => updateDocument(document.id, { ...document, name: event.target.value })} />
                    <SelectField label={labels.profile.fields.documentType} options={labels.profile.options.documentType} values={documentTypes} value={document.type} onChange={(value) => updateDocument(document.id, { ...document, type: value })} />
                    <Input label={labels.profile.fields.documentNumber} value={document.number} onChange={(event) => updateDocument(document.id, { ...document, number: event.target.value })} />
                    <SelectField label={labels.profile.fields.documentStatus} options={labels.profile.options.documentStatus} values={documentStatuses} value={document.status} onChange={(value) => updateDocument(document.id, { ...document, status: value as EmployeeDocument["status"] })} />
                    <Input label={labels.profile.fields.issuer} value={document.issuer} onChange={(event) => updateDocument(document.id, { ...document, issuer: event.target.value })} />
                    <Input label={labels.profile.fields.issueDate} type="date" value={document.issueDate} onChange={(event) => updateDocument(document.id, { ...document, issueDate: event.target.value })} />
                    <Input label={labels.profile.fields.expirationDate} type="date" value={document.expirationDate} onChange={(event) => updateDocument(document.id, { ...document, expirationDate: event.target.value })} />
                    <label className="grid gap-2 text-sm font-medium text-slate-700">
                      {labels.profile.fields.fileUpload}
                      <input className={fieldClass()} type="file" onChange={(event) => updateDocument(document.id, { ...document, fileName: event.target.files?.[0]?.name.replace(/[^a-zA-Z0-9._ -]/g, "") || "" })} />
                    </label>
                    <Input label={labels.profile.fields.verifiedBy} value={document.verifiedBy} onChange={(event) => updateDocument(document.id, { ...document, verifiedBy: event.target.value })} />
                    <Input label={labels.profile.fields.verificationDate} type="date" value={document.verificationDate} onChange={(event) => updateDocument(document.id, { ...document, verificationDate: event.target.value })} />
                    <div className="grid gap-2 text-sm font-medium text-slate-700">
                      {labels.profile.fields.preview}
                      <div className="flex h-11 items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-bold text-slate-600">
                        <span className="truncate">{document.fileName || labels.profile.messages.noFile}</span>
                        <Badge tone={getDocumentTone(document)}>{labels.profile.options.documentStatus[document.status]}</Badge>
                      </div>
                    </div>
                    <Button className="self-end" onClick={() => updateProfile({ ...profile, documents: profile.documents.filter((item) => item.id !== document.id) })} type="button" variant="outline">
                      <Trash2 className="h-4 w-4" />
                      {labels.delete}
                    </Button>
                    <label className="grid gap-2 text-sm font-medium text-slate-700 lg:col-span-4">
                      {labels.profile.fields.notes}
                      <textarea className={textAreaClass()} value={document.notes} onChange={(event) => updateDocument(document.id, { ...document, notes: event.target.value })} />
                    </label>
                  </div>
                ))}
              </div>
            </Section>
          ) : null}

          {activeTab === "skills" ? (
            <Section action={<Button onClick={addSkill} type="button"><Plus className="h-4 w-4" />{labels.profile.actions.addSkill}</Button>} title={labels.profile.sections.skills}>
              {profile.skills.length === 0 ? <EmptyPanel icon={<BadgeCheck className="h-5 w-5" />} title={labels.profile.messages.emptySkills} /> : null}
              <div className="grid gap-3">
                {profile.skills.map((skill) => (
                  <div className="grid gap-3 rounded-xl border border-slate-100 bg-white p-4 lg:grid-cols-4" key={skill.id}>
                    <label className="grid gap-2 text-sm font-medium text-slate-700">
                      {labels.profile.fields.skillName}
                      <input className={fieldClass()} list="skill-examples" value={skill.name} onChange={(event) => updateSkill(skill.id, { ...skill, name: event.target.value })} />
                    </label>
                    <datalist id="skill-examples">
                      {skillExamples.map((skillName) => <option key={skillName} value={skillName} />)}
                    </datalist>
                    <Input label={labels.profile.fields.category} value={skill.category} onChange={(event) => updateSkill(skill.id, { ...skill, category: event.target.value })} />
                    <SelectField label={labels.profile.fields.level} options={labels.profile.options.skillLevel} values={skillLevels} value={skill.level} onChange={(value) => updateSkill(skill.id, { ...skill, level: value as EmployeeSkill["level"] })} />
                    <Input label={labels.profile.fields.yearsExperience} type="number" value={skill.years} onChange={(event) => updateSkill(skill.id, { ...skill, years: event.target.value })} />
                    <Input label={labels.profile.fields.certificationName} value={skill.certificationName} onChange={(event) => updateSkill(skill.id, { ...skill, certificationName: event.target.value })} />
                    <Input label={labels.profile.fields.issueDate} type="date" value={skill.issueDate} onChange={(event) => updateSkill(skill.id, { ...skill, issueDate: event.target.value })} />
                    <Input label={labels.profile.fields.expirationDate} type="date" value={skill.expirationDate} onChange={(event) => updateSkill(skill.id, { ...skill, expirationDate: event.target.value })} />
                    <Toggle label={labels.profile.fields.active} checked={skill.active} onChange={(checked) => updateSkill(skill.id, { ...skill, active: checked })} />
                    <Button className="self-end" onClick={() => removeSkill(skill.id)} type="button" variant="outline">
                      <Trash2 className="h-4 w-4" />
                      {labels.delete}
                    </Button>
                    <label className="grid gap-2 text-sm font-medium text-slate-700 lg:col-span-4">
                      {labels.profile.fields.notes}
                      <textarea className={textAreaClass()} value={skill.notes} onChange={(event) => updateSkill(skill.id, { ...skill, notes: event.target.value })} />
                    </label>
                  </div>
                ))}
              </div>
            </Section>
          ) : null}

          {activeTab === "permissions" ? (
            <div className="grid gap-4">
              <Section title={labels.profile.sections.systemAccess}>
                <div className="grid gap-4 lg:grid-cols-3">
                  <SelectField label={labels.profile.fields.systemRole} options={labels.profile.options.systemRole} values={systemRoles} value={profile.permissions.systemRole} onChange={(value) => updateProfile({ ...profile, permissions: { ...profile.permissions, systemRole: value as EmployeeProfile["permissions"]["systemRole"], overrides: {} } })} />
                  {profile.permissions.systemRole === "custom" ? <Input label={labels.profile.fields.customRoleName} value={profile.permissions.customRoleName} onChange={(event) => updateProfile({ ...profile, permissions: { ...profile.permissions, customRoleName: event.target.value } })} /> : null}
                  <div className="flex items-end gap-2">
                    <Button onClick={restoreRoleDefaults} type="button" variant="outline">{labels.profile.actions.restoreDefaults}</Button>
                  </div>
                </div>
              </Section>
              {Object.entries(permissionGroups).map(([group, permissions]) => (
                <Section
                  action={
                    <div className="flex gap-2">
                      <Button onClick={() => permissions.forEach((permission) => setPermission(permission, true))} type="button" variant="outline">{labels.profile.actions.selectAll}</Button>
                      <Button onClick={() => permissions.forEach((permission) => setPermission(permission, false))} type="button" variant="outline">{labels.profile.actions.clearAll}</Button>
                    </div>
                  }
                  key={group}
                  title={labels.profile.permissionGroups[group]}
                >
                  <div className="grid gap-3 lg:grid-cols-3">
                    {permissions.map((permission) => {
                      const inherited = activeDefaults.includes(permission);
                      const checked = effectivePermissions.has(permission);
                      return (
                        <label className="flex items-start gap-3 rounded-xl border border-slate-100 bg-white p-3 text-sm font-bold text-slate-700" key={permission}>
                          <input className="mt-1 h-4 w-4 accent-cyan-500" checked={checked} onChange={(event) => setPermission(permission, event.target.checked)} type="checkbox" />
                          <span>
                            {labels.profile.permissions[group]?.[permission] || permission}
                            {inherited ? <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-black uppercase text-slate-500">{labels.profile.messages.inherited}</span> : null}
                            {sensitivePermissions.has(permission) ? <span className="ml-2 inline-flex text-orange-600"><AlertTriangle className="h-4 w-4" /></span> : null}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </Section>
              ))}
            </div>
          ) : null}

          {activeTab === "history" ? (
            <Section title={labels.profile.sections.history}>
              <Input label={labels.profile.fields.searchHistory} value={historyFilter} onChange={(event) => setHistoryFilter(event.target.value)} />
              {visibleHistory.length === 0 ? <EmptyPanel icon={<History className="h-5 w-5" />} title={labels.profile.messages.emptyHistory} /> : null}
              <div className="mt-4 grid gap-3">
                {visibleHistory.map((event) => (
                  <div className="rounded-xl border border-slate-100 bg-white p-4" key={event.id}>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-black text-slate-950">{labels.profile.historyActions[event.action] || event.action}</p>
                      <Badge tone="blue">{formatDateTime(event.occurredAt)}</Badge>
                    </div>
                    <p className="mt-1 text-sm font-semibold text-slate-500">{labels.profile.fields.actor}: {event.actor}</p>
                    {event.previousValue || event.newValue ? <p className="mt-2 text-sm font-bold text-slate-700">{event.previousValue || "-"} → {event.newValue || "-"}</p> : null}
                  </div>
                ))}
              </div>
            </Section>
          ) : null}
        </div>

        <footer className="sticky bottom-0 z-10 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 bg-white px-5 py-4">
          <p className="text-sm font-bold text-slate-500">{isDirty ? labels.profile.messages.unsaved : labels.profile.messages.allSaved}</p>
          <div className="flex flex-wrap gap-2">
            <Button disabled={isSaving} onClick={closeModal} type="button" variant="outline">{labels.cancel}</Button>
            <Button disabled={isSaving} onClick={() => saveEmployee({ draft: true })} type="button" variant="secondary">
              <Save className="h-4 w-4" />
              {isSaving ? labels.profile.messages.saving : labels.profile.actions.saveDraft}
            </Button>
            <Button disabled={isSaving} onClick={() => saveEmployee()} type="button">
              <Save className="h-4 w-4" />
              {isSaving ? labels.profile.messages.saving : labels.saveChanges}
            </Button>
          </div>
        </footer>
      </section>
    </div>
  );
}

function Section({ action, children, title }: { action?: ReactNode; children: ReactNode; title: string }) {
  return (
    <section className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-base font-black text-slate-950">{title}</h3>
        {action}
      </div>
      {children}
    </section>
  );
}

function LabeledField({ children, error, label }: { children: ReactNode; error?: string; label: string }) {
  return (
    <label className="grid gap-2 text-sm font-medium text-slate-700">
      {label}
      {children}
      {error ? <span className="text-xs font-bold text-red-600">{error}</span> : null}
    </label>
  );
}

function SelectField({ label, onChange, options, value, values }: { label: string; onChange: (value: string) => void; options: LabelMap; value: string; values?: string[] }) {
  const optionValues = values ?? Object.keys(options);

  return (
    <label className="grid gap-2 text-sm font-medium text-slate-700">
      {label}
      <select className={fieldClass()} value={value} onChange={(event) => onChange(event.target.value)}>
        {optionValues.map((option) => <option key={option} value={option}>{options[option] || option}</option>)}
      </select>
    </label>
  );
}

function Toggle({ checked, label, onChange }: { checked: boolean; label: string; onChange: (checked: boolean) => void }) {
  return (
    <label className="flex min-h-11 items-center gap-3 rounded-lg border border-slate-100 bg-slate-50 px-3 text-sm font-bold text-slate-700">
      <input checked={checked} className="h-4 w-4 accent-cyan-500" onChange={(event) => onChange(event.target.checked)} type="checkbox" />
      {label}
    </label>
  );
}

function EmptyPanel({ icon, title }: { icon: ReactNode; title: string }) {
  return (
    <div className="grid min-h-32 place-items-center rounded-xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center">
      <div className="grid gap-2 place-items-center">
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-white text-slate-400 ring-1 ring-slate-100">{icon}</span>
        <p className="text-sm font-bold text-slate-500">{title}</p>
      </div>
    </div>
  );
}

function LockedState({ labels }: { labels: EmployeeProfileLabels }) {
  return (
    <div className="grid min-h-80 place-items-center rounded-xl border border-slate-100 bg-white p-8 text-center">
      <div className="max-w-md">
        <span className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-orange-50 text-orange-600 ring-1 ring-orange-100">
          <Lock className="h-6 w-6" />
        </span>
        <h3 className="mt-4 text-lg font-black text-slate-950">{labels.messages.sensitiveLockedTitle}</h3>
        <p className="mt-2 text-sm font-semibold text-slate-500">{labels.messages.sensitiveLockedDescription}</p>
      </div>
    </div>
  );
}

function MoreActions({
  employee,
  labels,
  onDeactivate,
  onDelete,
  onReactivate
}: {
  employee: EmployeeRecord;
  labels: EmployeesLabels;
  onDeactivate: () => void;
  onDelete: () => void;
  onReactivate: () => void;
}) {
  const profile = createDefaultEmployeeProfile(employee);
  const isInactive = employee.status === "inactive";
  const canDelete = hasPermission(fallbackSession.role, "employees.manage");

  return (
    <details className="relative">
      <summary className="inline-flex h-10 cursor-pointer list-none items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50">
        {labels.profile.actions.moreActions}
        <ChevronDown className="h-4 w-4" />
      </summary>
      <div className="absolute right-0 top-12 z-20 grid w-64 gap-1 rounded-xl border border-slate-100 bg-white p-2 shadow-premium">
        {isInactive ? (
          <button className="rounded-lg px-3 py-2 text-left text-sm font-bold text-slate-700 hover:bg-cyan-50" onClick={onReactivate} type="button">
            {labels.profile.actions.reactivate}
          </button>
        ) : (
          <button className="rounded-lg px-3 py-2 text-left text-sm font-bold text-slate-700 hover:bg-cyan-50" onClick={onDeactivate} type="button">
            {labels.profile.actions.deactivate}
          </button>
        )}
        <button className="rounded-lg px-3 py-2 text-left text-sm font-bold text-slate-700 hover:bg-cyan-50" onClick={() => window.alert(labels.profile.messages.invitationQueued)} type="button">
          {employee.email ? labels.profile.actions.sendInvitation : labels.profile.actions.resetPassword}
        </button>
        {profile.employment.status !== "terminated" ? (
          <button className="rounded-lg px-3 py-2 text-left text-sm font-bold text-slate-700 hover:bg-cyan-50" onClick={() => window.alert(labels.profile.messages.terminationRequiresSave)} type="button">
            {labels.profile.actions.terminate}
          </button>
        ) : null}
        <button className="rounded-lg px-3 py-2 text-left text-sm font-bold text-slate-700 hover:bg-cyan-50" onClick={() => window.alert(labels.profile.messages.accessRevoked)} type="button">
          {labels.profile.actions.revokeAccess}
        </button>
        {canDelete ? (
          <button className="rounded-lg px-3 py-2 text-left text-sm font-bold text-red-600 hover:bg-red-50" onClick={onDelete} type="button">
            {labels.profile.actions.deletePermanently}
          </button>
        ) : null}
      </div>
    </details>
  );
}

function getWarningsByTab(employee: EmployeeRecord, errors: EmployeeFormErrors) {
  const profile = createDefaultEmployeeProfile(employee);
  const warnings: Record<string, number> = {};
  const basicCount = Object.keys(errors).length;
  const documentCount = profile.documents.filter((document) => document.status === "expired" || document.status === "expiring_soon").length;
  const skillCount = profile.skills.filter((skill) => skill.expirationDate && skill.expirationDate < getToday()).length;

  if (basicCount) warnings.basic = basicCount;
  if (documentCount) warnings.documents = documentCount;
  if (skillCount) warnings.skills = skillCount;

  return warnings;
}
