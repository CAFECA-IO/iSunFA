import { TPlanType } from '@/interfaces/subscription';

export interface IFeature {
  id: string;
  name: string;
  value: string | string[];
}

export interface IPaymentPlan {
  id: TPlanType;
  planName: string;
  price: number;
  extraMemberPrice?: number;
  features: IFeature[];
  isActive: boolean;
  createdAt: number;
  updatedAt: number;
  deletedAt: number;
}
