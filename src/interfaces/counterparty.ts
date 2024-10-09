export interface ICounterparty {
  id: number;
  code: string;
  name: string;
}

// ToDo: (20241004 - Julian) dummy data
export const dummyCounterparty: ICounterparty[] = [
  {
    id: 1,
    code: '59382730',
    name: 'Padberg LLC',
  },
  {
    id: 2,
    code: '59382731',
    name: 'Hermiston - West',
  },
  {
    id: 3,
    code: '59382732',
    name: 'Feil, Ortiz and Lebsack',
  },
  {
    id: 4,
    code: '59382733',
    name: 'Romaguera Inc',
  },
  {
    id: 5,
    code: '59382734',
    name: 'Stamm - Baumbach',
  },
];
