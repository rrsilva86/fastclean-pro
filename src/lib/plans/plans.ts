import type { AppModule } from "@/config/modules";

export type PlanCode = "starter" | "professional" | "business" | "enterprise";

export type PlanLimitKey = "companies" | "locations" | "users" | "activeClients";

export type SubscriptionPlan = {
  code: PlanCode;
  includedModules: AppModule[];
  limits: Record<PlanLimitKey, number | null>;
};

export const subscriptionPlans: Record<PlanCode, SubscriptionPlan> = {
  starter: {
    code: "starter",
    includedModules: ["dashboard", "calendar", "clients", "appointments", "teams", "employees", "invoices"],
    limits: {
      companies: 1,
      locations: 1,
      users: 5,
      activeClients: 250
    }
  },
  professional: {
    code: "professional",
    includedModules: ["dashboard", "calendar", "clients", "appointments", "teams", "employees", "invoices", "payroll", "messages", "settings"],
    limits: {
      companies: 2,
      locations: 3,
      users: 25,
      activeClients: 1000
    }
  },
  business: {
    code: "business",
    includedModules: [
      "dashboard",
      "calendar",
      "clients",
      "appointments",
      "teams",
      "employees",
      "invoices",
      "payroll",
      "messages",
      "reports",
      "settings",
      "crm",
      "documents"
    ],
    limits: {
      companies: 10,
      locations: 25,
      users: 250,
      activeClients: 10000
    }
  },
  enterprise: {
    code: "enterprise",
    includedModules: [
      "dashboard",
      "calendar",
      "clients",
      "appointments",
      "teams",
      "employees",
      "invoices",
      "payroll",
      "messages",
      "reports",
      "settings",
      "crm",
      "documents"
    ],
    limits: {
      companies: null,
      locations: null,
      users: null,
      activeClients: null
    }
  }
};

export function getPlan(planCode: string) {
  return subscriptionPlans[planCode as PlanCode] ?? subscriptionPlans.starter;
}

export function canAccessModule(planCode: string, appModule: AppModule) {
  return getPlan(planCode).includedModules.includes(appModule);
}
