"use client";

import { useEffect, useState } from "react";
import { Pencil, Plus, ShieldCheck, Trash2 } from "lucide-react";
import { Badge, Button, Card, CardContent, EmptyState, Input, Modal, Table, Td, Th } from "@/components/design-system";
import { readLocalRecords, writeLocalRecords } from "@/lib/storage/local-records";
import { defaultEmployees, type EmployeeRecord } from "@/modules/employees/types";
import { defaultTeams, type TeamRecord } from "@/modules/teams/types";

const storageKey = "fastclean_employees";
const teamsStorageKey = "fastclean_teams";

type EmployeesLabels = {
  addEmployee: string;
  saveEmployee: string;
  cancel: string;
  delete: string;
  deleteEmployee: string;
  deleteEmployeeConfirm: string;
  edit: string;
  editEmployee: string;
  name: string;
  role: string;
  saveChanges: string;
  phone: string;
  email: string;
  hireDate: string;
  status: string;
  active: string;
  emptyTitle: string;
  emptyDescription: string;
};

export function EmployeesManager({ labels }: { labels: EmployeesLabels }) {
  const [employees, setEmployees] = useState<EmployeeRecord[]>(defaultEmployees);
  const [showForm, setShowForm] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeRecord | null>(null);

  useEffect(() => {
    setEmployees(readLocalRecords(storageKey, defaultEmployees));
  }, []);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const nextEmployee: EmployeeRecord = {
      id: `employee_${Date.now()}`,
      name: String(formData.get("name") ?? ""),
      role: String(formData.get("role") ?? "Helper"),
      phone: String(formData.get("phone") ?? ""),
      email: String(formData.get("email") ?? ""),
      hireDate: String(formData.get("hireDate") ?? ""),
      status: "active"
    };

    const nextEmployees = [nextEmployee, ...employees];
    setEmployees(nextEmployees);
    writeLocalRecords(storageKey, nextEmployees);
    setShowForm(false);
    event.currentTarget.reset();
  }

  function handleUpdate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedEmployee) {
      return;
    }

    const formData = new FormData(event.currentTarget);
    const updatedEmployee: EmployeeRecord = {
      ...selectedEmployee,
      name: String(formData.get("name") ?? ""),
      role: String(formData.get("role") ?? "Helper"),
      phone: String(formData.get("phone") ?? ""),
      email: String(formData.get("email") ?? ""),
      hireDate: String(formData.get("hireDate") ?? "")
    };
    const nextEmployees = employees.map((employee) => (employee.id === updatedEmployee.id ? updatedEmployee : employee));
    setEmployees(nextEmployees);
    writeLocalRecords(storageKey, nextEmployees);
    setSelectedEmployee(null);
  }

  function deleteEmployee(employeeId: string) {
    const nextEmployees = employees.filter((employee) => employee.id !== employeeId);
    const teams = readLocalRecords<TeamRecord>(teamsStorageKey, defaultTeams);
    const nextTeams = teams.map((team) => ({
      ...team,
      driverId: team.driverId === employeeId ? "" : team.driverId,
      helperIds: team.helperIds.filter((helperId) => helperId !== employeeId)
    }));

    setEmployees(nextEmployees);
    writeLocalRecords(storageKey, nextEmployees);
    writeLocalRecords(teamsStorageKey, nextTeams);
    setSelectedEmployee(null);
  }

  return (
    <div className="grid gap-6">
      <div className="flex justify-end">
        <Button onClick={() => setShowForm((value) => !value)} type="button">
          <Plus className="h-4 w-4" />
          {labels.addEmployee}
        </Button>
      </div>

      {showForm ? (
        <Card>
          <CardContent>
            <form className="grid gap-4 lg:grid-cols-3" onSubmit={handleSubmit}>
              <Input label={labels.name} name="name" required />
              <label className="grid gap-2 text-sm font-medium text-slate-700">
                {labels.role}
                <select className="h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-primary focus:ring-4 focus:ring-cyan-100" name="role">
                  <option value="Driver">Driver</option>
                  <option value="Helper">Helper</option>
                  <option value="Office">Office</option>
                  <option value="Manager">Manager</option>
                </select>
              </label>
              <Input label={labels.phone} name="phone" />
              <Input label={labels.email} name="email" type="email" />
              <Input label={labels.hireDate} name="hireDate" type="date" />
              <div className="flex items-end gap-2">
                <Button type="submit">{labels.saveEmployee}</Button>
                <Button onClick={() => setShowForm(false)} type="button" variant="outline">
                  {labels.cancel}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardContent className="hidden lg:block">
          <Table>
            <thead>
              <tr>
                <Th>{labels.name}</Th>
                <Th>{labels.role}</Th>
                <Th>{labels.phone}</Th>
                <Th>{labels.hireDate}</Th>
                <Th>{labels.status}</Th>
                <Th>{labels.edit}</Th>
              </tr>
            </thead>
            <tbody>
              {employees.map((employee) => (
                <tr className="cursor-pointer transition hover:bg-cyan-50/30" key={employee.id} onClick={() => setSelectedEmployee(employee)}>
                  <Td>
                    <div className="flex items-center gap-3">
                      <span className="grid h-10 w-10 place-items-center rounded-xl bg-teal-50 text-teal-600 ring-1 ring-teal-100">
                        <ShieldCheck className="h-5 w-5" />
                      </span>
                      <div>
                        <span className="font-black text-slate-950">{employee.name}</span>
                        <p className="text-xs font-semibold text-slate-400">{employee.email}</p>
                      </div>
                    </div>
                  </Td>
                  <Td>{employee.role}</Td>
                  <Td>{employee.phone}</Td>
                  <Td>{employee.hireDate}</Td>
                  <Td>
                    <Badge tone="green">{labels.active}</Badge>
                  </Td>
                  <Td>
                    <div className="flex gap-2">
                      <Button onClick={(event) => { event.stopPropagation(); setSelectedEmployee(employee); }} type="button" variant="outline">
                        <Pencil className="h-4 w-4" />
                        {labels.edit}
                      </Button>
                      <Button onClick={(event) => { event.stopPropagation(); deleteEmployee(employee.id); }} type="button" variant="danger">
                        <Trash2 className="h-4 w-4" />
                        {labels.delete}
                      </Button>
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </CardContent>
      </Card>
      <div className="grid gap-4 lg:hidden">
        {employees.map((employee) => (
          <Card className="cursor-pointer" key={employee.id}>
            <CardContent>
              <div className="flex items-start gap-3" onClick={() => setSelectedEmployee(employee)}>
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-teal-50 text-teal-600 ring-1 ring-teal-100">
                  <ShieldCheck className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <p className="font-black text-slate-950">{employee.name}</p>
                  <p className="truncate text-xs font-semibold text-slate-400">{employee.email}</p>
                </div>
                <div className="ml-auto">
                  <Badge tone="green">{labels.active}</Badge>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-lg bg-slate-50 p-3">
                  <p className="text-xs font-black uppercase tracking-wide text-slate-400">{labels.role}</p>
                  <p className="mt-1 font-black text-slate-950">{employee.role}</p>
                </div>
                <div className="rounded-lg bg-slate-50 p-3">
                  <p className="text-xs font-black uppercase tracking-wide text-slate-400">{labels.hireDate}</p>
                  <p className="mt-1 font-black text-slate-950">{employee.hireDate}</p>
                </div>
              </div>
              <p className="mt-4 text-sm font-bold text-slate-600">{employee.phone}</p>
              <div className="mt-4 flex gap-2">
                <Button className="flex-1" onClick={() => setSelectedEmployee(employee)} type="button" variant="outline">
                  <Pencil className="h-4 w-4" />
                  {labels.edit}
                </Button>
                <Button className="flex-1" onClick={() => deleteEmployee(employee.id)} type="button" variant="danger">
                  <Trash2 className="h-4 w-4" />
                  {labels.delete}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      {employees.length === 0 ? <EmptyState title={labels.emptyTitle} description={labels.emptyDescription} /> : null}
      {selectedEmployee ? (
        <Modal onClose={() => setSelectedEmployee(null)} title={labels.editEmployee}>
          <form className="grid gap-4 lg:grid-cols-2" onSubmit={handleUpdate}>
            <Input defaultValue={selectedEmployee.name} label={labels.name} name="name" required />
            <label className="grid gap-2 text-sm font-medium text-slate-700">
              {labels.role}
              <select
                className="h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-primary focus:ring-4 focus:ring-cyan-100"
                defaultValue={selectedEmployee.role}
                name="role"
              >
                <option value="Driver">Driver</option>
                <option value="Helper">Helper</option>
                <option value="Office">Office</option>
                <option value="Manager">Manager</option>
              </select>
            </label>
            <Input defaultValue={selectedEmployee.phone} label={labels.phone} name="phone" />
            <Input defaultValue={selectedEmployee.email} label={labels.email} name="email" type="email" />
            <Input defaultValue={selectedEmployee.hireDate} label={labels.hireDate} name="hireDate" type="date" />
            <div className="rounded-xl bg-red-50 p-4 text-sm font-bold text-red-700 ring-1 ring-red-100 lg:col-span-2">
              {labels.deleteEmployeeConfirm}
            </div>
            <div className="flex flex-wrap gap-2 lg:col-span-2">
              <Button type="submit">{labels.saveChanges}</Button>
              <Button onClick={() => setSelectedEmployee(null)} type="button" variant="outline">
                {labels.cancel}
              </Button>
              <Button onClick={() => deleteEmployee(selectedEmployee.id)} type="button" variant="danger">
                <Trash2 className="h-4 w-4" />
                {labels.deleteEmployee}
              </Button>
            </div>
          </form>
        </Modal>
      ) : null}
    </div>
  );
}
