"use client";

import { useEffect, useMemo, useState } from "react";
import { Pencil, Plus, Route, Trash2, Users } from "lucide-react";
import { Badge, Button, Card, CardContent, EmptyState, Input, Modal } from "@/components/design-system";
import { readLocalRecords, readRemoteRecords, writeLocalRecords } from "@/lib/storage/local-records";
import { defaultEmployees, type EmployeeRecord } from "@/modules/employees/types";
import { defaultTeams, type TeamRecord } from "@/modules/teams/types";

const employeesStorageKey = "fastclean_employees";
const teamsStorageKey = "fastclean_teams";

type TeamsLabels = {
  newTeam: string;
  saveTeam: string;
  cancel: string;
  delete: string;
  deleteTeam: string;
  deleteTeamConfirm: string;
  edit: string;
  editTeam: string;
  saveChanges: string;
  teamName: string;
  driver: string;
  helpers: string;
  jobsToday: string;
  routeReady: string;
  noEmployeesTitle: string;
  noEmployeesDescription: string;
  emptyTitle: string;
  emptyDescription: string;
};

export function TeamsManager({ labels }: { labels: TeamsLabels }) {
  const [employees, setEmployees] = useState<EmployeeRecord[]>(defaultEmployees);
  const [teams, setTeams] = useState<TeamRecord[]>(defaultTeams);
  const [showForm, setShowForm] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<TeamRecord | null>(null);
  const [routeTeam, setRouteTeam] = useState<TeamRecord | null>(null);

  useEffect(() => {
    const localEmployees = readLocalRecords(employeesStorageKey, defaultEmployees);
    const localTeams = readLocalRecords(teamsStorageKey, defaultTeams);
    setEmployees(localEmployees);
    setTeams(localTeams);
    readRemoteRecords(employeesStorageKey, localEmployees).then(setEmployees);
    readRemoteRecords(teamsStorageKey, localTeams).then(setTeams);
  }, []);

  const employeeById = useMemo(() => new Map(employees.map((employee) => [employee.id, employee])), [employees]);
  const drivers = employees.filter((employee) => employee.role.toLowerCase() === "driver");
  const helpers = employees.filter((employee) => employee.role.toLowerCase() !== "driver");

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const helperIds = formData.getAll("helperIds").map(String);
    const nextTeam: TeamRecord = {
      id: `team_${Date.now()}`,
      name: String(formData.get("name") ?? ""),
      driverId: String(formData.get("driverId") ?? ""),
      helperIds,
      jobsToday: 0
    };
    const nextTeams = [nextTeam, ...teams];
    setTeams(nextTeams);
    writeLocalRecords(teamsStorageKey, nextTeams);
    setShowForm(false);
    event.currentTarget.reset();
  }

  function handleUpdate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedTeam) {
      return;
    }

    const formData = new FormData(event.currentTarget);
    const updatedTeam: TeamRecord = {
      ...selectedTeam,
      name: String(formData.get("name") ?? ""),
      driverId: String(formData.get("driverId") ?? ""),
      helperIds: formData.getAll("helperIds").map(String)
    };
    const nextTeams = teams.map((team) => (team.id === updatedTeam.id ? updatedTeam : team));
    setTeams(nextTeams);
    writeLocalRecords(teamsStorageKey, nextTeams);
    setSelectedTeam(null);
  }

  function deleteTeam(teamId: string) {
    const nextTeams = teams.filter((team) => team.id !== teamId);
    setTeams(nextTeams);
    writeLocalRecords(teamsStorageKey, nextTeams);
    setSelectedTeam(null);
  }

  return (
    <div className="grid gap-6">
      <div className="flex justify-end">
        <Button disabled={employees.length === 0} onClick={() => setShowForm((value) => !value)} type="button">
          <Plus className="h-4 w-4" />
          {labels.newTeam}
        </Button>
      </div>

      {employees.length === 0 ? <EmptyState title={labels.noEmployeesTitle} description={labels.noEmployeesDescription} /> : null}

      {showForm ? (
        <Card>
          <CardContent>
            <form className="grid gap-4 lg:grid-cols-3" onSubmit={handleSubmit}>
              <Input label={labels.teamName} name="name" required />
              <label className="grid gap-2 text-sm font-medium text-slate-700">
                {labels.driver}
                <select className="h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-primary focus:ring-4 focus:ring-cyan-100" name="driverId" required>
                  {(drivers.length ? drivers : employees).map((employee) => (
                    <option key={employee.id} value={employee.id}>
                      {employee.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-2 text-sm font-medium text-slate-700">
                {labels.helpers}
                <select
                  className="min-h-24 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-primary focus:ring-4 focus:ring-cyan-100"
                  multiple
                  name="helperIds"
                >
                  {(helpers.length ? helpers : employees).map((employee) => (
                    <option key={employee.id} value={employee.id}>
                      {employee.name}
                    </option>
                  ))}
                </select>
              </label>
              <div className="flex items-end gap-2">
                <Button type="submit">{labels.saveTeam}</Button>
                <Button onClick={() => setShowForm(false)} type="button" variant="outline">
                  {labels.cancel}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-3">
        {teams.map((team) => {
          const driver = employeeById.get(team.driverId);
          const helperNames = team.helperIds.map((helperId) => employeeById.get(helperId)?.name).filter(Boolean).join(", ");

          return (
            <Card className="cursor-pointer transition hover:-translate-y-0.5 hover:border-cyan-100 hover:shadow-premium" key={team.id}>
              <CardContent>
                <div className="flex items-start justify-between gap-4" onClick={() => setSelectedTeam(team)}>
                  <div className="flex items-center gap-3">
                    <div className="grid h-11 w-11 place-items-center rounded-xl bg-cyan-50 text-cyan-600 ring-1 ring-cyan-100">
                      <Users className="h-5 w-5" />
                    </div>
                    <div>
                      <h2 className="text-lg font-black text-slate-950">{team.name}</h2>
                      <p className="text-sm font-semibold text-slate-500">{driver?.name ?? "-"}</p>
                    </div>
                  </div>
                  <Badge tone="blue">{team.jobsToday}</Badge>
                </div>
                <div className="mt-5 rounded-xl bg-slate-50 p-4" onClick={() => setSelectedTeam(team)}>
                  <p className="text-xs font-black uppercase tracking-wide text-slate-400">{labels.helpers}</p>
                  <p className="mt-1 text-sm font-bold text-slate-700">{helperNames || "-"}</p>
                </div>
                <div className="mt-5 grid gap-2 sm:grid-cols-3">
                  <Button className="sm:col-span-3" onClick={(event) => { event.stopPropagation(); setRouteTeam(team); }} type="button" variant="outline">
                    <Route className="h-4 w-4" />
                    {labels.routeReady}
                  </Button>
                  <Button className="sm:col-span-2" onClick={() => setSelectedTeam(team)} type="button" variant="outline">
                    <Pencil className="h-4 w-4" />
                    {labels.edit}
                  </Button>
                  <Button onClick={() => deleteTeam(team.id)} type="button" variant="danger">
                    <Trash2 className="h-4 w-4" />
                    {labels.delete}
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
      {teams.length === 0 ? <EmptyState title={labels.emptyTitle} description={labels.emptyDescription} /> : null}
      {selectedTeam ? (
        <Modal onClose={() => setSelectedTeam(null)} title={labels.editTeam}>
          <form className="grid gap-4" onSubmit={handleUpdate}>
            <Input defaultValue={selectedTeam.name} label={labels.teamName} name="name" required />
            <label className="grid gap-2 text-sm font-medium text-slate-700">
              {labels.driver}
              <select
                className="h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-primary focus:ring-4 focus:ring-cyan-100"
                defaultValue={selectedTeam.driverId}
                name="driverId"
                required
              >
                {(drivers.length ? drivers : employees).map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employee.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-2 text-sm font-medium text-slate-700">
              {labels.helpers}
              <select
                className="min-h-28 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-primary focus:ring-4 focus:ring-cyan-100"
                defaultValue={selectedTeam.helperIds}
                multiple
                name="helperIds"
              >
                {(helpers.length ? helpers : employees).map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employee.name}
                  </option>
                ))}
              </select>
            </label>
            <div className="rounded-xl bg-red-50 p-4 text-sm font-bold text-red-700 ring-1 ring-red-100">
              {labels.deleteTeamConfirm}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="submit">{labels.saveChanges}</Button>
              <Button onClick={() => setSelectedTeam(null)} type="button" variant="outline">
                {labels.cancel}
              </Button>
              <Button onClick={() => deleteTeam(selectedTeam.id)} type="button" variant="danger">
                <Trash2 className="h-4 w-4" />
                {labels.deleteTeam}
              </Button>
            </div>
          </form>
        </Modal>
      ) : null}
      {routeTeam ? (
        <Modal onClose={() => setRouteTeam(null)} title={labels.routeReady}>
          <div className="grid gap-3">
            {[
              ["8:00", "Ana Martins", "210 Beacon St, Boston"],
              ["10:30", "Julia Costa", "44 Garden Ave, Cambridge"],
              ["13:00", "Carla Gomez", "9 Maple Lane, Brookline"]
            ].map(([time, client, address]) => (
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-4" key={`${time}-${client}`}>
                <p className="text-xs font-black uppercase tracking-wide text-slate-400">{time} · {routeTeam.name}</p>
                <p className="mt-2 text-sm font-black text-slate-950">{client}</p>
                <p className="mt-1 text-sm font-semibold text-slate-500">{address}</p>
              </div>
            ))}
            <Button onClick={() => setRouteTeam(null)} type="button" variant="outline">
              {labels.cancel}
            </Button>
          </div>
        </Modal>
      ) : null}
    </div>
  );
}
