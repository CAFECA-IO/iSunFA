import { ICounterparty } from '@/interfaces/counterparty';

export interface IAddCounterPartyModalData {
  //  onClose: () => void;
  onSave: (counterpartyData: ICounterparty) => void;
  name?: string;
  taxId?: string;
  saveName?: boolean;
}
