export enum MessageType {
  WARNING = 'warning',
  SUCCESS = 'success',
  ERROR = 'error',
  INFO = 'info',
}

export interface IMessageModal {
  title: string;
  subtitle?: string;
  content: string;
  subMsg?: string;
  submitBtnStr: string;
  submitBtnFunction: () => void;
  backBtnStr?: string;
  backBtnFunction?: () => void;
  messageType: MessageType;
}

export const dummyMessageModalData: IMessageModal = {
  title: 'Warning',
  subtitle: '',
  content: '',
  submitBtnStr: 'Delete',
  submitBtnFunction: () => {},
  messageType: MessageType.WARNING,
};
