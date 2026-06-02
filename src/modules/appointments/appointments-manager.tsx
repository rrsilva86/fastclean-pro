"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CalendarCheck, ChevronLeft, ChevronRight, Mail, MapPinned, MessageSquare, Plus, Trash2, UserPlus, X } from "lucide-react";
import { Badge, Button, Card, CardContent, CardHeader, Input, Modal, Table, Td, Th } from "@/components/design-system";
import { readLocalRecords, writeLocalRecords } from "@/lib/storage/local-records";
import { defaultClients, type ClientRecord } from "@/modules/clients/types";
import { ClientForm, type ClientsLabels } from "@/modules/clients/clients-manager";
import { defaultCleaningServiceTypes, defaultExtraServices } from "@/modules/services/types";

type AppointmentStatus = "scheduled" | "started" | "finished" | "paid";

type AppointmentRecord = {
  id: string;
  date: string;
  time: string;
  client: string;
  team: string;
  service: string;
  extraServices: string[];
  recurrence: string;
  notes: string;
  status: AppointmentStatus;
  price: string;
  durationMinutes: number;
  originalDate?: string;
  sourceId?: string;
  isRecurringInstance?: boolean;
};

type AppointmentLabels = {
  cancel: string;
  checkIn: string;
  client: string;
  clientCommunicationUnavailable: string;
  communication: string;
  date: string;
  departureNotice: string;
  duration: string;
  endsAt: string;
  editAppointment: string;
  email: string;
  emailMissing: string;
  emailOptInMissing: string;
  extraServices: string;
  invoiceNotice: string;
  arrivalNotice: string;
  moreJobs: string;
  newAppointment: string;
  newClient: string;
  noExtraServices: string;
  notes: string;
  nextMonth: string;
  paid: string;
  previousMonth: string;
  price: string;
  recurrence: string;
  recurrenceCustom: string;
  recurrenceDoesNotRepeat: string;
  recurrenceEveryFourWeeks: string;
  recurrenceEveryThreeWeeks: string;
  recurrenceEveryTwoWeeks: string;
  recurrenceWeekly: string;
  routeOfTheDay: string;
  saveAppointment: string;
  saveChanges: string;
  scheduled: string;
  scheduledCleanings: string;
  service: string;
  sms: string;
  smsMissing: string;
  smsOptInMissing: string;
  started: string;
  finished: string;
  status: string;
  team: string;
  time: string;
  appointmentNotice: string;
  notificationSent: string;
  selectClientFirst: string;
  scheduleConflict: string;
  bufferTime: string;
  changeRecurringDescription: string;
  changeRecurringFollowing: string;
  changeRecurringOnly: string;
  changeRecurringTitle: string;
};

const storageKey = "fastclean_appointments";
const clientsStorageKey = "fastclean_clients";
const appointmentBufferMinutes = 30;
const fieldLabelClass = "grid min-w-0 gap-2 text-sm font-medium text-slate-700";
const selectClass = "h-11 w-full min-w-0 rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-primary focus:ring-4 focus:ring-cyan-100";

function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function parseMonth(value: string | undefined) {
  if (!value || !/^\d{4}-\d{2}$/.test(value)) {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), 1);
  }

  const [year, month] = value.split("-").map(Number);
  return new Date(year, month - 1, 1);
}

function addMonths(date: Date, months: number) {
  return new Date(date.getFullYear(), date.getMonth() + months, 1);
}

function addDays(date: Date, days: number) {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + days);
  return nextDate;
}

function createMonthDays(monthDate: Date) {
  const firstDay = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
  const daysInMonth = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0).getDate();
  const leadingDays = firstDay.getDay();

  return [
    ...Array.from({ length: leadingDays }, () => null),
    ...Array.from({ length: daysInMonth }, (_, index) => new Date(monthDate.getFullYear(), monthDate.getMonth(), index + 1))
  ];
}

function formatDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function parseDateKey(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function parseTimeToMinutes(value: string) {
  const normalizedTime = normalizeTimeInput(value);
  const [hours, minutes] = normalizedTime.split(":").map(Number);
  return hours * 60 + minutes;
}

function formatMinutesAsTime(value: number) {
  const normalizedValue = ((value % 1440) + 1440) % 1440;
  const hours = Math.floor(normalizedValue / 60);
  const minutes = normalizedValue % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function normalizeTimeInput(value: string) {
  const cleanValue = value.trim().toLowerCase().replace(/\s+/g, "");
  const match = cleanValue.match(/^(\d{1,2})(?::?(\d{2}))?(am|pm)?$/);

  if (!match) {
    return value;
  }

  let hours = Number(match[1]);
  const minutes = Number(match[2] ?? "0");
  const period = match[3];

  if (period === "pm" && hours < 12) {
    hours += 12;
  }

  if (period === "am" && hours === 12) {
    hours = 0;
  }

  if (hours > 23 || minutes > 59) {
    return value;
  }

  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function appointmentEndTime(appointment: AppointmentRecord) {
  return formatMinutesAsTime(parseTimeToMinutes(appointment.time) + appointment.durationMinutes);
}

function appointmentTimeRange(appointment: AppointmentRecord) {
  return `${appointment.time} - ${appointmentEndTime(appointment)}`;
}

function appointmentHasConflict(appointment: AppointmentRecord, appointments: AppointmentRecord[]) {
  const start = parseTimeToMinutes(appointment.time);
  const endWithBuffer = start + appointment.durationMinutes + appointmentBufferMinutes;

  return appointments.some((item) => {
    if (item.id === appointment.id || item.date !== appointment.date || item.team !== appointment.team) {
      return false;
    }

    const itemStart = parseTimeToMinutes(item.time);
    const itemEndWithBuffer = itemStart + item.durationMinutes + appointmentBufferMinutes;
    return start < itemEndWithBuffer && itemStart < endWithBuffer;
  });
}

function recurrenceIntervalDays(recurrence: string) {
  if (recurrence === "weekly") {
    return 7;
  }

  if (recurrence === "every_two_weeks") {
    return 14;
  }

  if (recurrence === "every_three_weeks") {
    return 21;
  }

  if (recurrence === "every_four_weeks") {
    return 28;
  }

  return 0;
}

function expandAppointmentsForMonth(records: AppointmentRecord[], monthDate: Date) {
  const monthStart = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
  const monthEnd = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);
  const appointmentsByDate = new Set(records.map((appointment) => `${appointment.sourceId ?? appointment.id}:${appointment.date}`));
  const skippedOccurrences = new Set(records.filter((appointment) => appointment.sourceId && appointment.originalDate).map((appointment) => `${appointment.sourceId}:${appointment.originalDate}`));
  const expandedAppointments = records.filter((appointment) => {
    const appointmentDate = parseDateKey(appointment.date);
    return appointmentDate >= monthStart && appointmentDate <= monthEnd;
  });

  records
    .filter((appointment) => !appointment.isRecurringInstance && !appointment.sourceId)
    .forEach((appointment) => {
      const intervalDays = recurrenceIntervalDays(appointment.recurrence);

      if (!intervalDays) {
        return;
      }

      let occurrenceDate = parseDateKey(appointment.date);

      while (occurrenceDate < monthStart) {
        occurrenceDate = addDays(occurrenceDate, intervalDays);
      }

      while (occurrenceDate <= monthEnd) {
        const occurrenceDateKey = formatDateKey(occurrenceDate);
        const occurrenceKey = `${appointment.id}:${occurrenceDateKey}`;

        if (occurrenceDateKey !== appointment.date && !appointmentsByDate.has(occurrenceKey) && !skippedOccurrences.has(occurrenceKey)) {
          expandedAppointments.push({
            ...appointment,
            id: `${appointment.id}_repeat_${occurrenceDateKey}`,
            date: occurrenceDateKey,
            sourceId: appointment.id,
            isRecurringInstance: true
          });
        }

        occurrenceDate = addDays(occurrenceDate, intervalDays);
      }
    });

  return expandedAppointments.sort((first, second) => `${first.date} ${first.time}`.localeCompare(`${second.date} ${second.time}`));
}

function createDefaultAppointments(monthDate: Date): AppointmentRecord[] {
  void monthDate;
  return [];
}

function statusLabel(status: AppointmentStatus, labels: AppointmentLabels) {
  return status === "started" ? labels.started : status === "finished" ? labels.finished : status === "paid" ? labels.paid : labels.scheduled;
}

function statusTone(status: AppointmentStatus) {
  return status === "started" ? "yellow" : status === "finished" ? "green" : status === "paid" ? "teal" : "blue";
}

function recurrenceLabel(recurrence: string, labels: AppointmentLabels) {
  if (recurrence === "weekly") {
    return labels.recurrenceWeekly;
  }

  if (recurrence === "every_two_weeks") {
    return labels.recurrenceEveryTwoWeeks;
  }

  if (recurrence === "every_three_weeks") {
    return labels.recurrenceEveryThreeWeeks;
  }

  if (recurrence === "every_four_weeks") {
    return labels.recurrenceEveryFourWeeks;
  }

  if (recurrence === "custom") {
    return labels.recurrenceCustom;
  }

  return "";
}

function recurrenceTone(recurrence: string) {
  if (recurrence === "weekly") {
    return "teal";
  }

  if (recurrence === "every_two_weeks") {
    return "blue";
  }

  if (recurrence === "every_three_weeks") {
    return "purple";
  }

  if (recurrence === "every_four_weeks") {
    return "orange";
  }

  return "gray";
}

function recurrenceBorderClass(recurrence: string) {
  if (recurrence === "weekly") {
    return "border-l-4 border-l-teal-400";
  }

  if (recurrence === "every_two_weeks") {
    return "border-l-4 border-l-cyan-400";
  }

  if (recurrence === "every_three_weeks") {
    return "border-l-4 border-l-purple-400";
  }

  if (recurrence === "every_four_weeks") {
    return "border-l-4 border-l-orange-400";
  }

  return "border-slate-100";
}

function normalizeAppointments(records: AppointmentRecord[]) {
  return records.map((appointment) => ({
    ...appointment,
    extraServices: Array.isArray(appointment.extraServices) ? appointment.extraServices : [],
    durationMinutes: Number(appointment.durationMinutes || 180),
    recurrence: appointment.recurrence || "does_not_repeat",
    notes: appointment.notes || ""
  }));
}

function AppointmentForm({
  appointment,
  appointments,
  clients,
  labels,
  onOpenNewClient,
  onCancel,
  onCheckIn,
  onSubmit,
  title
}: {
  appointment: AppointmentRecord;
  appointments: AppointmentRecord[];
  clients: ClientRecord[];
  labels: AppointmentLabels;
  onOpenNewClient: () => void;
  onCancel: () => void;
  onCheckIn?: () => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  title: string;
}) {
  const [selectedExtraService, setSelectedExtraService] = useState("");
  const [selectedExtraServices, setSelectedExtraServices] = useState<string[]>(appointment.extraServices);
  const [selectedClientName, setSelectedClientName] = useState(appointment.client);
  const [selectedTime, setSelectedTime] = useState(appointment.time);
  const [selectedDurationMinutes, setSelectedDurationMinutes] = useState(appointment.durationMinutes);
  const [sentNotifications, setSentNotifications] = useState<string[]>([]);
  const [notificationError, setNotificationError] = useState("");
  const liveAppointment = { ...appointment, time: selectedTime, durationMinutes: selectedDurationMinutes };
  const hasConflict = appointmentHasConflict(liveAppointment, appointments);
  const teamOptions = ["Team A", "Team B", "Team C"];
  const selectedClient = clients.find((client) => client.name === selectedClientName);
  const notificationRows = [
    { key: "appointment", label: labels.appointmentNotice },
    { key: "arrival", label: labels.arrivalNotice },
    { key: "departure", label: labels.departureNotice },
    { key: "invoice", label: labels.invoiceNotice }
  ];

  function addExtraService() {
    if (!selectedExtraService || selectedExtraServices.includes(selectedExtraService)) {
      return;
    }

    setSelectedExtraServices((items) => [...items, selectedExtraService]);
    setSelectedExtraService("");
  }

  function markNotificationSent(key: string, channel: "sms" | "email") {
    if (!selectedClient) {
      setNotificationError(labels.selectClientFirst);
      return;
    }

    if (channel === "sms" && !selectedClient.phone) {
      setNotificationError(labels.smsMissing);
      return;
    }

    if (channel === "email" && !selectedClient.email) {
      setNotificationError(labels.emailMissing);
      return;
    }

    if (channel === "sms" && !selectedClient.wantsSms) {
      setNotificationError(labels.smsOptInMissing);
      return;
    }

    if (channel === "email" && !selectedClient.wantsEmail) {
      setNotificationError(labels.emailOptInMissing);
      return;
    }

    setNotificationError("");
    setSentNotifications((items) => (items.includes(key) ? items : [...items, key]));
  }

  return (
    <Modal onClose={onCancel} title={title}>
      <form className="grid min-w-0 gap-5" onSubmit={onSubmit}>
        <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          <label className={fieldLabelClass}>
            {labels.client}
            <select className={selectClass} key={appointment.client} name="client" onChange={(event) => setSelectedClientName(event.target.value)} required value={selectedClientName}>
              <option value="">-</option>
              {clients.map((client) => (
                <option key={client.id} value={client.name}>{client.name}</option>
              ))}
            </select>
          </label>
          <Button className="whitespace-nowrap" onMouseDown={(event) => event.preventDefault()} onClick={onOpenNewClient} type="button" variant="secondary">
            <UserPlus className="h-4 w-4" />
            {labels.newClient}
          </Button>
        </div>

        <div className="grid min-w-0 gap-4 lg:grid-cols-2">
        <label className={fieldLabelClass}>
          {labels.team}
          <select className={selectClass} defaultValue={appointment.team} name="team" required>
            {teamOptions.map((team) => (
              <option key={team} value={team}>{team}</option>
            ))}
          </select>
        </label>
        <label className={fieldLabelClass}>
          {labels.service}
          <select className={selectClass} defaultValue={appointment.service} name="service" required>
            {defaultCleaningServiceTypes.filter((service) => service.active).map((service) => (
              <option key={service.id} value={service.name}>{service.name}</option>
            ))}
          </select>
        </label>
        <Input defaultValue={appointment.price} label={labels.price} name="price" />
        <Input defaultValue={appointment.date} label={labels.date} name="date" type="date" required />
        <Input
          defaultValue={appointment.time}
          label={labels.time}
          name="time"
          onBlur={(event) => {
            const normalizedTime = normalizeTimeInput(event.target.value);
            event.target.value = normalizedTime;
            setSelectedTime(normalizedTime);
          }}
          onChange={(event) => setSelectedTime(normalizeTimeInput(event.target.value))}
          placeholder="15:00"
          required
        />
        <label className={fieldLabelClass}>
          {labels.duration}
          <select className={selectClass} defaultValue={appointment.durationMinutes} name="durationMinutes" onChange={(event) => setSelectedDurationMinutes(Number(event.target.value))}>
            {[60, 90, 120, 150, 180, 210, 240, 300, 360, 420, 480].map((minutes) => (
              <option key={minutes} value={minutes}>{minutes / 60}h</option>
            ))}
          </select>
        </label>
        <div className="rounded-lg border border-cyan-100 bg-cyan-50/50 p-3 text-sm font-bold text-cyan-800">
          {labels.endsAt}: {appointmentEndTime(liveAppointment)} · {labels.bufferTime}
        </div>
        <label className={fieldLabelClass}>
          {labels.recurrence}
          <select className={selectClass} defaultValue={appointment.recurrence} name="recurrence">
            <option value="does_not_repeat">{labels.recurrenceDoesNotRepeat}</option>
            <option value="weekly">{labels.recurrenceWeekly}</option>
            <option value="every_two_weeks">{labels.recurrenceEveryTwoWeeks}</option>
            <option value="every_three_weeks">{labels.recurrenceEveryThreeWeeks}</option>
            <option value="every_four_weeks">{labels.recurrenceEveryFourWeeks}</option>
            <option value="custom">{labels.recurrenceCustom}</option>
          </select>
        </label>
        <label className={fieldLabelClass}>
          {labels.status}
          <select className={selectClass} defaultValue={appointment.status} name="status">
            <option value="scheduled">{labels.scheduled}</option>
            <option value="started">{labels.started}</option>
            <option value="finished">{labels.finished}</option>
            <option value="paid">{labels.paid}</option>
          </select>
        </label>
        </div>

        {hasConflict ? (
          <p className="rounded-xl bg-red-50 p-3 text-sm font-black text-red-700 ring-1 ring-red-100">{labels.scheduleConflict}</p>
        ) : null}

        <div className="flex flex-wrap gap-2 rounded-xl border border-slate-100 bg-white p-3 shadow-sm">
          <Button type="submit">{appointment.id.startsWith("new_") ? labels.saveAppointment : labels.saveChanges}</Button>
          <Button onClick={onCancel} type="button" variant="outline">
            {labels.cancel}
          </Button>
        </div>

        <section className="grid gap-3 rounded-xl border border-slate-100 bg-slate-50 p-4">
          <h3 className="text-sm font-black text-slate-950">{labels.extraServices}</h3>
          <div className="grid gap-3 lg:grid-cols-[1fr_auto] lg:items-end">
            <label className={fieldLabelClass}>
              {labels.extraServices}
              <select className={selectClass} onChange={(event) => setSelectedExtraService(event.target.value)} value={selectedExtraService}>
                <option value="">-</option>
                {defaultExtraServices.filter((service) => service.active && !selectedExtraServices.includes(service.name)).map((service) => (
                  <option key={service.id} value={service.name}>{service.name} · {service.price}</option>
                ))}
              </select>
            </label>
            <Button onClick={addExtraService} type="button" variant="outline">
              <Plus className="h-4 w-4" />
              {labels.extraServices}
            </Button>
          </div>
          <div className="grid gap-2">
            {selectedExtraServices.length === 0 ? <p className="rounded-lg bg-white p-3 text-sm font-bold text-slate-400 ring-1 ring-slate-100">{labels.noExtraServices}</p> : null}
            {selectedExtraServices.map((serviceName) => (
              <div className="flex items-center gap-3 rounded-lg bg-white p-3 text-sm font-bold text-slate-700 ring-1 ring-slate-100" key={serviceName}>
                <span className="flex-1">{serviceName}</span>
                <input name="extraServices" type="hidden" value={serviceName} />
                <Button onClick={() => setSelectedExtraServices((items) => items.filter((item) => item !== serviceName))} type="button" variant="danger">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </section>

        <section className="grid gap-3 rounded-xl border border-cyan-100 bg-cyan-50/40 p-4">
          <div>
            <h3 className="text-sm font-black text-slate-950">{labels.communication}</h3>
            {!selectedClient || (!selectedClient.wantsSms && !selectedClient.wantsEmail) ? (
              <p className="mt-1 text-xs font-bold text-slate-500">{labels.clientCommunicationUnavailable}</p>
            ) : null}
            {selectedClient ? (
              <p className="mt-1 text-xs font-bold text-slate-500">
                {labels.sms}: {selectedClient.phone || "-"} · {labels.email}: {selectedClient.email || "-"}
              </p>
            ) : null}
            {notificationError ? <p className="mt-2 rounded-lg bg-red-50 p-2 text-xs font-black text-red-700 ring-1 ring-red-100">{notificationError}</p> : null}
          </div>
          <div className="grid gap-2">
            {notificationRows.map((row) => (
              <div className="grid gap-3 rounded-lg bg-white p-3 ring-1 ring-cyan-100 sm:grid-cols-[1fr_auto] sm:items-center" key={row.key}>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-black text-slate-800">{row.label}</span>
                  {sentNotifications.includes(`${row.key}:sms`) || sentNotifications.includes(`${row.key}:email`) ? <Badge tone="green">{labels.notificationSent}</Badge> : null}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button onClick={() => markNotificationSent(`${row.key}:sms`, "sms")} type="button" variant="outline">
                    <MessageSquare className="h-4 w-4" />
                    {labels.sms}
                  </Button>
                  <Button onClick={() => markNotificationSent(`${row.key}:email`, "email")} type="button" variant="outline">
                    <Mail className="h-4 w-4" />
                    {labels.email}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </section>

        <label className={fieldLabelClass}>
          {labels.notes}
          <textarea className="min-h-24 w-full min-w-0 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-primary focus:ring-4 focus:ring-cyan-100" defaultValue={appointment.notes} name="notes" />
        </label>

        <div className="flex flex-wrap gap-2">
          <Button type="submit">{appointment.id.startsWith("new_") ? labels.saveAppointment : labels.saveChanges}</Button>
          {onCheckIn ? (
            <Button onClick={onCheckIn} type="button" variant="secondary">
              <CalendarCheck className="h-4 w-4" />
              {labels.checkIn}
            </Button>
          ) : null}
          <Button onClick={onCancel} type="button" variant="outline">
            {labels.cancel}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function buildClientFromFormData(formData: FormData): ClientRecord {
  return {
    id: `client_${Date.now()}`,
    name: String(formData.get("name") ?? ""),
    phone: String(formData.get("phone") ?? ""),
    email: String(formData.get("email") ?? ""),
    nickname: String(formData.get("nickname") ?? ""),
    birthday: String(formData.get("birthday") ?? ""),
    property: String(formData.get("property") ?? ""),
    tag: String(formData.get("tag") ?? "New"),
    wantsSms: formData.get("wantsSms") === "on",
    wantsEmail: formData.get("wantsEmail") === "on",
    leadProfile: String(formData.get("leadProfile") ?? ""),
    leadSource: String(formData.get("leadSource") ?? "Appointment"),
    referralClientId: String(formData.get("referralClientId") ?? ""),
    joinedDate: String(formData.get("joinedDate") || formatDateKey(new Date())),
    primaryPaymentMethod: String(formData.get("primaryPaymentMethod") ?? ""),
    secondaryPaymentMethod: String(formData.get("secondaryPaymentMethod") ?? ""),
    paymentNotes: String(formData.get("paymentNotes") ?? ""),
    addresses: [
      {
        label: String(formData.get("addressLabel0") ?? ""),
        street: String(formData.get("street0") ?? ""),
        city: String(formData.get("city0") ?? ""),
        state: String(formData.get("state0") ?? ""),
        postalCode: String(formData.get("postalCode0") ?? ""),
        notes: String(formData.get("addressNotes0") ?? ""),
        formatted: String(formData.get("formatted0") ?? ""),
        latitude: String(formData.get("latitude0") ?? ""),
        longitude: String(formData.get("longitude0") ?? ""),
        verified: formData.get("verified0") === "true"
      }
    ].filter((address) => address.label || address.street || address.city || address.state || address.postalCode || address.notes)
  };
}

export function AppointmentsManager({ clientLabels, labels, locale, month }: { clientLabels: ClientsLabels; labels: AppointmentLabels; locale: string; month?: string }) {
  const selectedMonth = parseMonth(month);
  const [appointments, setAppointments] = useState<AppointmentRecord[]>(createDefaultAppointments(selectedMonth));
  const [clients, setClients] = useState<ClientRecord[]>(defaultClients);
  const [draftAppointment, setDraftAppointment] = useState<AppointmentRecord | null>(null);
  const [pendingRecurringSave, setPendingRecurringSave] = useState<{ originalAppointment: AppointmentRecord; savedAppointment: AppointmentRecord } | null>(null);
  const [selectedDayKey, setSelectedDayKey] = useState<string | null>(null);
  const [showClientModal, setShowClientModal] = useState(false);
  const monthDays = createMonthDays(selectedMonth);
  const visibleAppointments = expandAppointmentsForMonth(appointments, selectedMonth);
  const selectedDayAppointments = selectedDayKey ? visibleAppointments.filter((appointment) => appointment.date === selectedDayKey) : [];
  const selectedDayLabel = selectedDayKey ? new Intl.DateTimeFormat(locale, { day: "numeric", month: "long", year: "numeric" }).format(parseDateKey(selectedDayKey)) : "";
  const monthTitle = new Intl.DateTimeFormat(locale, { month: "long", year: "numeric" }).format(selectedMonth);
  const weekdayLabels = Array.from({ length: 7 }, (_, index) => new Intl.DateTimeFormat(locale, { weekday: "short" }).format(new Date(2026, 1, index + 1)));
  const nextMonths = [0, 1, 2, 3].map((offset) => addMonths(selectedMonth, offset));

  function nextAvailableTime(date: string, team = "Team A") {
    const teamAppointments = visibleAppointments
      .filter((appointment) => appointment.date === date && appointment.team === team)
      .sort((first, second) => first.time.localeCompare(second.time));

    if (teamAppointments.length === 0) {
      return "08:30";
    }

    const lastAppointment = teamAppointments[teamAppointments.length - 1];
    return formatMinutesAsTime(parseTimeToMinutes(lastAppointment.time) + lastAppointment.durationMinutes + appointmentBufferMinutes);
  }

  useEffect(() => {
    setAppointments(normalizeAppointments(readLocalRecords(storageKey, createDefaultAppointments(selectedMonth))));
    setClients(readLocalRecords(clientsStorageKey, defaultClients));
  }, [month]);

  function openNewAppointment(date = formatDateKey(new Date())) {
    setSelectedDayKey(null);
    setDraftAppointment({
      id: `new_${Date.now()}`,
      date,
      time: nextAvailableTime(date),
      client: "",
      team: "Team A",
      service: "Regular Cleaning",
      extraServices: [],
      recurrence: "does_not_repeat",
      notes: "",
      status: "scheduled",
      price: "",
      durationMinutes: 180
    });
  }

  function addClientFromAppointment(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextClient = buildClientFromFormData(new FormData(event.currentTarget));
    const nextClients = [nextClient, ...clients];
    setClients(nextClients);
    writeLocalRecords(clientsStorageKey, nextClients);
    setDraftAppointment((appointment) => (appointment ? { ...appointment, client: nextClient.name } : appointment));
    setShowClientModal(false);
  }

  function saveAppointment(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draftAppointment) {
      return;
    }

    const formData = new FormData(event.currentTarget);
    const isNewAppointment = draftAppointment.id.startsWith("new_");
    const isRecurringEdit = Boolean(draftAppointment.isRecurringInstance || draftAppointment.sourceId);
    const savedAppointmentId = isNewAppointment
      ? `appt_${Date.now()}`
      : draftAppointment.id;
    const savedAppointment: AppointmentRecord = {
      ...draftAppointment,
      id: savedAppointmentId,
      client: String(formData.get("client") ?? ""),
      team: String(formData.get("team") ?? ""),
      service: String(formData.get("service") ?? ""),
      extraServices: formData.getAll("extraServices").map(String),
      recurrence: String(formData.get("recurrence") ?? "does_not_repeat"),
      notes: String(formData.get("notes") ?? ""),
      price: String(formData.get("price") ?? ""),
      date: String(formData.get("date") ?? ""),
      time: normalizeTimeInput(String(formData.get("time") ?? "")),
      durationMinutes: Number(formData.get("durationMinutes") || 180),
      status: String(formData.get("status") ?? "scheduled") as AppointmentStatus
    };

    if (isRecurringEdit && (savedAppointment.date !== draftAppointment.date || savedAppointment.time !== draftAppointment.time)) {
      setPendingRecurringSave({ originalAppointment: draftAppointment, savedAppointment });
      return;
    }

    commitAppointmentSave(draftAppointment, savedAppointment, "single");
  }

  function commitAppointmentSave(originalAppointment: AppointmentRecord, savedAppointment: AppointmentRecord, scope: "single" | "following") {
    const isNewAppointment = originalAppointment.id.startsWith("new_");
    const isRecurringEdit = Boolean(originalAppointment.isRecurringInstance || originalAppointment.sourceId);
    const appointmentAlreadyExists = appointments.some((appointment) => appointment.id === savedAppointment.id);
    const sourceId = originalAppointment.sourceId ?? originalAppointment.id.split("_repeat_")[0];

    let nextAppointments: AppointmentRecord[];

    if (scope === "following" && isRecurringEdit) {
      const seriesAppointment = { ...savedAppointment, id: sourceId, sourceId: undefined, originalDate: undefined, isRecurringInstance: false };
      const filteredAppointments = appointments.filter((appointment) => !(appointment.sourceId === sourceId && parseDateKey(appointment.date) >= parseDateKey(savedAppointment.date)));
      nextAppointments = filteredAppointments.some((appointment) => appointment.id === sourceId)
        ? filteredAppointments.map((appointment) => (appointment.id === sourceId ? seriesAppointment : appointment))
        : [seriesAppointment, ...filteredAppointments];
    } else {
      const occurrenceOverride = { ...savedAppointment, sourceId, originalDate: originalAppointment.date, isRecurringInstance: true };
      nextAppointments = isNewAppointment
        ? [savedAppointment, ...appointments]
        : isRecurringEdit && !appointmentAlreadyExists
          ? [occurrenceOverride, ...appointments]
          : appointments.map((appointment) => (appointment.id === savedAppointment.id ? savedAppointment : appointment));
    }

    setAppointments(nextAppointments);
    writeLocalRecords(storageKey, nextAppointments);
    setPendingRecurringSave(null);
    setDraftAppointment(null);
  }

  function checkIn(appointmentId: string) {
    const appointmentAlreadyExists = appointments.some((appointment) => appointment.id === appointmentId);
    const recurringAppointment = visibleAppointments.find((appointment) => appointment.id === appointmentId);
    const nextAppointments = appointmentAlreadyExists
      ? appointments.map((appointment) => (appointment.id === appointmentId ? { ...appointment, status: "started" as const } : appointment))
      : recurringAppointment
        ? [{ ...recurringAppointment, sourceId: recurringAppointment.sourceId ?? recurringAppointment.id.split("_repeat_")[0], isRecurringInstance: true, status: "started" as const }, ...appointments]
        : appointments;
    setAppointments(nextAppointments);
    writeLocalRecords(storageKey, nextAppointments);
    setDraftAppointment(nextAppointments.find((appointment) => appointment.id === appointmentId) ?? null);
  }

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {[labels.scheduled, labels.started, labels.finished, labels.paid].map((label) => (
            <Badge key={label} tone="gray">{label}</Badge>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => openNewAppointment()} type="button">
            <Plus className="h-4 w-4" />
            {labels.newAppointment}
          </Button>
          <Button variant="outline">
            <MapPinned className="h-4 w-4" />
            {labels.routeOfTheDay}
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="grid gap-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">{labels.scheduledCleanings}</p>
              <h2 className="mt-1 text-2xl font-black capitalize text-slate-950">{monthTitle}</h2>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link aria-label={labels.previousMonth} className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:border-cyan-200 hover:bg-cyan-50" href={`/${locale}/appointments?month=${monthKey(addMonths(selectedMonth, -1))}`}>
                <ChevronLeft className="h-4 w-4" />
              </Link>
              {nextMonths.map((item) => (
                <Link className={`rounded-xl border px-4 py-2 text-sm font-black capitalize transition ${monthKey(item) === monthKey(selectedMonth) ? "border-cyan-200 bg-cyan-50 text-cyan-700" : "border-slate-200 bg-white text-slate-600 hover:border-cyan-200 hover:bg-cyan-50"}`} href={`/${locale}/appointments?month=${monthKey(item)}`} key={monthKey(item)}>
                  {new Intl.DateTimeFormat(locale, { month: "short" }).format(item)}
                </Link>
              ))}
              <Link aria-label={labels.nextMonth} className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:border-cyan-200 hover:bg-cyan-50" href={`/${locale}/appointments?month=${monthKey(addMonths(selectedMonth, 1))}`}>
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
          </div>

          <div className="overflow-x-auto pb-2">
            <div className="grid min-w-[760px] grid-cols-7 gap-2">
              {weekdayLabels.map((weekday) => (
                <div className="px-2 py-2 text-center text-xs font-black uppercase tracking-wide text-slate-400" key={weekday}>{weekday}</div>
              ))}
              {monthDays.map((day, index) => {
                const dayAppointments = day ? visibleAppointments.filter((appointment) => appointment.date === formatDateKey(day)) : [];
                if (!day) {
                  return <div aria-hidden="true" className="min-h-36 rounded-xl border border-transparent p-2" key={`empty-${index}`} />;
                }

                const dayKey = formatDateKey(day);
                return (
                  <div
                    className="min-h-36 rounded-xl border border-slate-100 bg-slate-50/70 p-2 text-left transition hover:border-cyan-100 hover:bg-cyan-50/30 focus:outline-none focus:ring-4 focus:ring-cyan-100"
                    key={dayKey}
                    onClick={() => setSelectedDayKey(dayKey)}
                    onDoubleClick={() => openNewAppointment(dayKey)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        setSelectedDayKey(dayKey);
                      }
                    }}
                    role="button"
                    tabIndex={0}
                  >
                    <p className="text-sm font-black text-slate-700">{day.getDate()}</p>
                    <div className="mt-2 grid gap-1.5">
                      {dayAppointments.map((appointment) => (
                        <div className={`rounded-lg border bg-white p-2 shadow-sm ${recurrenceBorderClass(appointment.recurrence)}`} key={appointment.id}>
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-[11px] font-black text-slate-500">{appointmentTimeRange(appointment)}</span>
                            <span className="text-[11px] font-black text-slate-900">{appointment.price}</span>
                          </div>
                          <span className="mt-1 block truncate text-xs font-black text-primary" onClick={(event) => { event.stopPropagation(); setDraftAppointment(appointment); }}>
                            {appointment.client}
                          </span>
                          <p className="truncate text-[11px] font-bold text-slate-400">{appointment.team}</p>
                          <div className="mt-1 flex flex-wrap gap-1">
                            <Badge tone={statusTone(appointment.status)}>{statusLabel(appointment.status, labels)}</Badge>
                            {appointmentHasConflict(appointment, dayAppointments) ? <Badge tone="red">{labels.scheduleConflict}</Badge> : null}
                            {recurrenceLabel(appointment.recurrence, labels) ? (
                              <Badge tone={recurrenceTone(appointment.recurrence)}>{recurrenceLabel(appointment.recurrence, labels)}</Badge>
                            ) : null}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="text-base font-black text-slate-950">{labels.scheduledCleanings}</h2>
        </CardHeader>
        <CardContent>
          <Table>
            <thead>
              <tr>
                <Th>{labels.client}</Th>
                <Th>{labels.team}</Th>
                <Th>{labels.service}</Th>
                <Th>{labels.time}</Th>
                <Th>{labels.recurrence}</Th>
                <Th>{labels.status}</Th>
              </tr>
            </thead>
            <tbody>
              {visibleAppointments.slice(0, 6).map((appointment) => (
                <tr className="cursor-pointer transition hover:bg-cyan-50/30" key={appointment.id} onClick={() => setDraftAppointment(appointment)}>
                  <Td><span className="font-black text-slate-950">{appointment.client}</span></Td>
                  <Td>{appointment.team}</Td>
                  <Td>{appointment.service}</Td>
                  <Td><span className="font-black text-slate-950">{appointmentTimeRange(appointment)}</span></Td>
                  <Td>
                    {recurrenceLabel(appointment.recurrence, labels) ? (
                      <Badge tone={recurrenceTone(appointment.recurrence)}>{recurrenceLabel(appointment.recurrence, labels)}</Badge>
                    ) : (
                      <span className="text-slate-400">-</span>
                    )}
                  </Td>
                  <Td><Badge tone={statusTone(appointment.status)}>{statusLabel(appointment.status, labels)}</Badge></Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </CardContent>
      </Card>

      {selectedDayKey ? (
        <div className="fixed inset-0 z-40 flex justify-end bg-slate-950/20 backdrop-blur-sm" onClick={() => setSelectedDayKey(null)}>
          <aside className="h-full w-full max-w-md overflow-y-auto border-l border-slate-200 bg-white p-5 shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">{selectedDayLabel}</p>
                <h2 className="mt-1 text-xl font-black text-slate-950">{selectedDayAppointments.length} {labels.scheduledCleanings}</h2>
              </div>
              <button className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200 text-slate-500 transition hover:border-cyan-200 hover:bg-cyan-50 hover:text-primary" onClick={() => setSelectedDayKey(null)} type="button">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-5 grid gap-3">
              {selectedDayAppointments.map((appointment) => (
                <button
                  className={`rounded-xl border bg-white p-4 text-left shadow-sm transition hover:border-cyan-200 hover:bg-cyan-50/40 ${recurrenceBorderClass(appointment.recurrence)}`}
                  key={appointment.id}
                  onClick={() => {
                    setDraftAppointment(appointment);
                    setSelectedDayKey(null);
                  }}
                  type="button"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-black text-slate-950">{appointment.client}</p>
                      <p className="mt-1 text-xs font-bold text-slate-500">{appointment.service} · {appointment.team}</p>
                    </div>
                    <span className="text-sm font-black text-slate-950">{appointment.price}</span>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <Badge tone="gray">{appointmentTimeRange(appointment)}</Badge>
                    <Badge tone={statusTone(appointment.status)}>{statusLabel(appointment.status, labels)}</Badge>
                    {appointmentHasConflict(appointment, selectedDayAppointments) ? <Badge tone="red">{labels.scheduleConflict}</Badge> : null}
                    {recurrenceLabel(appointment.recurrence, labels) ? (
                      <Badge tone={recurrenceTone(appointment.recurrence)}>{recurrenceLabel(appointment.recurrence, labels)}</Badge>
                    ) : null}
                  </div>
                </button>
              ))}
              {selectedDayAppointments.length === 0 ? (
                <button className="rounded-xl border border-dashed border-cyan-200 bg-cyan-50/50 p-5 text-left text-sm font-black text-primary" onClick={() => openNewAppointment(selectedDayKey)} type="button">
                  {labels.newAppointment}
                </button>
              ) : null}
            </div>
          </aside>
        </div>
      ) : null}

      {draftAppointment ? (
        <AppointmentForm
          appointment={draftAppointment}
          appointments={visibleAppointments}
          clients={clients}
          labels={labels}
          onOpenNewClient={() => setShowClientModal(true)}
          onCancel={() => setDraftAppointment(null)}
          onCheckIn={draftAppointment.id.startsWith("new_") ? undefined : () => checkIn(draftAppointment.id)}
          onSubmit={saveAppointment}
          title={draftAppointment.id.startsWith("new_") ? labels.newAppointment : labels.editAppointment}
        />
      ) : null}
      {pendingRecurringSave ? (
        <Modal onClose={() => setPendingRecurringSave(null)} title={labels.changeRecurringTitle}>
          <div className="grid gap-4">
            <p className="text-sm font-bold text-slate-600">{labels.changeRecurringDescription}</p>
            <div className="grid gap-2 sm:grid-cols-2">
              <Button onClick={() => commitAppointmentSave(pendingRecurringSave.originalAppointment, pendingRecurringSave.savedAppointment, "single")} type="button" variant="outline">
                {labels.changeRecurringOnly}
              </Button>
              <Button onClick={() => commitAppointmentSave(pendingRecurringSave.originalAppointment, pendingRecurringSave.savedAppointment, "following")} type="button">
                {labels.changeRecurringFollowing}
              </Button>
            </div>
          </div>
        </Modal>
      ) : null}
      {showClientModal ? (
        <Modal onClose={() => setShowClientModal(false)} title={clientLabels.addClient}>
          <ClientForm
            clients={clients}
            client={null}
            labels={clientLabels}
            mode="create"
            onCancel={() => setShowClientModal(false)}
            onSubmit={addClientFromAppointment}
          />
        </Modal>
      ) : null}
    </div>
  );
}
