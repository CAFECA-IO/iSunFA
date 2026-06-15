export type ILanceDBRow = {
  id: string;
  vector: Float32Array<ArrayBuffer>;
  text: string;
  reportId: string;
  companyName: string;
  pageNumber?: number;
  _distance?: number;
};
