import { ICounterparty } from './counterparty';

export interface IAddCounterPartyModalData {
  //  onClose: () => void;
  onSave: (counterpartyData: ICounterparty) => void;
  name?: string;
  taxId?: string;
}
