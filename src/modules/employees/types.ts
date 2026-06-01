export type EmployeeRecord = {
  id: string;
  name: string;
  role: string;
  phone: string;
  email: string;
  hireDate: string;
  status: "active" | "inactive";
};

export const defaultEmployees: EmployeeRecord[] = [
  {
    id: "employee_john_miller",
    name: "John Miller",
    role: "Driver",
    phone: "(555) 010-1000",
    email: "john@fastcleanpro.com",
    hireDate: "2024-02-12",
    status: "active"
  },
  {
    id: "employee_maria_santos",
    name: "Maria Santos",
    role: "Helper",
    phone: "(555) 010-1001",
    email: "maria@fastcleanpro.com",
    hireDate: "2024-06-03",
    status: "active"
  },
  {
    id: "employee_carlos_lima",
    name: "Carlos Lima",
    role: "Driver",
    phone: "(555) 010-1002",
    email: "carlos@fastcleanpro.com",
    hireDate: "2023-11-18",
    status: "active"
  }
];
