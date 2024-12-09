import { CounterpartyType } from '@/constants/counterparty';

export interface IAddCounterPartyModalData {
  //  onClose: () => void;
  onSave: (counterpartyData: {
    name: string;
    taxId: string;
    type: CounterpartyType;
    note: string;
  }) => void;
  name?: string;
  taxId?: string;
}
