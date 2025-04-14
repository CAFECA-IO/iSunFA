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

export type IEducationDate = {
  year: number;
  month: number;
};

export interface IEducationExperience {
  id: number;
  degree: Degree;
  schoolName: string;
  department: string;
  start: IEducationDate;
  end: IEducationDate;
  status: SchoolStatus;
}

export const dummyEducationExperience: IEducationExperience[] = [
  {
    id: 1,
    degree: Degree.JUNIOR,
    schoolName: 'National Taipei University of Technology',
    department: 'Department of Computer Science and Information Engineering',
    start: {
      year: 2018,
      month: 9,
    },
    end: {
      year: 2020,
      month: 6,
    },
    status: SchoolStatus.GRADUATED,
  },
  {
    id: 2,
    degree: Degree.BACHELOR,
    schoolName: 'National Taiwan University',
    department: 'Computer Science and Information Engineering',
    start: {
      year: 2020,
      month: 9,
    },
    end: {
      year: 2024,
      month: 6,
    },
    status: SchoolStatus.GRADUATED,
  },
];
