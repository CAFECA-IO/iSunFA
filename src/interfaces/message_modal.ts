import { buttonVariants } from '@/components/button/button';
import { VariantProps } from 'class-variance-authority';

export enum MessageType {
  WARNING = 'warning',
  SUCCESS = 'success',
  ERROR = 'error',
  INFO = 'info',
}

export interface IMessageModal {
  title: string;
  content: string;
  hideCloseBtn?: boolean;
  submitBtnStr: string;
  submitBtnFunction: () => void;
  messageType: MessageType;
  subtitle?: string;
  subMsg?: string;
  backBtnStr?: string;
  backBtnFunction?: () => void;
  submitBtnClassName?: string;
  submitBtnVariant?: VariantProps<typeof buttonVariants>['variant'];
  submitBtnIcon?: React.ReactNode;
}

export const dummyMessageModalData: IMessageModal = {
  title: 'Warning',
  content: '',
  submitBtnStr: 'Delete',
  submitBtnFunction: () => {},
  submitBtnVariant: 'tertiaryBorderless',
  messageType: MessageType.WARNING,
};
