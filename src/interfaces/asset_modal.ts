import { IAccount } from '@/interfaces/accounting_account';
import { ICreateAssetWithVouchersRepoResponse } from '@/interfaces/asset';

export enum AssetModalType {
  ADD = 'ADD',
  EDIT = 'EDIT',
}

export interface IAssetModal {
  modalType: AssetModalType;
  assetAccountList: IAccount[];
  assetData: ICreateAssetWithVouchersRepoResponse | null;
}

export const initialAssetModal: IAssetModal = {
  modalType: AssetModalType.ADD,
  assetAccountList: [],
  assetData: null,
};
