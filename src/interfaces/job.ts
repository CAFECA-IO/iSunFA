export interface IJob {
  title: string;
  location: string;
  date: string;
  description: string;
}

export interface IJobDetail extends IJob {
  jobResponsibilities: string[];
  requirements: string[];
  extraSkills: string[];
}
