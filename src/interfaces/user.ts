import { Role } from "@/constants/role";

// Info: (20260508 - Julian) 定義標準的 JSON 型別
type IJsonValue =
  | string
  | number
  | boolean
  | null
  | IJsonValue[]
  | { [key: string]: IJsonValue };

type IJsonObject = { [key: string]: IJsonValue };

// Info: (20260508 - Julian) 根據 Prisma schema 定義 User 型別
export interface IUser {
  id: string;
  identityAddress: string | null;
  address: string;
  pubKeyX: string | null;
  pubKeyY: string | null;
  credentialId: string | null;
  currentChallenge: string | null;
  name: string | null;
  imageUrl: string | null;
  kycData: IJsonObject | null;
  role: Role | string;
  createdAt: number;
  updatedAt: number;
}
