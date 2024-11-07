import { ICompany } from '@/interfaces/company';

export interface ITodo {
  id: number;
  name: string;
  deadline: number;
  note: string;
  status: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface ITodoCompany extends ITodo {
  id: number;
  company: ICompany;
  createdAt: number;
  updatedAt: number;
}

// Info: (20241106 - Liz) ITodoEvent 只是暫時寫的，等後端的介面出來會替換掉
export interface ITodoEvent {
  id: number;
  name: string;
  deadline: number;
  note: string;
  status: boolean;
  createdAt: number;
  updatedAt: number;
  deletedAt: number;
  userTodoCompanies: ICompany[];
}
