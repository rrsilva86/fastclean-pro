export type ModuleStatus = "active" | "planned";

export const appModules = [
  "dashboard",
  "calendar",
  "clients",
  "appointments",
  "teams",
  "employees",
  "invoices",
  "payroll",
  "calculator",
  "messages",
  "reports",
  "settings",
  "crm",
  "documents"
] as const;

export type AppModule = (typeof appModules)[number];

export type FeatureModule = {
  code: AppModule;
  translationKey: string;
  status: ModuleStatus;
  requiredPermission: string;
};

export const featureModules: Record<AppModule, FeatureModule> = {
  dashboard: {
    code: "dashboard",
    translationKey: "nav.dashboard",
    status: "active",
    requiredPermission: "dashboard.read"
  },
  calendar: {
    code: "calendar",
    translationKey: "nav.calendar",
    status: "active",
    requiredPermission: "calendar.read"
  },
  clients: {
    code: "clients",
    translationKey: "nav.clients",
    status: "active",
    requiredPermission: "clients.read"
  },
  appointments: {
    code: "appointments",
    translationKey: "nav.appointments",
    status: "active",
    requiredPermission: "appointments.read"
  },
  teams: {
    code: "teams",
    translationKey: "nav.teams",
    status: "active",
    requiredPermission: "teams.read"
  },
  employees: {
    code: "employees",
    translationKey: "nav.employees",
    status: "active",
    requiredPermission: "employees.read"
  },
  invoices: {
    code: "invoices",
    translationKey: "nav.invoices",
    status: "active",
    requiredPermission: "invoices.read"
  },
  payroll: {
    code: "payroll",
    translationKey: "nav.payroll",
    status: "active",
    requiredPermission: "payroll.read"
  },
  calculator: {
    code: "calculator",
    translationKey: "nav.calculator",
    status: "active",
    requiredPermission: "calculator.read"
  },
  messages: {
    code: "messages",
    translationKey: "nav.messages",
    status: "planned",
    requiredPermission: "messages.read"
  },
  reports: {
    code: "reports",
    translationKey: "nav.reports",
    status: "planned",
    requiredPermission: "reports.read"
  },
  settings: {
    code: "settings",
    translationKey: "nav.settings",
    status: "active",
    requiredPermission: "settings.manage"
  },
  crm: {
    code: "crm",
    translationKey: "nav.crm",
    status: "planned",
    requiredPermission: "crm.read"
  },
  documents: {
    code: "documents",
    translationKey: "nav.documents",
    status: "planned",
    requiredPermission: "documents.read"
  }
};

export function isKnownModule(moduleCode: string): moduleCode is AppModule {
  return appModules.includes(moduleCode as AppModule);
}
