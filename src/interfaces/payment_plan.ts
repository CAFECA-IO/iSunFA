export interface IFeature {
  name: string;
  value: string;
}

export interface IPaymentPlan {
  name: string;
  price: number;
  extraMemberPrice: number;
  features: IFeature[];
  isActive: boolean;
  createdAt: number;
  updatedAt: number;
  deletedAt: number;
}
