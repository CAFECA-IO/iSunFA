import { JSONValue } from '@/interfaces/common';

export interface IOrder {
  id: number;
  userId: number;
  companyId: number;
  planId: number;
  status: string;
  detail: JSONValue;
  createdAt: number;
  updatedAt: number;
}
