export enum CounterpartyType {
  CLIENT = 'CLIENT',
  SUPPLIER = 'SUPPLIER',
  BOTH = 'BOTH',
}

export interface ICounterparty {
  id: number;
  companyId: number;
  name: string;
  taxId: string;
  type: string;
  note: string;
  createdAt: number;
  updatedAt: number;
}

export const dummyCounterparty: ICounterparty[] = [
  {
    id: 2,
    companyId: 124,
    name: 'Beta Industries',
    taxId: '987-654-321',
    type: CounterpartyType.CLIENT,
    note: 'New customer',
    createdAt: 1425272725,
    updatedAt: 1425272725,
  },
  {
    id: 3,
    companyId: 125,
    name: 'Gamma Enterprises',
    taxId: '456-789-123',
    type: CounterpartyType.SUPPLIER,
    note: 'Occasional vendor',
    createdAt: 1425272725,
    updatedAt: 1425272725,
  },
  {
    id: 4,
    companyId: 126,
    name: 'Delta Solutions',
    taxId: '321-654-987',
    type: CounterpartyType.CLIENT,
    note: 'Frequent customer',
    createdAt: 1425272725,
    updatedAt: 1425272725,
  },
];
