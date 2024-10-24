export enum CounterpartyType {
  CLIENT = 'CLIENT',
  SUPPLIER = 'SUPPLIER',
  BOTH = 'BOTH',
}

import { CounterPartyEntityType } from '@/constants/counterparty';
import type { ICompanyEntity } from '@/interfaces/company';

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
