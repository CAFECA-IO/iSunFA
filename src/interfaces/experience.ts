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
  degree: Degree;
  schoolName: string;
  department: string;
  startTimestamp: number;
  endTimestamp: number;
  status: SchoolStatus;
}
