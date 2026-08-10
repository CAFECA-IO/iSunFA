// Info: (20260809 - Luphia) 託管簽章金鑰資料存取層（唯一碰 Prisma）；只進出密文，不做加解密
import { Prisma, UserCustodialKey } from "@/generated";
import { prisma } from "@/lib/prisma";

export interface ICreateCustodialKeyParams {
  userId: string;
  credentialId: string;
  pubKeyX: string;
  pubKeyY: string;
  encryptedPrivateKey: string;
  iv: string;
  authTag: string;
  keyVersion: number;
}

export interface ICustodialKeyRepository {
  findByUserId(userId: string): Promise<UserCustodialKey | null>;
  create(
    params: ICreateCustodialKeyParams,
    tx?: Prisma.TransactionClient,
  ): Promise<UserCustodialKey>;
  deleteByUserId(userId: string): Promise<void>;
  count(): Promise<number>;
}

class CustodialKeyRepository implements ICustodialKeyRepository {
  public async findByUserId(userId: string): Promise<UserCustodialKey | null> {
    return prisma.userCustodialKey.findUnique({ where: { userId } });
  }

  public async create(
    params: ICreateCustodialKeyParams,
    tx?: Prisma.TransactionClient,
  ): Promise<UserCustodialKey> {
    const client = tx ?? prisma;
    return client.userCustodialKey.create({ data: params });
  }

  public async deleteByUserId(userId: string): Promise<void> {
    await prisma.userCustodialKey.deleteMany({ where: { userId } });
  }

  // Info: (20260810 - Luphia) 現存託管金鑰數量；換發保險庫主密鑰前必須確認不會讓它們解不開
  public async count(): Promise<number> {
    return prisma.userCustodialKey.count();
  }
}

export const custodialKeyRepo = new CustodialKeyRepository();
