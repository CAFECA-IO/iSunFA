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

export const dummyEducationExperience: IEducationExperience[] = [
  {
    id: 1,
    degree: Degree.JUNIOR,
    schoolName: 'National Taipei University of Technology',
    department: 'Department of Computer Science and Information Engineering',
    start: {
      year: 2015,
      month: 9,
    },
    end: {
      year: 2018,
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
      year: 2018,
      month: 9,
    },
    end: {
      year: 2020,
      month: 6,
    },
    status: SchoolStatus.GRADUATED,
  },
];

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

export const dummyWorkExperience: IWorkExperience[] = [
  {
    id: 1,
    companyName: 'Tech Company',
    position: 'Software Engineer',
    start: {
      year: 2020,
      month: 1,
    },
    end: {
      year: 2021,
      month: 6,
    },
  },
  {
    id: 2,
    companyName: 'Another Tech Company',
    position: 'Frontend Developer',
    start: {
      year: 2021,
      month: 7,
    },
    end: {
      year: 2023,
      month: 12,
    },
  },
  {
    id: 3,
    companyName: 'Web Solutions Inc.',
    position: 'Full Stack Developer',
    start: {
      year: 2023,
      month: 1,
    },
    end: {
      year: 2023,
      month: 7,
    },
  },
];
