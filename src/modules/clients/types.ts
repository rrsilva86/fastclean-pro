export type ClientAddressRecord = {
  id?: string;
  label: string;
  street: string;
  line2?: string;
  city: string;
  serviceArea?: string;
  state: string;
  postalCode: string;
  country?: string;
  accessInstructions?: string;
  gateCode?: string;
  parkingInstructions?: string;
  notes: string;
  primary?: boolean;
  active?: boolean;
  formatted?: string;
  latitude?: string;
  longitude?: string;
  verified?: boolean;
};

export type CustomerStatus = "active" | "inactive" | "lead" | "archived";
export type CustomerType = "residential" | "commercial";
export type ContactMethod = "phone" | "sms" | "email";
export type ServiceFrequency = "weekly" | "every_2_weeks" | "every_3_weeks" | "every_4_weeks" | "no_repeat" | "multiple" | "on_demand" | "custom";

export type ClientImportWarning = {
  row?: number;
  message: string;
};

export type ClientRecord = {
  id: string;
  externalId?: string;
  customerType?: CustomerType;
  name: string;
  companyName?: string;
  displayName?: string;
  phone?: string;
  originalPhone?: string;
  secondaryPhone?: string;
  email?: string;
  preferredContactMethod?: ContactMethod;
  nickname?: string;
  birthday?: string;
  frequency?: ServiceFrequency | string;
  preferredDay?: string;
  preferredTimeWindow?: string;
  defaultServiceType?: string;
  defaultTeam?: string;
  specialInstructions?: string;
  property?: string;
  price?: string;
  nextCleaning?: string;
  status?: CustomerStatus;
  rating?: string;
  ratingNotes?: string;
  ratingUpdatedAt?: string;
  tag: string;
  wantsSms?: boolean;
  wantsEmail?: boolean;
  marketingConsent?: boolean;
  contactNotes?: string;
  leadProfile?: string;
  leadSource?: string;
  referralClientId?: string;
  joinedDate?: string;
  companyContactPerson?: string;
  companyPhone?: string;
  companyEmail?: string;
  taxExempt?: boolean;
  companyNotes?: string;
  primaryPaymentMethod?: string;
  secondaryPaymentMethod?: string;
  paymentNotes?: string;
  addresses?: ClientAddressRecord[];
  internalNotes?: string;
  importBatchId?: string;
  importedAt?: string;
  importedBy?: string;
  originalRowNumber?: number;
  importWarnings?: ClientImportWarning[];
  highLevelContactId?: string;
  highLevelSyncedAt?: string;
  highLevelSyncStatus?: "synced" | "skipped" | "failed";
  highLevelSyncWarning?: string;
  updatedAt?: string;
};

export type PaymentMethodRecord = {
  id: string;
  name: string;
  icon: string;
  active: boolean;
  customizable: boolean;
};

export const defaultPaymentMethods: PaymentMethodRecord[] = [
  { id: "credit_card", name: "Credit Card", icon: "💳", active: true, customizable: true },
  { id: "debit_card", name: "Debit Card", icon: "💳", active: true, customizable: true },
  { id: "ach_transfer", name: "ACH Transfer", icon: "🏦", active: true, customizable: true },
  { id: "bank_transfer", name: "Bank Transfer", icon: "🏦", active: true, customizable: true },
  { id: "cash", name: "Cash", icon: "💵", active: true, customizable: true },
  { id: "check", name: "Check", icon: "📄", active: true, customizable: true },
  { id: "zelle", name: "Zelle", icon: "📱", active: true, customizable: true },
  { id: "venmo", name: "Venmo", icon: "📱", active: true, customizable: true },
  { id: "cash_app", name: "Cash App", icon: "📱", active: true, customizable: true },
  { id: "paypal", name: "PayPal", icon: "💻", active: true, customizable: true },
  { id: "square", name: "Square", icon: "🟦", active: true, customizable: true },
  { id: "apple_pay", name: "Apple Pay", icon: "🍎", active: true, customizable: true },
  { id: "google_pay", name: "Google Pay", icon: "📲", active: true, customizable: true },
  { id: "other", name: "Other", icon: "📌", active: true, customizable: true }
];

export const defaultClients: ClientRecord[] = [];
