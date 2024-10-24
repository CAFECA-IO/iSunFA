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

export const generateRandomCounterParties = (num?: number): ICounterparty[] => {
  const maxCount = num ?? Math.floor(Math.random() * 100) + 1;
  const counterParties: ICounterparty[] = [];

  function randomNumber(): number {
    return Math.floor(Math.random() * 1_000_000_000);
  }

  function randomTaxID(): string {
    return Math.floor(Math.random() * 1_000_000_000)
      .toString()
      .padStart(8, '0');
  }

  function randomDate(start: Date, end: Date): number {
    const date = new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
    return date.getTime() / 1000;
  }

  let i = 1;
  while (i <= maxCount) {
    const counterParty: ICounterparty = {
      id: i,
      companyId: randomNumber(),
      name: `CounterParty_${i.toString().padStart(6, '0')}`,
      taxId: randomTaxID(),
      type: CounterpartyType.SUPPLIER,
      note: `Note for CounterParty ${i.toString().padStart(6, '0')}`,
      createdAt: randomDate(new Date(2020, 1, 1), new Date()),
      updatedAt: randomDate(new Date(2020, 1, 1), new Date()),
    };
    counterParties.push(counterParty);
    i += 1;
  }

  return counterParties;
};
