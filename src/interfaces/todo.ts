import { ICompany } from './company';

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
