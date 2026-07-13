// Info: (20260712 - Luphia) 用戶加密金鑰資料存取層（唯一碰 Prisma）；只存公鑰與 PRF 包裝後的主私鑰密文
import { prisma } from "@/lib/prisma";

export interface IUpsertUserEncryptionKeyParams {
  userAddress: string;
  encryptionPublicKey: string;
  wrappedPrivateKey: string;
  prfSalt: string;
  algorithm?: string;
}

export class UserEncryptionKeyRepository {
  async findByUserAddress(userAddress: string) {
    return prisma.userEncryptionKey.findUnique({ where: { userAddress } });
  }

  async upsert(params: IUpsertUserEncryptionKeyParams) {
    const { userAddress, encryptionPublicKey, wrappedPrivateKey, prfSalt } =
      params;
    return prisma.userEncryptionKey.upsert({
      where: { userAddress },
      update: {
        encryptionPublicKey,
        wrappedPrivateKey,
        prfSalt,
        ...(params.algorithm ? { algorithm: params.algorithm } : {}),
      },
      create: {
        userAddress,
        encryptionPublicKey,
        wrappedPrivateKey,
        prfSalt,
        ...(params.algorithm ? { algorithm: params.algorithm } : {}),
      },
    });
  }
}

export const userEncryptionKeyRepo = new UserEncryptionKeyRepository();
