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

// Info: (20250711 - Julian) 用於薪資計算機的員工格式
export interface IEmployeeForCalc {
  id: number;
  name: string;
  number?: string;
  baseSalary: number;
  mealAllowance?: number;
  email: string;
}

export const dummyEmployeeForCalc: IEmployeeForCalc[] = [
  {
    id: 1,
    name: 'John Doe',
    number: 'EMP001',
    baseSalary: 50000,
    mealAllowance: 2000,
    email: 'JohnDoe@SSXX.wfw',
  },
  {
    id: 2,
    name: 'Jane Smith',
    number: 'EMP002',
    baseSalary: 60000,
    mealAllowance: 2500,
    email: 'JaneSmith@RTRT.wdw',
  },
  {
    id: 3,
    name: 'Alice Johnson',
    number: 'EMP003',
    baseSalary: 55000,
    mealAllowance: 2200,
    email: 'AliceAlice@dwd.vve',
  },
  {
    id: 4,
    name: 'Cyan Blue',
    number: 'EMP004',
    baseSalary: 70000,
    mealAllowance: 3000,
    email: 'CCC@azure.cc',
  },
  {
    id: 5,
    name: 'Kyle Lee',
    number: 'EMP005',
    baseSalary: 65000,
    mealAllowance: 2700,
    email: 'KyleLee@SSS.sp',
  },
  {
    id: 6,
    name: 'Veronica Fernandez',
    number: 'EMP006',
    baseSalary: 72000,
    mealAllowance: 3200,
    email: 'VeroF@wdw.fefe',
  },
  {
    id: 7,
    name: 'Maxwell Brown',
    number: 'EMP007',
    baseSalary: 58000,
    mealAllowance: 2100,
    email: 'max@WDW.wdw',
  },
  {
    id: 8,
    name: 'Echo Indigoriver',
    number: 'EMP008',
    baseSalary: 62000,
    mealAllowance: 2800,
    email: 'Echo@fef.sd',
  },
  {
    id: 9,
    name: 'Thyme Forest',
    number: 'EMP009',
    baseSalary: 54000,
    mealAllowance: 2300,
    email: 'Thyme@fef.efe',
  },
  {
    id: 10,
    name: 'Hill Down',
    number: 'EMP010',
    baseSalary: 68000,
    mealAllowance: 2900,
    email: 'Silent@fefe.efw',
  },
];
