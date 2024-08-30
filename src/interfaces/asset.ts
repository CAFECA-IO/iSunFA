export interface IAsset {
  id: number;
  voucherId: number;
  projectId: number;
  contractId: number;
  name: string;
  tag: string;
  type: string;
  description: string;
  startDate: string;
  endDate: string;
  price: string;
  residualValue: string;
  estimatedUsefulLife: number;
  depreciationMethod: string;
  createdAt: number;
  updatedAt: number;
}
export const mockAssetData: IAsset[] = [
  {
    id: 1,
    voucherId: 123,
    projectId: 456,
    contractId: 789,
    name: 'Asset 1',
    tag: 'Tag 1',
    type: 'Type 1',
    description: 'Description 1',
    startDate: '2022-01-01',
    endDate: '2023-01-01',
    price: '1000',
    residualValue: '100',
    estimatedUsefulLife: 5,
    depreciationMethod: 'Straight Line',
    createdAt: 1640995200,
    updatedAt: 1640995200,
  },
  {
    id: 2,
    voucherId: 456,
    projectId: 789,
    contractId: 123,
    name: 'Asset 2',
    tag: 'Tag 2',
    type: 'Type 2',
    description: 'Description 2',
    startDate: '2022-02-01',
    endDate: '2023-02-01',
    price: '2000',
    residualValue: '200',
    estimatedUsefulLife: 10,
    depreciationMethod: 'Double Declining Balance',
    createdAt: 1640995200,
    updatedAt: 1640995200,
  },
];
