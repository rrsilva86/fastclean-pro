export type ClientAddressRecord = {
  label: string;
  street: string;
  city: string;
  state: string;
  postalCode: string;
  notes: string;
  formatted?: string;
  latitude?: string;
  longitude?: string;
  verified?: boolean;
};

export type ClientRecord = {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  nickname?: string;
  birthday?: string;
  frequency?: string;
  property?: string;
  price?: string;
  nextCleaning?: string;
  tag: string;
  wantsSms?: boolean;
  wantsEmail?: boolean;
  leadProfile?: string;
  leadSource?: string;
  referralClientId?: string;
  joinedDate?: string;
  primaryPaymentMethod?: string;
  secondaryPaymentMethod?: string;
  paymentNotes?: string;
  addresses?: ClientAddressRecord[];
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
