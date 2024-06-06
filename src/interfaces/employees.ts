export type EmployeeDepartments = string[] | null;

export type EmployeeData = IEmployeeData | null;

export type EasyEmployee = IEasyEmployee | null;

export interface IEasyEmployee {
  id: number;
  name: string;
  salary: number;
  department: string;
}

export interface IEmployeeData {
  id: number;
  name: string;
  salary: number;
  department: string;
  email: string;
  start_date: Date;
  bonus: number;
  salary_payment_mode: string;
  pay_frequency: string;
  projects: string[];
  insurance_payments: number;
  additional_of_total: number;
}

export interface IEmployee {
  id: number;
  name: string;
  imageId: string | null;
  departmentId: number;
  companyId: number;
  salary: number;
  insurancePayment: number;
  bonus: number;
  salaryPayMode: string;
  payFrequency: string;
  startDate: number;
  endDate: number | null;
  createdAt: number;
  updatedAt: number;
}
