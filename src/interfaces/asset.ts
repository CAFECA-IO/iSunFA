export interface Asset {
  id: string;
  name: string;
  projectId: string;
  type: string;
  description: string;
  startDate: string;
  endDate: string;
  purchasePrice: string;
  purchaseAmount: string;
  totalPrice: string;
  residualValue: string;
  estimatedUsefulLife: number;
  depreciationMethod: string;
  createdAt: number;
  updatedAt: number;
}
