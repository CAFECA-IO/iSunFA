import { CounterpartyType } from '@/constants/counterparty';
import type { IAccountBookWithoutTeamEntity } from '@/interfaces/account_book';

export interface ICounterparty {
  id: number;
  companyId: number;
  name: string;
  taxId: string;
  type: CounterpartyType;
  note: string;
  createdAt: number;
  updatedAt: number;
}

export type ICounterpartyOptional = Partial<ICounterparty>;

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
    return Math.floor(date.getTime() / 1000);
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

/**
 * Info: (20241023 - Murky)
 * @description counter party entity interface specific for backend
 * @note use parsePrismaCounterPartyToCounterPartyEntity to convert Prisma.CounterParty to ICounterPartyEntity
 * @note use initCounterPartyEntity to create a new ICounterPartyEntity from scratch
 */
export interface ICounterPartyEntity {
  /**
   * Info: (20241023 - Murky)
   * @description id in database, 0 if not yet saved in database
   */
  id: number;

  /**
   * Info: (20241023 - Murky)
   * @description id of company, this company is our company
   */
  companyId: number;

  /**
   * Info: (20241023 - Murky)
   * @description name of counter party
   */
  name: string;

  /**
   * Info: (20241023 - Murky)
   * @description tax id of counter party(統一編號)
   */
  taxId: string;

  /**
   * Info: (20241023 - Murky)
   * @description counter party is supplier or customer
   */
  type: CounterpartyType;

  /**
   * Info: (20241023 - Murky)
   * @description note for user to input
   */
  note: string;

  /**
   * Info: (20241023 - Murky)
   * @note need to be in seconds
   */
  createdAt: number;

  /**
   * Info: (20241023 - Murky)
   * @note need to be in seconds
   */
  updatedAt: number;

  /**
   * Info: (20241023 - Murky)
   * @note need to be in seconds, null if not deleted
   */
  deletedAt: number | null;

  /**
   * Info: (20241023 - Murky)
   * @description company means our company
   */
  company?: IAccountBookWithoutTeamEntity;
}

export type ICounterPartyEntityPartial = Partial<ICounterPartyEntity> | null;
