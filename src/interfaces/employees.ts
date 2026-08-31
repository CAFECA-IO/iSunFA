export type EmployeeDepartments = string[];

export interface IEasyEmployee {
  id: number;
  name: string;
  salary: number;
  department: string;
  payFrequency: string;
}

export interface IEasyEmployeeWithPagination {
  data: IEasyEmployee[];
  page: number;
  totalPages: number;
  totalCount: number;
  pageSize: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
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
  projects: { id: number; name: string }[];
  insurance_payments: number;
  additionalOfTotal: number;
}

export interface IEmployee {
  id: number;
  name: string;
  imageId: string | undefined;
  departmentId: number;
  companyId: number;
  salary: number;
  insurancePayment: number;
  bonus: number;
  salaryPayMode: string;
  payFrequency: string;
  startDate: number;
  endDate: number | undefined;
  createdAt: number;
  updatedAt: number;
}
