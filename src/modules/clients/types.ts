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

export const defaultClients: ClientRecord[] = [
  {
    id: "ana-martins",
    name: "Ana Martins",
    phone: "(617) 555-0142",
    email: "ana.martins@example.com",
    nickname: "Ana",
    birthday: "1986-04-12",
    property: "2,100 sq ft · 3 bedrooms · 2 bathrooms",
    tag: "VIP",
    wantsSms: true,
    wantsEmail: true,
    leadProfile: "Residential recurring",
    leadSource: "Referral",
    referralClientId: "julia-costa",
    joinedDate: "2024-01-18",
    primaryPaymentMethod: "zelle",
    secondaryPaymentMethod: "credit_card",
    paymentNotes: "Prefers payment reminders by SMS.",
    addresses: [
      {
        label: "Main home",
        street: "210 Beacon St",
        city: "Boston",
        state: "Massachusetts",
        postalCode: "02116",
        notes: "Gate code required",
        formatted: "210 Beacon St, Boston, Massachusetts, 02116, United States",
        verified: true
      },
      {
        label: "Lake house",
        street: "18 Harbor Rd",
        city: "Newton",
        state: "Massachusetts",
        postalCode: "02458",
        notes: "Seasonal cleanings",
        formatted: "18 Harbor Rd, Newton, Massachusetts, 02458, United States",
        verified: true
      }
    ]
  },
  {
    id: "julia-costa",
    name: "Julia Costa",
    phone: "(617) 555-0188",
    email: "",
    nickname: "Julia",
    birthday: "1991-09-03",
    property: "1,650 sq ft · 2 bedrooms · 2 bathrooms",
    tag: "Pets",
    wantsSms: true,
    wantsEmail: false,
    leadProfile: "Pet-friendly home",
    leadSource: "Website",
    referralClientId: "",
    joinedDate: "2024-03-06",
    primaryPaymentMethod: "credit_card",
    secondaryPaymentMethod: "",
    paymentNotes: "Card on file.",
    addresses: [
      {
        label: "Home",
        street: "44 Garden Ave",
        city: "Cambridge",
        state: "Massachusetts",
        postalCode: "02139",
        notes: "Two dogs",
        formatted: "44 Garden Ave, Cambridge, Massachusetts, 02139, United States",
        verified: true
      }
    ]
  },
  {
    id: "carla-gomez",
    name: "Carla Gomez",
    phone: "",
    email: "carla.gomez@example.com",
    nickname: "Carla",
    birthday: "1978-11-21",
    property: "2,850 sq ft · 4 bedrooms · 3 bathrooms",
    tag: "Gate code",
    wantsSms: false,
    wantsEmail: true,
    leadProfile: "Large home",
    leadSource: "Google",
    referralClientId: "",
    joinedDate: "2023-10-12",
    primaryPaymentMethod: "ach_transfer",
    secondaryPaymentMethod: "check",
    paymentNotes: "ACH preferred for recurring invoices.",
    addresses: [
      {
        label: "Home",
        street: "9 Maple Lane",
        city: "Brookline",
        state: "Massachusetts",
        postalCode: "02445",
        notes: "Alarm code protected",
        formatted: "9 Maple Lane, Brookline, Massachusetts, 02445, United States",
        verified: true
      }
    ]
  }
];
