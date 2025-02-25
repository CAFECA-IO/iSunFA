/**
 * Info: (20250225 - Shirley) Payment Plan 相關的介面定義
 */

export interface IFeature {
  name: string;
  value: string;
  description: string;
}

export interface IPaymentPlan {
  name: string;
  price: number;
  description: string;
  features: IFeature[];
  remarks: string;
  isActive: boolean;
  createdAt: number;
  updatedAt: number;
  deletedAt: number;
}

export interface ILocalizedPaymentPlan {
  locale: string;
  plans: IPaymentPlan[];
}
