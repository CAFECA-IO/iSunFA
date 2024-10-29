import { IAccount } from '@/interfaces/accounting_account';
import { IAssetDetails } from '@/interfaces/asset';

export enum AssetModalType {
  ADD = 'ADD',
  EDIT = 'EDIT',
}

export interface IAssetModal {
  modalType: AssetModalType;
  assetAccountList: IAccount[];
  assetData: IAssetDetails | null;
}

export const initialAssetModal: IAssetModal = {
  modalType: AssetModalType.ADD,
  assetAccountList: [],
  assetData: null,
};
