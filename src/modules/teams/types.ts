export type TeamRecord = {
  id: string;
  name: string;
  driverId: string;
  helperIds: string[];
  jobsToday: number;
};

export const defaultTeams: TeamRecord[] = [
  {
    id: "team_a",
    name: "Team A",
    driverId: "employee_john_miller",
    helperIds: ["employee_maria_santos"],
    jobsToday: 4
  },
  {
    id: "team_b",
    name: "Team B",
    driverId: "employee_carlos_lima",
    helperIds: [],
    jobsToday: 3
  }
];
