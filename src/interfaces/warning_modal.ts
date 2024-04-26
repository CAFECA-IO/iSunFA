export interface IWaringModal {
  title: string;
  content: string;
  warningMsg?: string;
  modalSubmitBtn: string;
  submitBtnFunction: () => void;
}

export const dummyWarningModalData: IWaringModal = {
  title: 'Warning',
  content: '',
  modalSubmitBtn: 'Delete',
  submitBtnFunction: () => {},
};
