import type { ICounterPartyEntity } from 'src/interfaces/counterparty';
import { z } from 'zod';
/**
 * Info: (20241023 - Murky)
 * @description which is the counter party relation from our company perspective
 * @enum - [SUPPLER, CLIENT, BOTH]
 */
export enum CounterpartyType {
  /**
   * Info: (20241023 - Murky)
   * @description we are buyer, they are seller
   */
  SUPPLIER = 'SUPPLIER',
  /**
   * Info: (20241023 - Murky)
   * @description we are seller, they are buyer
   */
  CLIENT = 'CLIENT',

  /**
   * Info: (20241023 - Murky)
   * @description we are both supplier and client
   */
  BOTH = 'BOTH',
}

/**
 * Info: (20241029 - Murky)
 * @description If you need default counter party, use this
 */
export const PUBLIC_COUNTER_PARTY: ICounterPartyEntity = {
  id: 555,
  companyId: 555,
  name: 'DEFAULT_COUNTER_PARTY',
  taxId: '00000001',
  type: CounterpartyType.BOTH,
  note: 'DEFAULT_COUNTER_PARTY',
  createdAt: 0,
  updatedAt: 0,
  deletedAt: null,
};

export const counterPartyEntityValidator = z.object({
  id: z.number(),
  companyId: z.number(),
  name: z.string(),
  taxId: z.string(),
  type: z.nativeEnum(CounterpartyType),
  note: z.string(),
  createdAt: z.number(),
  updatedAt: z.number(),
  deletedAt: z.number().nullable(),
});

export const partialCounterPartyEntityValidator = z
  .object({
    id: z.number().optional(),
    companyId: z.number().optional(),
    name: z.string().optional(),
    taxId: z.string().optional(),
    type: z.nativeEnum(CounterpartyType).optional(),
    note: z.string().optional(),
    createdAt: z.number().optional(),
    updatedAt: z.number().optional(),
    deletedAt: z.number().nullable().optional(),
  })
  .nullable();
