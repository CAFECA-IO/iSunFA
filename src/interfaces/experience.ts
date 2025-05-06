// Info: (20250415 - Julian) ------------ Common ------------
export enum ExperienceType {
  EDUCATION = 'education',
  WORK = 'work',
}

export type IExperienceDate = {
  year: number;
  month: number;
};

export interface IExperienceBar {
  id: number;
  mainTitle: string;
  subTitle: string;
  start: IExperienceDate;
  end: IExperienceDate;
}

// Info: (20250415 - Julian) ------------ Education ------------
export enum Degree {
  ELEMENTARY = 'Elementary',
  JUNIOR = 'Junior',
  HIGH = 'High',
  BACHELOR = 'Bachelor',
  MASTER = 'Master',
  PROFESSIONAL = 'Professional',
}

export enum SchoolStatus {
  GRADUATED = 'Graduated',
  IN_SCHOOL = 'In_School',
  DROPOUT = 'Dropout',
}
export interface IEducationExperience {
  id: number;
  degree: Degree;
  schoolName: string;
  department: string;
  start: IExperienceDate;
  end: IExperienceDate;
  status: SchoolStatus;
}

// Info: (20250415 - Julian) ------------ Work ------------

export interface IWorkExperience {
  id: number;
  companyName: string;
  position: string;
  start: IExperienceDate;
  end: IExperienceDate;
  description?: string;
  leavingReason?: string;
}
