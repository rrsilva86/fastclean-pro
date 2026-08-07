import type { PlanCode } from "@/lib/plans/plans";

export type PlatformAccount = {
  id: string;
  companyName: string;
  ownerName: string;
  email: string;
  phone: string;
  planCode: PlanCode;
  couponCode: string;
  discountPercent: number;
  complimentary: boolean;
  billingStatus: string;
  activatedAt: string;
};

export const initialPlatformAccounts: PlatformAccount[] = [
  {
    id: "tenant_raisa_cleaning",
    companyName: "Raisa Cleaning Co.",
    ownerName: "Raisa Silva",
    email: "raisa@fastcleanpro.com",
    phone: "",
    planCode: "enterprise",
    couponCode: "ESPOSA100",
    discountPercent: 100,
    complimentary: true,
    billingStatus: "complimentary",
    activatedAt: "2026-06-01T00:00:00.000Z"
  }
];
