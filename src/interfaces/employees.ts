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
  name: string;
  salary: number;
  department: string;
  start_date: Date;
  bonus: number;
  salary_payment_mode: string;
  pay_frequency: string;
}
