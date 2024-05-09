export interface IUser {
  id: string;
  name: string;
  fullName?: string;
  email?: string;
  phone?: string;
  kycStatus?: string;
  credentialId: string;
  publicKey: string;
  algorithm: string;
  imageId?: string;
}
