export interface IOCRItem {
  name: string;
  size: string;
  type: string;
  encryptedContent: ArrayBuffer;
  uploadIdentifier: string;

  iv: Uint8Array;
  timestamp: number;
  encryptedSymmetricKey: string;
  publicKey: JsonWebKey;
  privateKey: JsonWebKey;
  companyId: number;
  userId: number;
}

export interface IOCRItemDB {
  id: string;
  data: IOCRItem;
}
