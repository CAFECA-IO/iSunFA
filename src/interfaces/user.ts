export interface IUser {
  id: number;
  name: string;
  fullName: string | null;
  email: string | null;
  phone: string | null;
  kycStatus: boolean;
  credentialId: string;
  publicKey: string;
  algorithm: string;
  imageId?: string | null;
}
