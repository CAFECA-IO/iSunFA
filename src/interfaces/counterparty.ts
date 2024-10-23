import { CounterPartyEntityType } from '@/constants/counterparty';
import type { ICompanyEntity } from '@/interfaces/company';

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
  type: CounterPartyEntityType;

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
  company?: ICompanyEntity;
}
