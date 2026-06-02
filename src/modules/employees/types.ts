export type EmployeeRecord = {
  id: string;
  name: string;
  role: string;
  phone: string;
  email: string;
  hireDate: string;
  status: "active" | "inactive";
};

export const defaultEmployees: EmployeeRecord[] = [];
