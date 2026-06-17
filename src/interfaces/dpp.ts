import { JSONValue } from "@/validators/common";

export interface IDigitalProductPassportSku {
  id: string;
  accountBookId: string;
  accountBookName?: string;
  gtin: string;
  name: string;
  status: string;
  modulesData: JSONValue | null;
  missingGaps: JSONValue | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface IDigitalProductPassportBatch {
  id: string;
  skuId: string;
  skuName?: string;
  skuGtin?: string;
  batchNumber: string;
  serialRange: string | null;
  manufactureDate: Date;
  facilitySite: string;
  dynamicOverrides: JSONValue | null;
  publicUrl: string;
  createdAt: Date;
}

export interface IDppMissingGap {
  module: string;
  issue: string;
  impact: string;
}
