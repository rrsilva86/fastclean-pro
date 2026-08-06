"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { CalendarCheck, ChevronLeft, ChevronRight, Clock3, FilterX, Mail, MapPin, MapPinned, MessageSquare, Plus, Trash2, UserPlus, X } from "lucide-react";
import { Badge, Button, Card, CardContent, CardHeader, Input, Modal, Table, Td, Th } from "@/components/design-system";
import { readLocalRecords, readRemoteRecords, writeLocalRecords } from "@/lib/storage/local-records";
import { defaultClients, type ClientRecord } from "@/modules/clients/types";
import { ClientForm, type ClientsLabels } from "@/modules/clients/clients-manager";
import { defaultCleaningServiceTypes, defaultExtraServices } from "@/modules/services/types";
import { defaultAppointmentMessageTemplates, type AppointmentMessageTemplateKey, type AppointmentMessageTemplates } from "@/lib/highlevel/message-templates";

type AppointmentStatus = "scheduled" | "awaiting_confirmation" | "confirmed" | "in_progress" | "completed" | "cancelled" | "no_show" | "started" | "finished" | "paid" | "canceled";
type CalendarView = "month" | "week" | "day" | "agenda";

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
  clientId?: string;
  source?: string;
  legacySource?: string;
  legacyRecurrenceLabel?: string | null;
  migrationBatchId?: string;
  originalDate?: string;
  sourceId?: string;
  isRecurringInstance?: boolean;
};

type AppointmentLabels = {
  cancel: string;
  canceled: string;
  awaitingConfirmation: string;
  confirmed: string;
  inProgress: string;
  completed: string;
  cancelled: string;
  noShow: string;
  checkIn: string;
  client: string;
  clientCommunicationUnavailable: string;
  communication: string;
  date: string;
  deleteAppointment: string;
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
  agenda: string;
  allTeams: string;
  allServices: string;
  allStatuses: string;
  allRecurrences: string;
  clearFilters: string;
  customerSearch: string;
  dayView: string;
  weekView: string;
  monthView: string;
  agendaView: string;
  servicePrice: string;
  estimatedDuration: string;
  assignedTeam: string;
  address: string;
  payment: string;
  invoice: string;
  communicationStatus: string;
  notSent: string;
  paidLabel: string;
  noInvoice: string;
  openAppointment: string;
  detailsPreview: string;
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
  notificationFailed: string;
  notificationSending: string;
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
const settingsStorageKey = "fastclean_system_settings";
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
  if (!appointment.durationMinutes) {
    return "";
  }

  return formatMinutesAsTime(parseTimeToMinutes(appointment.time) + appointment.durationMinutes);
}

function appointmentTimeRange(appointment: AppointmentRecord) {
  if (!appointment.durationMinutes) {
    return appointment.time;
  }

  return `${appointment.time} - ${appointmentEndTime(appointment)}`;
}

function formatAppointmentTime(value: string) {
  const normalized = normalizeTimeInput(value);
  const [hours, minutes] = normalized.split(":").map(Number);
  const period = hours >= 12 ? "PM" : "AM";
  const displayHours = hours % 12 || 12;
  return `${displayHours}:${String(minutes).padStart(2, "0")} ${period}`;
}

function formatAppointmentTimeRange(appointment: AppointmentRecord) {
  if (!appointment.durationMinutes) {
    return formatAppointmentTime(appointment.time);
  }

  return `${formatAppointmentTime(appointment.time)} - ${formatAppointmentTime(appointmentEndTime(appointment))}`;
}

function appointmentHasConflict(appointment: AppointmentRecord, appointments: AppointmentRecord[]) {
  if (!appointment.durationMinutes || !appointment.team) {
    return false;
  }

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

function normalizedStatus(status: AppointmentStatus): AppointmentStatus {
  if (status === "started") {
    return "in_progress";
  }

  if (status === "finished" || status === "paid") {
    return "completed";
  }

  if (status === "canceled") {
    return "cancelled";
  }

  return status;
}

function statusLabel(status: AppointmentStatus, labels: AppointmentLabels) {
  const statusKey = normalizedStatus(status);
  if (statusKey === "awaiting_confirmation") {
    return labels.awaitingConfirmation;
  }

  if (statusKey === "confirmed") {
    return labels.confirmed;
  }

  if (statusKey === "in_progress") {
    return labels.inProgress;
  }

  if (statusKey === "completed") {
    return labels.completed;
  }

  if (statusKey === "cancelled") {
    return labels.cancelled;
  }

  if (statusKey === "no_show") {
    return labels.noShow;
  }

  return labels.scheduled;
}

function statusTone(status: AppointmentStatus) {
  const statusKey = normalizedStatus(status);
  return statusKey === "awaiting_confirmation" ? "yellow" : statusKey === "confirmed" ? "green" : statusKey === "in_progress" ? "teal" : statusKey === "completed" ? "green" : statusKey === "cancelled" || statusKey === "no_show" ? "red" : "blue";
}

function statusBorderClass(status: AppointmentStatus) {
  const statusKey = normalizedStatus(status);
  if (statusKey === "awaiting_confirmation") {
    return "border-l-yellow-400";
  }

  if (statusKey === "confirmed" || statusKey === "completed") {
    return "border-l-green-400";
  }

  if (statusKey === "in_progress") {
    return "border-l-teal-400";
  }

  if (statusKey === "cancelled" || statusKey === "no_show") {
    return "border-l-red-400";
  }

  return "border-l-cyan-400";
}

function statusDotClass(status: AppointmentStatus) {
  const statusKey = normalizedStatus(status);
  if (statusKey === "awaiting_confirmation") {
    return "bg-yellow-400";
  }

  if (statusKey === "confirmed" || statusKey === "completed") {
    return "bg-green-500";
  }

  if (statusKey === "in_progress") {
    return "bg-teal-500";
  }

  if (statusKey === "cancelled" || statusKey === "no_show") {
    return "bg-red-500";
  }

  return "bg-cyan-500";
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

function compactRecurrenceLabel(recurrence: string) {
  if (recurrence === "weekly") {
    return "W";
  }

  if (recurrence === "every_two_weeks") {
    return "2W";
  }

  if (recurrence === "every_three_weeks") {
    return "3W";
  }

  if (recurrence === "every_four_weeks") {
    return "4W";
  }

  if (recurrence === "monthly") {
    return "M";
  }

  if (recurrence === "custom") {
    return "*";
  }

  return "";
}

function appointmentCompactRecurrenceLabel(appointment: AppointmentRecord) {
  return appointment.legacyRecurrenceLabel || compactRecurrenceLabel(appointment.recurrence);
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
    durationMinutes: Number(appointment.durationMinutes ?? 180),
    recurrence: appointment.recurrence || "does_not_repeat",
    notes: appointment.notes || "",
    status: normalizedStatus(appointment.status)
  }));
}

function readAppointmentMessageTemplates() {
  if (typeof window === "undefined") {
    return defaultAppointmentMessageTemplates;
  }

  try {
    const sessionToken = decodeURIComponent(document.cookie.split("; ").find((item) => item.startsWith("fastclean_session="))?.split("=")[1] ?? "");
    const scopedKey = sessionToken ? `${sessionToken}:${settingsStorageKey}` : settingsStorageKey;
    const settings = JSON.parse(window.localStorage.getItem(scopedKey) ?? "{}") as { appointmentMessageTemplates?: Partial<AppointmentMessageTemplates> };
    return { ...defaultAppointmentMessageTemplates, ...settings.appointmentMessageTemplates };
  } catch {
    return defaultAppointmentMessageTemplates;
  }
}

function AppointmentForm({
  appointment,
  appointments,
  clients,
  labels,
  onOpenNewClient,
  onCancel,
  onCheckIn,
  onDelete,
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
  onDelete?: () => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  title: string;
}) {
  const [selectedExtraService, setSelectedExtraService] = useState("");
  const [selectedExtraServices, setSelectedExtraServices] = useState<string[]>(appointment.extraServices);
  const [selectedClientName, setSelectedClientName] = useState(appointment.client);
  const [selectedTime, setSelectedTime] = useState(appointment.time);
  const [selectedDurationMinutes, setSelectedDurationMinutes] = useState(appointment.durationMinutes);
  const [sentNotifications, setSentNotifications] = useState<string[]>([]);
  const [sendingNotifications, setSendingNotifications] = useState<string[]>([]);
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

  async function markNotificationSent(key: AppointmentMessageTemplateKey, channel: "sms" | "email") {
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

    if (channel === "sms") {
      const notificationKey = `${key}:sms`;
      const templates = readAppointmentMessageTemplates();
      setNotificationError("");
      setSendingNotifications((items) => (items.includes(notificationKey) ? items : [...items, notificationKey]));

      const response = await fetch("/api/highlevel/appointment-sms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: key,
          template: templates[key],
          companyName: "FastClean Pro",
          client: {
            id: selectedClient.id,
            name: selectedClient.name,
            displayName: selectedClient.displayName,
            companyName: selectedClient.companyName,
            phone: selectedClient.phone,
            email: selectedClient.email,
            addresses: selectedClient.addresses
          },
          appointment: {
            date: appointment.date,
            time: appointment.time,
            team: appointment.team,
            service: appointment.service,
            price: appointment.price
          }
        })
      });

      setSendingNotifications((items) => items.filter((item) => item !== notificationKey));

      if (!response.ok) {
        setNotificationError(labels.notificationFailed);
        return;
      }

      setSentNotifications((items) => (items.includes(notificationKey) ? items : [...items, notificationKey]));
      return;
    }

    setNotificationError("");
    setSentNotifications((items) => (items.includes(`${key}:email`) ? items : [...items, `${key}:email`]));
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
        {appointmentEndTime(liveAppointment) ? (
          <div className="rounded-lg border border-cyan-100 bg-cyan-50/50 p-3 text-sm font-bold text-cyan-800">
            {labels.endsAt}: {appointmentEndTime(liveAppointment)} · {labels.bufferTime}
          </div>
        ) : null}
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
            <option value="awaiting_confirmation">{labels.awaitingConfirmation}</option>
            <option value="confirmed">{labels.confirmed}</option>
            <option value="in_progress">{labels.inProgress}</option>
            <option value="completed">{labels.completed}</option>
            <option value="cancelled">{labels.cancelled}</option>
            <option value="no_show">{labels.noShow}</option>
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
          {onDelete ? (
            <Button onClick={onDelete} type="button" variant="danger">
              <Trash2 className="h-4 w-4" />
              {labels.deleteAppointment}
            </Button>
          ) : null}
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
                  {sendingNotifications.includes(`${row.key}:sms`) ? <Badge tone="yellow">{labels.notificationSending}</Badge> : null}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button disabled={sendingNotifications.includes(`${row.key}:sms`)} onClick={() => markNotificationSent(row.key as AppointmentMessageTemplateKey, "sms")} type="button" variant="outline">
                    <MessageSquare className="h-4 w-4" />
                    {labels.sms}
                  </Button>
                  <Button onClick={() => markNotificationSent(row.key as AppointmentMessageTemplateKey, "email")} type="button" variant="outline">
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

function clientPrimaryAddress(client: ClientRecord | undefined) {
  const address = client?.addresses?.[0];
  if (!address) {
    return "";
  }

  return address.formatted || [address.street, address.city, address.state, address.postalCode].filter(Boolean).join(", ");
}

function clientPropertySize(client: ClientRecord | undefined) {
  const property = client?.property ?? "";
  const match = property.match(/(\d[\d,.\s]*)\s*(sqft|ft²|sf)/i);
  return match ? `${match[1].trim()} sqft` : "";
}

function appointmentMatchesFilter(appointment: AppointmentRecord, client: ClientRecord | undefined, filters: { search: string; team: string; service: string; status: string; recurrence: string }) {
  const search = filters.search.trim().toLowerCase();
  const address = clientPrimaryAddress(client).toLowerCase();

  if (filters.team && appointment.team !== filters.team) {
    return false;
  }

  if (filters.service && appointment.service !== filters.service) {
    return false;
  }

  if (filters.status && normalizedStatus(appointment.status) !== filters.status) {
    return false;
  }

  if (filters.recurrence && appointment.recurrence !== filters.recurrence) {
    return false;
  }

  if (search && !`${appointment.client} ${appointment.service} ${appointment.team} ${address}`.toLowerCase().includes(search)) {
    return false;
  }

  return true;
}

function AppointmentHoverCard({ appointment, client, labels, onClose, onOpen }: { appointment: AppointmentRecord; client?: ClientRecord; labels: AppointmentLabels; onClose: () => void; onOpen: () => void }) {
  const address = clientPrimaryAddress(client);
  const propertySize = clientPropertySize(client);
  const recurrence = recurrenceLabel(appointment.recurrence, labels);

  useEffect(() => {
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);

  return (
    <div className="absolute left-0 top-full z-30 mt-2 w-[min(22rem,80vw)] rounded-xl border border-slate-200 bg-white p-4 text-left shadow-2xl ring-1 ring-slate-950/5 md:left-auto md:right-0">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-black text-slate-950">{appointment.client}</p>
          <p className="mt-1 text-xs font-bold text-slate-500">
            {appointment.service}{propertySize ? ` · ${propertySize}` : ""}
          </p>
        </div>
        <Badge tone={statusTone(appointment.status)}>{statusLabel(appointment.status, labels)}</Badge>
      </div>

      <div className="mt-4 grid gap-2 text-xs font-bold text-slate-600">
        {address ? (
          <DetailRow icon={<MapPin className="h-3.5 w-3.5" />} label={labels.address} value={address} />
        ) : null}
        {appointment.price ? <DetailRow label={labels.servicePrice} value={appointment.price} /> : null}
        <DetailRow icon={<Clock3 className="h-3.5 w-3.5" />} label={labels.time} value={formatAppointmentTimeRange(appointment)} />
        {appointment.durationMinutes ? <DetailRow label={labels.estimatedDuration} value={`${appointment.durationMinutes / 60}h`} /> : null}
        {appointment.team ? <DetailRow label={labels.assignedTeam} value={appointment.team} /> : null}
        {recurrence ? <DetailRow label={labels.recurrence} value={recurrence} /> : null}
        {appointment.notes ? <DetailRow label={labels.notes} value={appointment.notes} /> : null}
        <DetailRow label={labels.communicationStatus} value={labels.notSent} />
        <DetailRow label={labels.invoice} value={labels.noInvoice} />
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Button onClick={onOpen} type="button" variant="outline">{labels.openAppointment}</Button>
      </div>
    </div>
  );
}

function DetailRow({ icon, label, value }: { icon?: React.ReactNode; label: string; value: string }) {
  return (
    <div className="grid grid-cols-[auto_1fr] gap-2 rounded-lg bg-slate-50 px-3 py-2">
      <span className="mt-0.5 text-slate-400">{icon}</span>
      <p>
        <span className="text-slate-400">{label}: </span>
        <span className="text-slate-700">{value}</span>
      </p>
    </div>
  );
}

function CompactAppointmentCard({
  appointment,
  client,
  labels,
  onOpen
}: {
  appointment: AppointmentRecord;
  client?: ClientRecord;
  labels: AppointmentLabels;
  onOpen: () => void;
}) {
  const [open, setOpen] = useState(false);
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const recurrence = appointmentCompactRecurrenceLabel(appointment);

  function openHover() {
    if (hoverTimer.current) {
      clearTimeout(hoverTimer.current);
    }

    hoverTimer.current = setTimeout(() => setOpen(true), 180);
  }

  function closeHover() {
    if (hoverTimer.current) {
      clearTimeout(hoverTimer.current);
    }

    setOpen(false);
  }

  return (
    <div className="relative" onMouseEnter={openHover} onMouseLeave={closeHover}>
      <button
        aria-label={`${appointment.client}, ${formatAppointmentTime(appointment.time)}, ${statusLabel(appointment.status, labels)}`}
        className={`grid w-full grid-cols-[auto_minmax(0,1fr)_auto_auto] items-center gap-1.5 rounded-md border border-l-4 bg-white px-2 py-1.5 text-left text-[11px] shadow-sm transition hover:border-cyan-200 hover:bg-cyan-50/40 focus:outline-none focus:ring-2 focus:ring-cyan-100 ${statusBorderClass(appointment.status)}`}
        onClick={(event) => {
          event.stopPropagation();
          onOpen();
        }}
        onFocus={openHover}
        onBlur={closeHover}
        type="button"
      >
        <span className="font-black text-slate-600">{formatAppointmentTime(appointment.time)}</span>
        <span className="truncate font-black text-slate-900">{appointment.client}</span>
        {recurrence ? <span className="rounded bg-slate-100 px-1.5 py-0.5 font-black text-slate-500">{recurrence}</span> : null}
        <span aria-hidden="true" className={`h-2 w-2 rounded-full ${statusDotClass(appointment.status)}`} />
      </button>
      {open ? <AppointmentHoverCard appointment={appointment} client={client} labels={labels} onClose={closeHover} onOpen={onOpen} /> : null}
    </div>
  );
}

export function AppointmentsManager({ clientLabels, labels, locale, month }: { clientLabels: ClientsLabels; labels: AppointmentLabels; locale: string; month?: string }) {
  const selectedMonth = parseMonth(month);
  const [appointments, setAppointments] = useState<AppointmentRecord[]>(createDefaultAppointments(selectedMonth));
  const [clients, setClients] = useState<ClientRecord[]>(defaultClients);
  const [calendarView, setCalendarView] = useState<CalendarView>("month");
  const [filters, setFilters] = useState({ search: "", team: "", service: "", status: "", recurrence: "" });
  const [draftAppointment, setDraftAppointment] = useState<AppointmentRecord | null>(null);
  const [pendingRecurringSave, setPendingRecurringSave] = useState<{ originalAppointment: AppointmentRecord; savedAppointment: AppointmentRecord } | null>(null);
  const [selectedDayKey, setSelectedDayKey] = useState<string | null>(null);
  const [showClientModal, setShowClientModal] = useState(false);
  const monthDays = createMonthDays(selectedMonth);
  const visibleAppointments = expandAppointmentsForMonth(appointments, selectedMonth);
  const clientByName = useMemo(() => new Map(clients.map((client) => [client.name, client])), [clients]);
  const filteredAppointments = useMemo(
    () => visibleAppointments.filter((appointment) => appointmentMatchesFilter(appointment, clientByName.get(appointment.client), filters)),
    [clientByName, filters, visibleAppointments]
  );
  const selectedDayAppointments = selectedDayKey ? filteredAppointments.filter((appointment) => appointment.date === selectedDayKey) : [];
  const selectedDayLabel = selectedDayKey ? new Intl.DateTimeFormat(locale, { day: "numeric", month: "long", year: "numeric" }).format(parseDateKey(selectedDayKey)) : "";
  const monthTitle = new Intl.DateTimeFormat(locale, { month: "long", year: "numeric" }).format(selectedMonth);
  const weekdayLabels = Array.from({ length: 7 }, (_, index) => new Intl.DateTimeFormat(locale, { weekday: "short" }).format(new Date(2026, 1, index + 1)));
  const nextMonths = [0, 1, 2, 3].map((offset) => addMonths(selectedMonth, offset));
  const todayKey = formatDateKey(new Date());
  const selectedDayForView = selectedDayKey ?? todayKey;
  const selectedDayViewAppointments = filteredAppointments.filter((appointment) => appointment.date === selectedDayForView);
  const weekStart = addDays(parseDateKey(selectedDayForView), -parseDateKey(selectedDayForView).getDay());
  const weekDays = Array.from({ length: 7 }, (_, index) => addDays(weekStart, index));
  const teams = Array.from(new Set(visibleAppointments.map((appointment) => appointment.team).filter(Boolean))).sort();
  const services = Array.from(new Set(visibleAppointments.map((appointment) => appointment.service).filter(Boolean))).sort();
  const recurrences = Array.from(new Set(visibleAppointments.map((appointment) => appointment.recurrence).filter((recurrence) => recurrence !== "does_not_repeat"))).sort();

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
    const localAppointments = normalizeAppointments(readLocalRecords(storageKey, createDefaultAppointments(selectedMonth)));
    const localClients = readLocalRecords(clientsStorageKey, defaultClients);
    setAppointments(localAppointments);
    setClients(localClients);
    readRemoteRecords(storageKey, localAppointments).then((records) => setAppointments(normalizeAppointments(records)));
    readRemoteRecords(clientsStorageKey, localClients).then(setClients);
  }, [month]);

  useEffect(() => {
    const savedView = window.localStorage.getItem("fastclean_appointments_view") as CalendarView | null;
    if (savedView === "month" || savedView === "week" || savedView === "day" || savedView === "agenda") {
      setCalendarView(savedView);
    }
  }, []);

  function changeCalendarView(view: CalendarView) {
    setCalendarView(view);
    window.localStorage.setItem("fastclean_appointments_view", view);
  }

  function clearFilters() {
    setFilters({ search: "", team: "", service: "", status: "", recurrence: "" });
  }

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
      ? appointments.map((appointment) => (appointment.id === appointmentId ? { ...appointment, status: "in_progress" as const } : appointment))
      : recurringAppointment
        ? [{ ...recurringAppointment, sourceId: recurringAppointment.sourceId ?? recurringAppointment.id.split("_repeat_")[0], isRecurringInstance: true, status: "in_progress" as const }, ...appointments]
        : appointments;
    setAppointments(nextAppointments);
    writeLocalRecords(storageKey, nextAppointments);
    setDraftAppointment(nextAppointments.find((appointment) => appointment.id === appointmentId) ?? null);
  }

  function deleteAppointment(appointment: AppointmentRecord) {
    const sourceId = appointment.sourceId ?? appointment.id.split("_repeat_")[0];
    const nextAppointments = appointments.filter((item) => item.id !== appointment.id && item.id !== sourceId && item.sourceId !== sourceId);
    setAppointments(nextAppointments);
    writeLocalRecords(storageKey, nextAppointments);
    setDraftAppointment(null);
    setSelectedDayKey(null);
  }

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {[
            { label: labels.scheduled, tone: "blue" as const },
            { label: labels.awaitingConfirmation, tone: "yellow" as const },
            { label: labels.confirmed, tone: "green" as const },
            { label: labels.inProgress, tone: "teal" as const },
            { label: labels.completed, tone: "green" as const },
            { label: labels.cancelled, tone: "red" as const }
          ].map((item) => (
            <Badge key={item.label} tone={item.tone}>{item.label}</Badge>
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
              <Link className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-600 transition hover:border-cyan-200 hover:bg-cyan-50" href={`/${locale}/appointments?month=${monthKey(new Date())}`}>
                {labels.scheduled}
              </Link>
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

          <div className="grid gap-3 rounded-xl border border-slate-100 bg-slate-50/70 p-3 lg:grid-cols-[minmax(0,1.3fr)_repeat(4,minmax(0,1fr))_auto] lg:items-end">
            <Input
              label={labels.customerSearch}
              name="appointmentSearch"
              onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))}
              placeholder={labels.customerSearch}
              value={filters.search}
            />
            <label className={fieldLabelClass}>
              {labels.team}
              <select className={selectClass} onChange={(event) => setFilters((current) => ({ ...current, team: event.target.value }))} value={filters.team}>
                <option value="">{labels.allTeams}</option>
                {teams.map((team) => <option key={team} value={team}>{team}</option>)}
              </select>
            </label>
            <label className={fieldLabelClass}>
              {labels.service}
              <select className={selectClass} onChange={(event) => setFilters((current) => ({ ...current, service: event.target.value }))} value={filters.service}>
                <option value="">{labels.allServices}</option>
                {services.map((service) => <option key={service} value={service}>{service}</option>)}
              </select>
            </label>
            <label className={fieldLabelClass}>
              {labels.status}
              <select className={selectClass} onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))} value={filters.status}>
                <option value="">{labels.allStatuses}</option>
                <option value="scheduled">{labels.scheduled}</option>
                <option value="awaiting_confirmation">{labels.awaitingConfirmation}</option>
                <option value="confirmed">{labels.confirmed}</option>
                <option value="in_progress">{labels.inProgress}</option>
                <option value="completed">{labels.completed}</option>
                <option value="cancelled">{labels.cancelled}</option>
                <option value="no_show">{labels.noShow}</option>
              </select>
            </label>
            <label className={fieldLabelClass}>
              {labels.recurrence}
              <select className={selectClass} onChange={(event) => setFilters((current) => ({ ...current, recurrence: event.target.value }))} value={filters.recurrence}>
                <option value="">{labels.allRecurrences}</option>
                {recurrences.map((recurrence) => <option key={recurrence} value={recurrence}>{recurrenceLabel(recurrence, labels)}</option>)}
              </select>
            </label>
            <Button onClick={clearFilters} type="button" variant="outline">
              <FilterX className="h-4 w-4" />
              {labels.clearFilters}
            </Button>
          </div>

          <div className="flex flex-wrap gap-2">
            {[
              { key: "month" as const, label: labels.monthView },
              { key: "week" as const, label: labels.weekView },
              { key: "day" as const, label: labels.dayView },
              { key: "agenda" as const, label: labels.agendaView }
            ].map((item) => (
              <button
                className={`rounded-xl border px-4 py-2 text-sm font-black transition ${calendarView === item.key ? "border-cyan-200 bg-cyan-50 text-cyan-700" : "border-slate-200 bg-white text-slate-600 hover:border-cyan-200 hover:bg-cyan-50"}`}
                key={item.key}
                onClick={() => changeCalendarView(item.key)}
                type="button"
              >
                {item.label}
              </button>
            ))}
          </div>

          {calendarView === "month" ? (
          <div className="overflow-x-auto pb-2">
            <div className="grid min-w-[760px] grid-cols-7 gap-2">
              {weekdayLabels.map((weekday) => (
                <div className="px-2 py-2 text-center text-xs font-black uppercase tracking-wide text-slate-400" key={weekday}>{weekday}</div>
              ))}
              {monthDays.map((day, index) => {
                const dayAppointments = day ? filteredAppointments.filter((appointment) => appointment.date === formatDateKey(day)) : [];
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
                        <CompactAppointmentCard appointment={appointment} client={clientByName.get(appointment.client)} key={appointment.id} labels={labels} onOpen={() => setDraftAppointment(appointment)} />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          ) : null}

          {calendarView === "week" ? (
            <div className="overflow-x-auto pb-2">
              <div className="grid min-w-[820px] grid-cols-7 gap-2">
                {weekDays.map((day) => {
                  const dayKey = formatDateKey(day);
                  const dayAppointments = filteredAppointments.filter((appointment) => appointment.date === dayKey);
                  return (
                    <div className="min-h-96 rounded-xl border border-slate-100 bg-slate-50/70 p-2" key={dayKey}>
                      <button className="mb-2 w-full rounded-lg px-2 py-1 text-left text-xs font-black uppercase text-slate-500 hover:bg-white" onClick={() => { setSelectedDayKey(dayKey); changeCalendarView("day"); }} type="button">
                        {new Intl.DateTimeFormat(locale, { weekday: "short", day: "numeric" }).format(day)}
                      </button>
                      <div className="grid gap-2">
                        {dayAppointments.map((appointment) => (
                          <button className={`rounded-lg border border-l-4 bg-white p-2 text-left shadow-sm transition hover:border-cyan-200 hover:bg-cyan-50/40 ${statusBorderClass(appointment.status)}`} key={appointment.id} onClick={() => setDraftAppointment(appointment)} type="button">
                            <p className="text-xs font-black text-slate-500">{formatAppointmentTimeRange(appointment)}</p>
                            <p className="mt-1 truncate text-sm font-black text-slate-950">{appointment.client}</p>
                            <p className="truncate text-xs font-bold text-slate-500">{appointment.service} · {appointment.team}</p>
                            <div className="mt-2 flex flex-wrap gap-1">
                              <Badge tone={statusTone(appointment.status)}>{statusLabel(appointment.status, labels)}</Badge>
                              {appointmentCompactRecurrenceLabel(appointment) ? <Badge tone="gray">{appointmentCompactRecurrenceLabel(appointment)}</Badge> : null}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}

          {calendarView === "day" ? (
            <div className="grid gap-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-base font-black text-slate-950">{new Intl.DateTimeFormat(locale, { weekday: "long", day: "numeric", month: "long" }).format(parseDateKey(selectedDayForView))}</h3>
                <Input label={labels.date} name="dayPicker" onChange={(event) => setSelectedDayKey(event.target.value)} type="date" value={selectedDayForView} />
              </div>
              {selectedDayViewAppointments.map((appointment) => {
                const client = clientByName.get(appointment.client);
                const address = clientPrimaryAddress(client);
                return (
                  <button className={`rounded-xl border border-l-4 bg-white p-4 text-left shadow-sm transition hover:border-cyan-200 hover:bg-cyan-50/40 ${statusBorderClass(appointment.status)}`} key={appointment.id} onClick={() => setDraftAppointment(appointment)} type="button">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-black text-slate-500">{formatAppointmentTimeRange(appointment)}{appointment.durationMinutes ? ` · ${appointment.durationMinutes / 60}h` : ""}</p>
                        <h3 className="mt-1 text-base font-black text-slate-950">{appointment.client}</h3>
                        <p className="mt-1 text-sm font-bold text-slate-500">{appointment.service} · {appointment.team}</p>
                        {address ? <p className="mt-2 text-sm font-bold text-slate-600">{address}</p> : null}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Badge tone={statusTone(appointment.status)}>{statusLabel(appointment.status, labels)}</Badge>
                        {appointment.price ? <Badge tone="gray">{appointment.price}</Badge> : null}
                        {appointmentCompactRecurrenceLabel(appointment) ? <Badge tone={recurrenceTone(appointment.recurrence)}>{appointmentCompactRecurrenceLabel(appointment)}</Badge> : null}
                      </div>
                    </div>
                  </button>
                );
              })}
              {selectedDayViewAppointments.length === 0 ? <button className="rounded-xl border border-dashed border-cyan-200 bg-cyan-50/50 p-5 text-left text-sm font-black text-primary" onClick={() => openNewAppointment(selectedDayForView)} type="button">{labels.newAppointment}</button> : null}
            </div>
          ) : null}

          {calendarView === "agenda" ? (
            <div className="grid gap-3">
              {Array.from(new Set(filteredAppointments.map((appointment) => appointment.date))).map((date) => (
                <section className="grid gap-2" key={date}>
                  <h3 className="text-xs font-black uppercase tracking-wide text-slate-400">{new Intl.DateTimeFormat(locale, { weekday: "long", day: "numeric", month: "long" }).format(parseDateKey(date))}</h3>
                  {filteredAppointments.filter((appointment) => appointment.date === date).map((appointment) => {
                    const client = clientByName.get(appointment.client);
                    const address = clientPrimaryAddress(client);
                    return (
                      <button className={`grid gap-3 rounded-xl border border-l-4 bg-white p-3 text-left shadow-sm transition hover:border-cyan-200 hover:bg-cyan-50/40 lg:grid-cols-[7rem_minmax(0,1fr)_auto] lg:items-center ${statusBorderClass(appointment.status)}`} key={appointment.id} onClick={() => setDraftAppointment(appointment)} type="button">
                        <span className="text-sm font-black text-slate-950">{formatAppointmentTimeRange(appointment)}</span>
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-black text-slate-950">{appointment.client}</span>
                          <span className="block truncate text-xs font-bold text-slate-500">{appointment.service} · {appointment.team}{address ? ` · ${address}` : ""}</span>
                        </span>
                        <span className="flex flex-wrap gap-2">
                          <Badge tone={statusTone(appointment.status)}>{statusLabel(appointment.status, labels)}</Badge>
                          {appointmentCompactRecurrenceLabel(appointment) ? <Badge tone="gray">{appointmentCompactRecurrenceLabel(appointment)}</Badge> : null}
                          {appointment.price ? <Badge tone="gray">{appointment.price}</Badge> : null}
                        </span>
                      </button>
                    );
                  })}
                </section>
              ))}
            </div>
          ) : null}
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
          onDelete={draftAppointment.id.startsWith("new_") ? undefined : () => deleteAppointment(draftAppointment)}
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
