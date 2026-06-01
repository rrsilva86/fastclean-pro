"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, CreditCard, ShieldCheck, Sparkles } from "lucide-react";
import { Button, Input } from "@/components/design-system";
import type { PlanCode } from "@/lib/plans/plans";

type SalesPlan = {
  code: PlanCode;
  price: string;
};

type SalesLabels = {
  title: string;
  subtitle: string;
  planStep: string;
  companyStep: string;
  paymentStep: string;
  choosePlan: string;
  selected: string;
  companyName: string;
  ownerName: string;
  email: string;
  phone: string;
  cardName: string;
  cardNumber: string;
  expiration: string;
  cvc: string;
  startTrial: string;
  secureCheckout: string;
  readyToday: string;
  trialNote: string;
  starterName: string;
  starterDescription: string;
  professionalName: string;
  professionalDescription: string;
  businessName: string;
  businessDescription: string;
  perMonth: string;
  requiredError: string;
  features: string[];
};

const plans: SalesPlan[] = [
  { code: "starter", price: "$49" },
  { code: "professional", price: "$99" },
  { code: "business", price: "$199" }
];

function setCookie(name: string, value: string) {
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=2592000; SameSite=Lax`;
}

export function SelfServiceSignup({ labels, locale }: { labels: SalesLabels; locale: string }) {
  const router = useRouter();
  const [selectedPlan, setSelectedPlan] = useState<PlanCode>("professional");
  const [error, setError] = useState("");

  function completePurchase(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const companyName = String(formData.get("companyName") ?? "").trim();
    const ownerName = String(formData.get("ownerName") ?? "").trim();
    const email = String(formData.get("email") ?? "").trim();

    if (!companyName || !ownerName || !email) {
      setError(labels.requiredError);
      return;
    }

    setCookie("fastclean_session", "demo");
    setCookie("fastclean_role", "owner");
    setCookie("fastclean_plan", selectedPlan);
    setCookie("fastclean_company", companyName);

    window.localStorage.setItem("fastclean_signup", JSON.stringify({
      companyName,
      ownerName,
      email,
      phone: String(formData.get("phone") ?? ""),
      planCode: selectedPlan,
      activatedAt: new Date().toISOString()
    }));

    router.push(`/${locale}/dashboard`);
  }

  return (
    <main className="min-h-screen bg-app-background px-5 py-8">
      <div className="mx-auto grid max-w-6xl gap-8">
        <section className="grid gap-6 rounded-3xl bg-gradient-to-br from-cyan-500 to-teal-500 p-8 text-white shadow-premium lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-sm font-black ring-1 ring-white/20">
              <Sparkles className="h-4 w-4" />
              FastClean Pro
            </div>
            <h1 className="mt-6 max-w-3xl text-4xl font-black tracking-tight sm:text-5xl">{labels.title}</h1>
            <p className="mt-4 max-w-2xl text-base font-semibold text-cyan-50">{labels.subtitle}</p>
            <div className="mt-6 flex flex-wrap gap-3">
              {labels.features.map((feature) => (
                <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-sm font-bold ring-1 ring-white/20" key={feature}>
                  <Check className="h-4 w-4" />
                  {feature}
                </span>
              ))}
            </div>
          </div>
          <div className="rounded-2xl bg-white/95 p-5 text-slate-900 shadow-2xl">
            <div className="flex items-center gap-3 rounded-xl bg-cyan-50 p-4 text-cyan-800">
              <ShieldCheck className="h-5 w-5" />
              <div>
                <p className="text-sm font-black">{labels.secureCheckout}</p>
                <p className="text-xs font-bold text-cyan-700">{labels.readyToday}</p>
              </div>
            </div>
          </div>
        </section>

        <form className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]" onSubmit={completePurchase}>
          <section className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-soft">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">{labels.planStep}</p>
            <h2 className="text-xl font-black text-slate-950">{labels.choosePlan}</h2>
            {plans.map((plan) => {
              const planName = plan.code === "starter" ? labels.starterName : plan.code === "business" ? labels.businessName : labels.professionalName;
              const planDescription = plan.code === "starter" ? labels.starterDescription : plan.code === "business" ? labels.businessDescription : labels.professionalDescription;
              const isSelected = selectedPlan === plan.code;

              return (
                <button
                  className={`rounded-2xl border p-4 text-left transition ${isSelected ? "border-cyan-300 bg-cyan-50 ring-4 ring-cyan-100" : "border-slate-200 bg-white hover:border-cyan-200 hover:bg-cyan-50/50"}`}
                  key={plan.code}
                  onClick={() => setSelectedPlan(plan.code)}
                  type="button"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-base font-black text-slate-950">{planName}</p>
                      <p className="mt-1 text-sm font-semibold text-slate-500">{planDescription}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-black text-slate-950">{plan.price}</p>
                      <p className="text-xs font-bold text-slate-400">{labels.perMonth}</p>
                    </div>
                  </div>
                  {isSelected ? <p className="mt-3 text-sm font-black text-primary">{labels.selected}</p> : null}
                </button>
              );
            })}
          </section>

          <section className="grid gap-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-soft">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">{labels.companyStep}</p>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <Input label={labels.companyName} name="companyName" required />
                <Input label={labels.ownerName} name="ownerName" required />
                <Input label={labels.email} name="email" required type="email" />
                <Input label={labels.phone} name="phone" />
              </div>
            </div>

            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">{labels.paymentStep}</p>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <Input label={labels.cardName} name="cardName" />
                <Input label={labels.cardNumber} name="cardNumber" placeholder="4242 4242 4242 4242" />
                <Input label={labels.expiration} name="expiration" placeholder="12/29" />
                <Input label={labels.cvc} name="cvc" placeholder="123" />
              </div>
            </div>

            {error ? <p className="rounded-xl bg-red-50 p-3 text-sm font-black text-red-700 ring-1 ring-red-100">{error}</p> : null}

            <div className="flex flex-col gap-3 rounded-2xl bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3 text-sm font-bold text-slate-600">
                <CreditCard className="h-5 w-5 text-primary" />
                {labels.trialNote}
              </div>
              <Button className="h-12 px-6" type="submit">
                {labels.startTrial}
              </Button>
            </div>
          </section>
        </form>
      </div>
    </main>
  );
}
