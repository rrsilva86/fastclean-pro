import { CircleDollarSign, Play } from "lucide-react";
import { Badge, Button, Card, CardContent, EmptyState, Table, Td, Th } from "@/components/design-system";
import { PageHeader } from "@/components/layout/page-header";
import { createTranslator, getDictionary } from "@/lib/i18n/dictionaries";

const payrollEntries = [
  ["John Miller", "May 24 - May 30", "payroll.fixedPerHouse", "$560", "payroll.pending", "orange"],
  ["Maria Santos", "May 24 - May 30", "payroll.percentagePerHouse", "$430", "payroll.pending", "orange"],
  ["Carlos Lima", "May 17 - May 23", "payroll.hourlyRate", "$620", "payroll.approved", "green"]
] as const;

export default async function PayrollPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = createTranslator(getDictionary(locale));

  return (
    <div className="grid gap-6">
      <PageHeader
        title={t("payroll.title")}
        subtitle={t("payroll.subtitle")}
        action={
          <Button>
            <Play className="h-4 w-4" />
            {t("payroll.runPayroll")}
          </Button>
        }
      />
      <Card>
        <CardContent>
          <Table>
            <thead>
              <tr>
                <Th>{t("common.employee")}</Th>
                <Th>{t("payroll.period")}</Th>
                <Th>{t("payroll.method")}</Th>
                <Th>{t("payroll.earnings")}</Th>
                <Th>{t("common.status")}</Th>
              </tr>
            </thead>
            <tbody>
              {payrollEntries.map(([employee, period, method, earnings, status, tone]) => (
                <tr className="transition hover:bg-cyan-50/30" key={`${employee}-${period}`}>
                  <Td>
                    <div className="flex items-center gap-3">
                      <span className="grid h-10 w-10 place-items-center rounded-xl bg-teal-50 text-teal-600 ring-1 ring-teal-100">
                        <CircleDollarSign className="h-5 w-5" />
                      </span>
                      <span className="font-black text-slate-950">{employee}</span>
                    </div>
                  </Td>
                  <Td>{period}</Td>
                  <Td>{t(method)}</Td>
                  <Td>
                    <span className="font-black text-slate-950">{earnings}</span>
                  </Td>
                  <Td>
                    <Badge tone={tone}>{t(status)}</Badge>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </CardContent>
      </Card>
      <EmptyState title={t("payroll.emptyTitle")} description={t("payroll.emptyDescription")} />
    </div>
  );
}
