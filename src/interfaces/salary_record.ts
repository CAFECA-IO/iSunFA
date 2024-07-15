export interface ISalaryRecord extends INewSalaryRecord {
  id: number;
}

export interface ISalaryRecordWithProjects extends ISalaryRecord {
  projects: {
    id: number;
    name: string;
  }[];
}

export interface ISalaryRecordWithProjectsAndHours extends ISalaryRecord {
  projects: {
    id: number;
    name: string;
    hours: number;
  }[];
}

export interface INewSalaryRecord {
  employeeId: number;
  employeeName: string;
  employeeDepartment: string;
  salary: number;
  insurancePayment: number;
  bonus: number;
  description: string;
  startDate: number;
  endDate: number;
  workingHour: number;
  confirmed: boolean;
  createdAt: number;
  updatedAt: number;
}
