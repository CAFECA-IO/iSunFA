export interface Asset {
  id: string;
  name: string;
  projectId: string;
  projectName: string;
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
}
