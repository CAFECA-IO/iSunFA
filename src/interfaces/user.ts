import { Role } from "@/constants/role";
import { JSONValue } from "@/validators/common";

// Info: (20260511 - Julian) 根據 Prisma schema 定義 User 型別
export interface IUser {
  id: string;
  address: string;
  pubKeyX: string | null;
  pubKeyY: string | null;
  credentialId: string | null;
  name: string | null;
  imageUrl: string | null;
  role: Role | string;
  currentChallenge: string | null;
  identityAddress: string | null;
  createdAt: Date;
  updatedAt: Date;
  kycData?: JSONValue;
}
