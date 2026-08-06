import { PageHeader } from "@/components/layout/page-header";
import { createTranslator, getDictionary } from "@/lib/i18n/dictionaries";
import { AppointmentsManager } from "@/modules/appointments/appointments-manager";
import type { ClientsLabels } from "@/modules/clients/clients-manager";

export default async function AppointmentsPage({
  params,
  searchParams
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ month?: string }>;
}) {
  const { locale } = await params;
  const { month } = await searchParams;
  const dictionary = getDictionary(locale);
  const t = createTranslator(dictionary);
  const clientLabels = {
    ...dictionary.clients,
    cancel: t("common.cancel"),
    delete: t("common.delete"),
    details: t("common.details"),
    edit: t("common.edit"),
    saveChanges: t("common.saveChanges")
  } as ClientsLabels;

  return (
    <div className="grid gap-6">
      <PageHeader title={t("appointments.title")} subtitle={t("appointments.subtitle")} />
      <AppointmentsManager
        clientLabels={clientLabels}
        locale={locale}
        month={month}
        labels={{
          cancel: t("common.cancel"),
          canceled: t("calendar.canceled"),
          awaitingConfirmation: t("appointments.awaitingConfirmation"),
          confirmed: t("appointments.confirmed"),
          inProgress: t("appointments.inProgress"),
          completed: t("appointments.completed"),
          cancelled: t("appointments.cancelled"),
          noShow: t("appointments.noShow"),
          changeRecurringDescription: t("appointments.changeRecurringDescription"),
          changeRecurringFollowing: t("appointments.changeRecurringFollowing"),
          changeRecurringOnly: t("appointments.changeRecurringOnly"),
          changeRecurringTitle: t("appointments.changeRecurringTitle"),
          checkIn: t("appointments.checkIn"),
          client: t("common.client"),
          clientCommunicationUnavailable: t("appointments.clientCommunicationUnavailable"),
          communication: t("appointments.communication"),
          date: t("common.date"),
          deleteAppointment: t("appointments.deleteAppointment"),
          departureNotice: t("appointments.departureNotice"),
          duration: t("appointments.duration"),
          endsAt: t("appointments.endsAt"),
          editAppointment: t("appointments.editAppointment"),
          email: t("appointments.email"),
          emailMissing: t("appointments.emailMissing"),
          emailOptInMissing: t("appointments.emailOptInMissing"),
          extraServices: t("appointments.extraServices"),
          finished: t("calendar.finished"),
          invoiceNotice: t("appointments.invoiceNotice"),
          arrivalNotice: t("appointments.arrivalNotice"),
          moreJobs: t("calendar.moreJobs"),
          agenda: t("appointments.agenda"),
          allTeams: t("appointments.allTeams"),
          allServices: t("appointments.allServices"),
          allStatuses: t("appointments.allStatuses"),
          allRecurrences: t("appointments.allRecurrences"),
          clearFilters: t("appointments.clearFilters"),
          customerSearch: t("appointments.customerSearch"),
          dayView: t("appointments.dayView"),
          weekView: t("appointments.weekView"),
          monthView: t("appointments.monthView"),
          agendaView: t("appointments.agendaView"),
          servicePrice: t("appointments.servicePrice"),
          estimatedDuration: t("appointments.estimatedDuration"),
          assignedTeam: t("appointments.assignedTeam"),
          address: t("appointments.address"),
          payment: t("appointments.payment"),
          invoice: t("appointments.invoice"),
          communicationStatus: t("appointments.communicationStatus"),
          notSent: t("appointments.notSent"),
          paidLabel: t("appointments.paidLabel"),
          noInvoice: t("appointments.noInvoice"),
          openAppointment: t("appointments.openAppointment"),
          detailsPreview: t("appointments.detailsPreview"),
          newAppointment: t("appointments.newAppointment"),
          newClient: t("appointments.newClient"),
          nextMonth: t("calendar.nextMonth"),
          noExtraServices: t("appointments.noExtraServices"),
          notes: t("appointments.notes"),
          paid: t("calendar.paid"),
          previousMonth: t("calendar.previousMonth"),
          price: t("clients.price"),
          recurrence: t("appointments.recurrence"),
          recurrenceCustom: t("appointments.recurrenceCustom"),
          recurrenceDoesNotRepeat: t("appointments.recurrenceDoesNotRepeat"),
          recurrenceEveryFourWeeks: t("appointments.recurrenceEveryFourWeeks"),
          recurrenceEveryThreeWeeks: t("appointments.recurrenceEveryThreeWeeks"),
          recurrenceEveryTwoWeeks: t("appointments.recurrenceEveryTwoWeeks"),
          recurrenceWeekly: t("appointments.recurrenceWeekly"),
          routeOfTheDay: t("calendar.routeOfTheDay"),
          saveAppointment: t("appointments.saveAppointment"),
          saveChanges: t("common.saveChanges"),
          scheduled: t("calendar.scheduled"),
          scheduledCleanings: t("calendar.scheduledCleanings"),
          service: t("appointments.service"),
          sms: t("appointments.sms"),
          smsMissing: t("appointments.smsMissing"),
          smsOptInMissing: t("appointments.smsOptInMissing"),
          started: t("calendar.started"),
          status: t("common.status"),
          team: t("common.team"),
          time: t("common.time"),
          appointmentNotice: t("appointments.appointmentNotice"),
          notificationSent: t("appointments.notificationSent"),
          notificationFailed: t("appointments.notificationFailed"),
          notificationSending: t("appointments.notificationSending"),
          selectClientFirst: t("appointments.selectClientFirst"),
          scheduleConflict: t("appointments.scheduleConflict"),
          bufferTime: t("appointments.bufferTime")
        }}
      />
    </div>
  );
}
