import { CreditCard, FileText, Plus } from "lucide-react";
import { Badge, Button, Card, CardContent, EmptyState, Table, Td, Th } from "@/components/design-system";
import { PageHeader } from "@/components/layout/page-header";
import { createTranslator, getDictionary } from "@/lib/i18n/dictionaries";
import { defaultPaymentMethods } from "@/modules/clients/types";

const invoices = [
  ["INV-1008", "Ana Martins", "$180", "Jun 3", "zelle", "invoices.sent", "blue"],
  ["INV-1007", "Julia Costa", "$145", "May 30", "credit_card", "invoices.paid", "green"],
  ["INV-1004", "Carla Gomez", "$230", "May 22", "ach_transfer", "invoices.overdue", "red"]
] as const;

const revenueByPaymentMethod = [
  ["Zelle", "$12,500"],
  ["Cash", "$4,300"],
  ["Check", "$2,100"],
  ["Credit Card", "$8,700"],
  ["ACH", "$6,200"]
] as const;

function paymentMethodName(paymentMethodId: string) {
  return defaultPaymentMethods.find((method) => method.id === paymentMethodId)?.name ?? paymentMethodId;
}

export default async function InvoicesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = createTranslator(getDictionary(locale));

  return (
    <div className="grid gap-6">
      <PageHeader
        title={t("invoices.title")}
        subtitle={t("invoices.subtitle")}
        action={
          <Button>
            <Plus className="h-4 w-4" />
            {t("invoices.newInvoice")}
          </Button>
        }
      />
      <Card>
        <CardContent className="grid gap-4 lg:grid-cols-[1fr_260px] lg:items-end">
          <div>
            <div className="flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-primary" />
              <h2 className="text-base font-black text-slate-950">{t("invoices.revenueByPaymentMethod")}</h2>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              {revenueByPaymentMethod.map(([method, amount]) => (
                <div className="rounded-xl bg-slate-50 p-4 ring-1 ring-slate-100" key={method}>
                  <p className="text-xs font-black uppercase tracking-wide text-slate-400">{method}</p>
                  <p className="mt-2 text-lg font-black text-slate-950">{amount}</p>
                </div>
              ))}
            </div>
          </div>
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            {t("invoices.filterByPaymentMethod")}
            <select className="h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-primary focus:ring-4 focus:ring-cyan-100">
              <option>{t("common.viewAll")}</option>
              {defaultPaymentMethods
                .filter((method) => method.active)
                .map((method) => (
                  <option key={method.id}>
                    {method.icon} {method.name}
                  </option>
                ))}
            </select>
          </label>
        </CardContent>
      </Card>
      <Card>
        <CardContent>
          <Table>
            <thead>
              <tr>
                <Th>{t("invoices.number")}</Th>
                <Th>{t("common.client")}</Th>
                <Th>{t("common.amount")}</Th>
                <Th>{t("invoices.dueDate")}</Th>
                <Th>{t("invoices.paymentMethod")}</Th>
                <Th>{t("common.status")}</Th>
              </tr>
            </thead>
            <tbody>
              {invoices.map(([number, client, amount, dueDate, paymentMethod, status, tone]) => (
                <tr className="transition hover:bg-cyan-50/30" key={number}>
                  <Td>
                    <div className="flex items-center gap-3">
                      <span className="grid h-10 w-10 place-items-center rounded-xl bg-cyan-50 text-cyan-600 ring-1 ring-cyan-100">
                        <FileText className="h-5 w-5" />
                      </span>
                      <span className="font-black text-slate-950">{number}</span>
                    </div>
                  </Td>
                  <Td>{client}</Td>
                  <Td>
                    <span className="font-black text-slate-950">{amount}</span>
                  </Td>
                  <Td>{dueDate}</Td>
                  <Td>{paymentMethodName(paymentMethod)}</Td>
                  <Td>
                    <Badge tone={tone}>{t(status)}</Badge>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </CardContent>
      </Card>
      <EmptyState title={t("invoices.emptyTitle")} description={t("invoices.emptyDescription")} />
    </div>
  );
}
