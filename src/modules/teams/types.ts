export type TeamRecord = {
  id: string;
  name: string;
  driverId: string;
  helperIds: string[];
  jobsToday: number;
};

export const defaultTeams: TeamRecord[] = [];
