export type EmploymentStatus = "active" | "inactive" | "on_leave" | "vacation" | "terminated";
export type WorkerClassification = "employee" | "independent_contractor" | "subcontractor" | "temporary";
export type WorkScheduleType = "full_time" | "part_time" | "on_call" | "temporary";
export type PaymentType = "hourly" | "daily" | "weekly_salary" | "monthly_salary" | "per_job" | "commission" | "custom";
export type PaymentFrequency = "weekly" | "biweekly" | "semimonthly" | "monthly" | "per_job";
export type EmployeeDocumentStatus = "pending" | "valid" | "expiring_soon" | "expired" | "rejected";
export type EmployeeSkillLevel = "beginner" | "intermediate" | "advanced" | "expert";
export type SystemAccessRole = "employee" | "team_leader" | "supervisor" | "office_staff" | "manager" | "administrator" | "custom";

export type EmployeeAvailabilityDay = {
  day: string;
  available: boolean;
  startTime: string;
  endTime: string;
  secondStartTime: string;
  secondEndTime: string;
  notes: string;
};

export type EmployeeDocument = {
  id: string;
  name: string;
  type: string;
  number: string;
  issuer: string;
  issueDate: string;
  expirationDate: string;
  fileName: string;
  status: EmployeeDocumentStatus;
  verifiedBy: string;
  verificationDate: string;
  notes: string;
  createdDate: string;
  updatedDate: string;
};

export type EmployeeSkill = {
  id: string;
  name: string;
  category: string;
  level: EmployeeSkillLevel;
  years: string;
  certificationName: string;
  certificationFileName: string;
  issueDate: string;
  expirationDate: string;
  notes: string;
  active: boolean;
};

export type EmployeeHistoryEvent = {
  id: string;
  occurredAt: string;
  action: string;
  actor: string;
  previousValue?: string;
  newValue?: string;
  relatedRecord?: string;
};

export type EmployeeProfile = {
  photoDataUrl: string;
  preferredName: string;
  secondaryPhone: string;
  dateOfBirth: string;
  preferredLanguage: "en" | "pt" | "es";
  address: {
    street: string;
    line2: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  emergencyContact: {
    name: string;
    relationship: string;
    primaryPhone: string;
    secondaryPhone: string;
    email: string;
    notes: string;
  };
  employment: {
    employeeCode: string;
    primaryRole: string;
    secondaryRoles: string[];
    customRole: string;
    status: EmploymentStatus;
    workerClassification: WorkerClassification;
    workScheduleType: WorkScheduleType;
    terminationDate: string;
    terminationReason: string;
    internalNotes: string;
  };
  payment: {
    type: PaymentType;
    hourlyRate: string;
    dailyRate: string;
    weeklySalary: string;
    monthlySalary: string;
    perJobRate: string;
    commissionPercentage: string;
    customRateLabel: string;
    customRateAmount: string;
    overtimeEnabled: boolean;
    regularHoursBeforeOvertime: string;
    overtimeMultiplier: string;
    customOvertimeRate: string;
    overtimeCalculationMethod: string;
    paymentFrequency: PaymentFrequency;
    firstPaymentDate: string;
    defaultPaymentDay: string;
    paymentNotes: string;
    defaultPaymentMethod: string;
    paymentRecipientName: string;
    maskedPaymentDetails: string;
    internalPaymentNotes: string;
    taxClassification: string;
    taxIdStatus: string;
    requiredTaxDocumentsStatus: string;
    taxNotes: string;
    mileageReimbursementEnabled: boolean;
    mileageReimbursementRate: string;
    fuelReimbursementEnabled: boolean;
    materialsReimbursementEnabled: boolean;
    toolReimbursementEnabled: boolean;
    allowExpenseSubmissions: boolean;
    expenseApprovalRequired: boolean;
    includeInProjectCosting: boolean;
    internalCostRate: string;
    payrollBurdenPercentage: string;
    additionalHourlyOverhead: string;
    customerBillingRate: string;
  };
  schedule: {
    availability: EmployeeAvailabilityDay[];
    maximumWeeklyHours: string;
    availableForOvertime: boolean;
    availableOnWeekends: boolean;
    recurringUnavailablePeriods: string;
    effectiveDate: string;
    clockInEnabled: boolean;
    clockOutEnabled: boolean;
    requireGps: boolean;
    requireClockInPhoto: boolean;
    requireClockOutPhoto: boolean;
    requireGeofence: boolean;
    requireTimesheetApproval: boolean;
    allowManualTimeEditing: boolean;
    requireManualEditReason: boolean;
    automaticBreakEnabled: boolean;
    defaultBreakDuration: string;
    minimumShiftDuration: string;
    roundClockTimes: boolean;
    lateArrivalNotification: boolean;
    absenceNotification: boolean;
    canWorkAlone: boolean;
    canLeadTeam: boolean;
    hasPersonalTransportation: boolean;
    canDriveCompanyVehicle: boolean;
    canTransportEmployees: boolean;
    canPickUpMaterials: boolean;
    canAccessCustomerPropertyAlone: boolean;
    requiresSupervision: boolean;
  };
  documents: EmployeeDocument[];
  skills: EmployeeSkill[];
  permissions: {
    systemRole: SystemAccessRole;
    customRoleName: string;
    overrides: Record<string, boolean>;
  };
  history: EmployeeHistoryEvent[];
};

export type EmployeeRecord = {
  id: string;
  name: string;
  role: string;
  phone: string;
  email: string;
  hireDate: string;
  status: "active" | "inactive";
  profile?: EmployeeProfile;
};

const weekdays = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];

export const defaultAvailability = weekdays.map((day, index) => ({
  day,
  available: index < 5,
  startTime: "08:00",
  endTime: "17:00",
  secondStartTime: "",
  secondEndTime: "",
  notes: ""
}));

export function createEmployeeCode() {
  return `EMP-${Date.now().toString().slice(-6)}`;
}

export function createDefaultEmployeeProfile(employee?: Partial<EmployeeRecord>): EmployeeProfile {
  const employeeCode = employee?.profile?.employment.employeeCode || createEmployeeCode();

  return {
    photoDataUrl: employee?.profile?.photoDataUrl || "",
    preferredName: employee?.profile?.preferredName || "",
    secondaryPhone: employee?.profile?.secondaryPhone || "",
    dateOfBirth: employee?.profile?.dateOfBirth || "",
    preferredLanguage: employee?.profile?.preferredLanguage || "en",
    address: {
      street: employee?.profile?.address.street || "",
      line2: employee?.profile?.address.line2 || "",
      city: employee?.profile?.address.city || "",
      state: employee?.profile?.address.state || "",
      zipCode: employee?.profile?.address.zipCode || "",
      country: employee?.profile?.address.country || "US"
    },
    emergencyContact: {
      name: employee?.profile?.emergencyContact.name || "",
      relationship: employee?.profile?.emergencyContact.relationship || "",
      primaryPhone: employee?.profile?.emergencyContact.primaryPhone || "",
      secondaryPhone: employee?.profile?.emergencyContact.secondaryPhone || "",
      email: employee?.profile?.emergencyContact.email || "",
      notes: employee?.profile?.emergencyContact.notes || ""
    },
    employment: {
      employeeCode,
      primaryRole: employee?.profile?.employment.primaryRole || employee?.role || "Cleaner",
      secondaryRoles: employee?.profile?.employment.secondaryRoles || [],
      customRole: employee?.profile?.employment.customRole || "",
      status: employee?.profile?.employment.status || (employee?.status === "inactive" ? "inactive" : "active"),
      workerClassification: employee?.profile?.employment.workerClassification || "employee",
      workScheduleType: employee?.profile?.employment.workScheduleType || "full_time",
      terminationDate: employee?.profile?.employment.terminationDate || "",
      terminationReason: employee?.profile?.employment.terminationReason || "",
      internalNotes: employee?.profile?.employment.internalNotes || ""
    },
    payment: {
      type: employee?.profile?.payment.type || "hourly",
      hourlyRate: employee?.profile?.payment.hourlyRate || "",
      dailyRate: employee?.profile?.payment.dailyRate || "",
      weeklySalary: employee?.profile?.payment.weeklySalary || "",
      monthlySalary: employee?.profile?.payment.monthlySalary || "",
      perJobRate: employee?.profile?.payment.perJobRate || "",
      commissionPercentage: employee?.profile?.payment.commissionPercentage || "",
      customRateLabel: employee?.profile?.payment.customRateLabel || "",
      customRateAmount: employee?.profile?.payment.customRateAmount || "",
      overtimeEnabled: employee?.profile?.payment.overtimeEnabled || false,
      regularHoursBeforeOvertime: employee?.profile?.payment.regularHoursBeforeOvertime || "40",
      overtimeMultiplier: employee?.profile?.payment.overtimeMultiplier || "1.5",
      customOvertimeRate: employee?.profile?.payment.customOvertimeRate || "",
      overtimeCalculationMethod: employee?.profile?.payment.overtimeCalculationMethod || "standard_multiplier",
      paymentFrequency: employee?.profile?.payment.paymentFrequency || "weekly",
      firstPaymentDate: employee?.profile?.payment.firstPaymentDate || "",
      defaultPaymentDay: employee?.profile?.payment.defaultPaymentDay || "friday",
      paymentNotes: employee?.profile?.payment.paymentNotes || "",
      defaultPaymentMethod: employee?.profile?.payment.defaultPaymentMethod || "direct_deposit",
      paymentRecipientName: employee?.profile?.payment.paymentRecipientName || employee?.name || "",
      maskedPaymentDetails: employee?.profile?.payment.maskedPaymentDetails || "",
      internalPaymentNotes: employee?.profile?.payment.internalPaymentNotes || "",
      taxClassification: employee?.profile?.payment.taxClassification || "not_defined",
      taxIdStatus: employee?.profile?.payment.taxIdStatus || "not_collected",
      requiredTaxDocumentsStatus: employee?.profile?.payment.requiredTaxDocumentsStatus || "missing",
      taxNotes: employee?.profile?.payment.taxNotes || "",
      mileageReimbursementEnabled: employee?.profile?.payment.mileageReimbursementEnabled || false,
      mileageReimbursementRate: employee?.profile?.payment.mileageReimbursementRate || "",
      fuelReimbursementEnabled: employee?.profile?.payment.fuelReimbursementEnabled || false,
      materialsReimbursementEnabled: employee?.profile?.payment.materialsReimbursementEnabled || false,
      toolReimbursementEnabled: employee?.profile?.payment.toolReimbursementEnabled || false,
      allowExpenseSubmissions: employee?.profile?.payment.allowExpenseSubmissions || false,
      expenseApprovalRequired: employee?.profile?.payment.expenseApprovalRequired || true,
      includeInProjectCosting: employee?.profile?.payment.includeInProjectCosting || false,
      internalCostRate: employee?.profile?.payment.internalCostRate || "",
      payrollBurdenPercentage: employee?.profile?.payment.payrollBurdenPercentage || "",
      additionalHourlyOverhead: employee?.profile?.payment.additionalHourlyOverhead || "",
      customerBillingRate: employee?.profile?.payment.customerBillingRate || ""
    },
    schedule: {
      availability: employee?.profile?.schedule.availability || defaultAvailability,
      maximumWeeklyHours: employee?.profile?.schedule.maximumWeeklyHours || "40",
      availableForOvertime: employee?.profile?.schedule.availableForOvertime || false,
      availableOnWeekends: employee?.profile?.schedule.availableOnWeekends || false,
      recurringUnavailablePeriods: employee?.profile?.schedule.recurringUnavailablePeriods || "",
      effectiveDate: employee?.profile?.schedule.effectiveDate || "",
      clockInEnabled: employee?.profile?.schedule.clockInEnabled || true,
      clockOutEnabled: employee?.profile?.schedule.clockOutEnabled || true,
      requireGps: employee?.profile?.schedule.requireGps || false,
      requireClockInPhoto: employee?.profile?.schedule.requireClockInPhoto || false,
      requireClockOutPhoto: employee?.profile?.schedule.requireClockOutPhoto || false,
      requireGeofence: employee?.profile?.schedule.requireGeofence || false,
      requireTimesheetApproval: employee?.profile?.schedule.requireTimesheetApproval || true,
      allowManualTimeEditing: employee?.profile?.schedule.allowManualTimeEditing || false,
      requireManualEditReason: employee?.profile?.schedule.requireManualEditReason || true,
      automaticBreakEnabled: employee?.profile?.schedule.automaticBreakEnabled || false,
      defaultBreakDuration: employee?.profile?.schedule.defaultBreakDuration || "30",
      minimumShiftDuration: employee?.profile?.schedule.minimumShiftDuration || "1",
      roundClockTimes: employee?.profile?.schedule.roundClockTimes || false,
      lateArrivalNotification: employee?.profile?.schedule.lateArrivalNotification || true,
      absenceNotification: employee?.profile?.schedule.absenceNotification || true,
      canWorkAlone: employee?.profile?.schedule.canWorkAlone || false,
      canLeadTeam: employee?.profile?.schedule.canLeadTeam || false,
      hasPersonalTransportation: employee?.profile?.schedule.hasPersonalTransportation || false,
      canDriveCompanyVehicle: employee?.profile?.schedule.canDriveCompanyVehicle || false,
      canTransportEmployees: employee?.profile?.schedule.canTransportEmployees || false,
      canPickUpMaterials: employee?.profile?.schedule.canPickUpMaterials || false,
      canAccessCustomerPropertyAlone: employee?.profile?.schedule.canAccessCustomerPropertyAlone || false,
      requiresSupervision: employee?.profile?.schedule.requiresSupervision || false
    },
    documents: employee?.profile?.documents || [],
    skills: employee?.profile?.skills || [],
    permissions: {
      systemRole: employee?.profile?.permissions.systemRole || "employee",
      customRoleName: employee?.profile?.permissions.customRoleName || "",
      overrides: employee?.profile?.permissions.overrides || {}
    },
    history: employee?.profile?.history || [
      {
        id: `history_${Date.now()}`,
        occurredAt: new Date().toISOString(),
        action: "created",
        actor: "System"
      }
    ]
  };
}

export function normalizeEmployee(employee: EmployeeRecord): EmployeeRecord {
  const profile = createDefaultEmployeeProfile(employee);

  return {
    ...employee,
    role: employee.role || profile.employment.primaryRole,
    phone: employee.phone || "",
    email: employee.email || "",
    hireDate: employee.hireDate || "",
    status: profile.employment.status === "terminated" || profile.employment.status === "inactive" ? "inactive" : "active",
    profile
  };
}

export const defaultEmployees: EmployeeRecord[] = [];
