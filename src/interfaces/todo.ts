import { IAccountBook } from '@/interfaces/account_book';

export interface ITodo {
  id: number;
  name: string;
  deadline: number;
  note: string;
  status: boolean;
  createdAt: number;
  updatedAt: number;
  startTime: number;
  endTime: number;
}

export interface ITodoCompany extends ITodo {
  id: number;
  company: IAccountBook;
  createdAt: number;
  updatedAt: number;
}
