import { PageHeader } from "@/components/layout/page-header";
import { createTranslator, getDictionary } from "@/lib/i18n/dictionaries";
import { AppointmentsManager } from "@/modules/appointments/appointments-manager";

export default async function AppointmentsPage({
  params,
  searchParams
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ month?: string }>;
}) {
  const { locale } = await params;
  const { month } = await searchParams;
  const t = createTranslator(getDictionary(locale));

  return (
    <div className="grid gap-6">
      <PageHeader title={t("appointments.title")} subtitle={t("appointments.subtitle")} />
      <AppointmentsManager
        clientLabels={{
          addAddress: t("clients.addAddress"),
          addClient: t("clients.addClient"),
          addressDetails: t("clients.addressDetails"),
          addressLabel: t("clients.addressLabel"),
          addressSearch: t("clients.addressSearch"),
          addressVerified: t("clients.addressVerified"),
          birthday: t("clients.birthday"),
          cancel: t("common.cancel"),
          city: t("clients.city"),
          communicationPreferences: t("clients.communicationPreferences"),
          delete: t("common.delete"),
          deleteClient: t("clients.deleteClient"),
          deleteClientConfirm: t("clients.deleteClientConfirm"),
          details: t("common.details"),
          edit: t("common.edit"),
          editClient: t("clients.editClient"),
          email: t("clients.email"),
          emailOptIn: t("clients.emailOptIn"),
          emptyTitle: t("clients.emptyTitle"),
          emptyDescription: t("clients.emptyDescription"),
          joinedDate: t("clients.joinedDate"),
          leadInformation: t("clients.leadInformation"),
          leadProfile: t("clients.leadProfile"),
          leadSource: t("clients.leadSource"),
          name: t("clients.name"),
          nickname: t("clients.nickname"),
          noSecondaryPayment: t("clients.noSecondaryPayment"),
          paymentInformation: t("clients.paymentInformation"),
          paymentNotes: t("clients.paymentNotes"),
          phone: t("clients.phone"),
          postalCode: t("clients.postalCode"),
          primaryPaymentMethod: t("clients.primaryPaymentMethod"),
          property: t("clients.property"),
          referralClient: t("clients.referralClient"),
          saveChanges: t("common.saveChanges"),
          saveClient: t("clients.saveClient"),
          searchAddress: t("clients.searchAddress"),
          secondaryPaymentMethod: t("clients.secondaryPaymentMethod"),
          selectAddress: t("clients.selectAddress"),
          smsOptIn: t("clients.smsOptIn"),
          state: t("clients.state"),
          street: t("clients.street"),
          tag: t("clients.tag"),
          viewProfile: t("clients.viewProfile")
        }}
        locale={locale}
        month={month}
        labels={{
          cancel: t("common.cancel"),
          changeRecurringDescription: t("appointments.changeRecurringDescription"),
          changeRecurringFollowing: t("appointments.changeRecurringFollowing"),
          changeRecurringOnly: t("appointments.changeRecurringOnly"),
          changeRecurringTitle: t("appointments.changeRecurringTitle"),
          checkIn: t("appointments.checkIn"),
          client: t("common.client"),
          clientCommunicationUnavailable: t("appointments.clientCommunicationUnavailable"),
          communication: t("appointments.communication"),
          date: t("common.date"),
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
          selectClientFirst: t("appointments.selectClientFirst"),
          scheduleConflict: t("appointments.scheduleConflict"),
          bufferTime: t("appointments.bufferTime")
        }}
      />
    </div>
  );
}
