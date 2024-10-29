import { EventEntityFrequency, EventEntityType } from '@/constants/event';
import type { IVoucherEntity } from '@/interfaces/voucher';

/**
 * Info: (20241023 - Murky)
 * @description Event entity, used to record the event of voucher relate to voucher
 * @note use parsePrismaEventToEventEntity to convert PrismaEvent to EventEntity
 * @note use initEventEntity to create a new EventEntity from scratch
 */
export interface IEventEntity {
  /**
   * Info: (20241023 - Murky)
   * @description id in database,0 if not yet saved in database
   */
  id: number;

  /**
   * Info: (20241023 - Murky)
   * @description relation between vouchers under this event
   */
  eventType: EventEntityType;

  /**
   * Info: (20241023 - Murky)
   * @description how frequent this event is, ONCE if not repeated
   */
  frequency: EventEntityFrequency;

  /**
   * Info: (20241023 - Murky)
   * @note need to be in seconds
   */
  startDate: number;

  /**
   * Info: (20241023 - Murky)
   * @note need to be in seconds
   */
  endDate: number;

  /**
   * Info: (20241023 - Murky)
   * @description 0~6, 0 is Sunday, which day of week this event happened repeatedly, empty if not repeated
   */
  dateOfWeek: number[];

  /**
   * Info: (20241023 - Murky)
   * @description '1'~'12', which month of year this event happened repeatedly, empty if not repeated
   */
  monthsOfYear: string[];

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
   * @description array of voucher relate to another voucher, can be used like reverse voucher
   */
  associateVouchers: {
    /**
     * Info: (20241023 - Murky)
     * @description the reason why this event is initiated
     */
    originalVoucher: IVoucherEntity;

    /**
     * Info: (20241023 - Murky)
     * @description the result(consequence) voucher of this event due to original voucher
     */
    resultVoucher: IVoucherEntity;

    /**
     * Info: (20241029 - Murky)
     * @description amount of money that two vouchers are related
     * @note use only when reversing voucher
     */
    amount?: number;
  }[];
}
