export type EmployeeDepartments = string[];

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
  start_date: number;
  bonus: number;
  salary_payment_mode: string;
  pay_frequency: string;
  projects: string[];
  insurance_payments: number;
}

export interface IEmployee {
  id: number;
  name: string;
  imageId: string;
  departmentId: number;
  companyId: number;
  salary: number;
  insurancePayment: number;
  bonus: number;
  salaryPayMode: string;
  payFrequency: string;
  startDate: number;
  endDate: number;
  createdAt: number;
  updatedAt: number;
}
