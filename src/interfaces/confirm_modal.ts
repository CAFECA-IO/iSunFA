export interface IConfirmModal {
  dateTimestamp: number;
  type: string;
  reason: string;
  vendor: string;
  description: string;
  totalPrice: number;
  tax: number;
  fee: number;
  paymentMethod: string;
  paymentPeriod: string;
  paymentStatus: string;
  project: string;
  contract: string;
}

export const dummyConfirmModalData: IConfirmModal = {
  dateTimestamp: 0,
  type: '',
  reason: '',
  vendor: '',
  description: '',
  totalPrice: 0,
  tax: 0,
  fee: 0,
  paymentMethod: '',
  paymentPeriod: '',
  paymentStatus: '',
  project: '',
  contract: '',
};
