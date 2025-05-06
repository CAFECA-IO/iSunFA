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

export interface ITodoAccountBook extends ITodo {
  company: IAccountBook | null;
}
// ToDo: (20250306 - Liz) 這個 interface 預計改成 ITodoAccountBook
