export const PUBLIC_ACCOUNT_BOOK_ID = 1002;
export const NO_ACCOUNT_BOOK_ID = 555;
export const CANCEL_ACCOUNT_BOOK_ID: number = -1;

export enum WORK_TAG {
  ALL = 'all',
  FINANCIAL = 'financial',
  TAX = 'tax',
}

export enum ACCOUNT_BOOK_UPDATE_ACTION {
  SET_TO_TOP = 'setToTop',
  UPDATE_TAG = 'updateTag',
}
