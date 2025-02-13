export interface ITeamMember {
  id: string;
  name: string;
  email: string;
  role: string;
}

export interface ITeam {
  id: string;
  name: string;
  members: ITeamMember[];
}
