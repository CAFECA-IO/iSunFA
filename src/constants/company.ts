export const PUBLIC_COMPANY_ID = 1002;
export const NO_COMPANY_ID = 555;
export const CANCEL_COMPANY_ID: number = -1;

export enum COMPANY_TAG {
  ALL = 'all',
  FINANCIAL = 'financial',
  TAX = 'tax',
}

export enum CompanyUpdateAction {
  SET_TO_TOP = 'setToTop',
  UPDATE_TAG = 'updateTag',
}
