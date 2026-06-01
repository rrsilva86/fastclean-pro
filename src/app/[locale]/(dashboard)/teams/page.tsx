import { PageHeader } from "@/components/layout/page-header";
import { createTranslator, getDictionary } from "@/lib/i18n/dictionaries";
import { TeamsManager } from "@/modules/teams/teams-manager";

export default async function TeamsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = createTranslator(getDictionary(locale));

  return (
    <div className="grid gap-6">
      <PageHeader
        title={t("teams.title")}
        subtitle={t("teams.subtitle")}
      />
      <TeamsManager
        labels={{
          newTeam: t("teams.newTeam"),
          saveTeam: t("teams.saveTeam"),
          cancel: t("common.cancel"),
          delete: t("common.delete"),
          deleteTeam: t("teams.deleteTeam"),
          deleteTeamConfirm: t("teams.deleteTeamConfirm"),
          edit: t("common.edit"),
          editTeam: t("teams.editTeam"),
          saveChanges: t("common.saveChanges"),
          teamName: t("teams.teamName"),
          driver: t("teams.driver"),
          helpers: t("teams.helpers"),
          jobsToday: t("teams.jobsToday"),
          routeReady: t("calendar.routeOfTheDay"),
          noEmployeesTitle: t("teams.noEmployeesTitle"),
          noEmployeesDescription: t("teams.noEmployeesDescription"),
          emptyTitle: t("teams.emptyTitle"),
          emptyDescription: t("teams.emptyDescription")
        }}
      />
    </div>
  );
}
