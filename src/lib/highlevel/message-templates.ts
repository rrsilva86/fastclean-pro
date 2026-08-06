export type AppointmentMessageTemplateKey = "appointment" | "arrival" | "departure" | "invoice";

export type AppointmentMessageTemplates = Record<AppointmentMessageTemplateKey, string>;

export const defaultAppointmentMessageTemplates: AppointmentMessageTemplates = {
  appointment: "Hi {clientName}, this is {companyName}. Your cleaning is scheduled for {appointmentDate} at {appointmentTime}. Reply here if you need anything.",
  arrival: "Hi {clientName}, your FastClean Pro team is on the way for your cleaning today.",
  departure: "Hi {clientName}, your cleaning has been completed. Thank you for choosing {companyName}.",
  invoice: "Hi {clientName}, your invoice for today's cleaning is ready. Thank you."
};

export function renderAppointmentMessage(template: string, values: Record<string, string>) {
  return template.replace(/\{([a-zA-Z0-9_]+)\}/g, (_, key: string) => values[key] ?? "");
}
