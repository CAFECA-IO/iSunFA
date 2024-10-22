export enum PARTER_TYPES {
  SUPPLIER = 'Supplier',
  CLIENT = 'Client',
  BOTH = 'Both',
}
export interface ICounterParty {
  id: number;
  name: string;
  taxId: number;
  type: PARTER_TYPES;
  note: string;
}

// ToDo: (20241004 - Julian) dummy data
export const dummyCounterparty: ICounterParty[] = [
  {
    id: 1,
    taxId: 59382730,
    name: 'Padberg LLC',
    type: PARTER_TYPES.BOTH,
    note: '',
  },
  {
    id: 2,
    taxId: 59382731,
    name: 'Hermiston - West',
    type: PARTER_TYPES.BOTH,
    note: '',
  },
  {
    id: 3,
    taxId: 59382732,
    name: 'Feil, Ortiz and Lebsack',
    type: PARTER_TYPES.BOTH,
    note: '',
  },
  {
    id: 4,
    taxId: 59382733,
    name: 'Romaguera Inc',
    type: PARTER_TYPES.BOTH,
    note: '',
  },
  {
    id: 5,
    taxId: 59382734,
    name: 'Stamm - Baumbach',
    type: PARTER_TYPES.BOTH,
    note: '',
  },
];

export const generateRandomCounterParties = (num?: number): ICounterParty[] => {
  const maxCount = num ?? Math.floor(Math.random() * 100) + 1;
  const counterParties: ICounterParty[] = [];

  function randomNumber(): number {
    return Math.floor(Math.random() * 1_000_000_000);
  }

  let i = 1;
  while (i <= maxCount) {
    const counterParty: ICounterParty = {
      id: i,
      name: `CounterParty_${i.toString().padStart(6, '0')}`,
      taxId: randomNumber(),
      type: PARTER_TYPES.SUPPLIER,
      note: `Note for CounterParty ${i.toString().padStart(6, '0')}`,
    };
    counterParties.push(counterParty);
    i += 1;
  }

  return counterParties;
};
