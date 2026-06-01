import { PageHeader } from "@/components/layout/page-header";
import { createTranslator, getDictionary } from "@/lib/i18n/dictionaries";
import { EmployeesManager } from "@/modules/employees/employees-manager";

export default async function EmployeesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = createTranslator(getDictionary(locale));

  return (
    <div className="grid gap-6">
      <PageHeader
        title={t("employees.title")}
        subtitle={t("employees.subtitle")}
      />
      <EmployeesManager
        labels={{
          addEmployee: t("employees.addEmployee"),
          saveEmployee: t("employees.saveEmployee"),
          cancel: t("common.cancel"),
          delete: t("common.delete"),
          deleteEmployee: t("employees.deleteEmployee"),
          deleteEmployeeConfirm: t("employees.deleteEmployeeConfirm"),
          edit: t("common.edit"),
          editEmployee: t("employees.editEmployee"),
          name: t("clients.name"),
          role: t("employees.role"),
          saveChanges: t("common.saveChanges"),
          phone: t("employees.phone"),
          email: t("auth.email"),
          hireDate: t("employees.hireDate"),
          status: t("common.status"),
          active: t("employees.active"),
          emptyTitle: t("employees.emptyTitle"),
          emptyDescription: t("employees.emptyDescription")
        }}
      />
    </div>
  );
}
