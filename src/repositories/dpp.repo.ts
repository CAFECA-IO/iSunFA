import { prisma } from "@/lib/prisma";
import {
  IDigitalProductPassportSku,
  IDigitalProductPassportBatch,
} from "@/interfaces/dpp";
import { JSONValue } from "@/validators/common";
import {
  DigitalProductPassportSku,
  DigitalProductPassportBatch,
  Prisma,
} from "@/generated";

export class DppRepository {
  public async getSkuById(
    skuId: string,
  ): Promise<IDigitalProductPassportSku | null> {
    const sku = await prisma.digitalProductPassportSku.findUnique({
      where: { id: skuId },
    });
    if (!sku) return null;
    return this.mapSkuToInterface(sku);
  }

  public async verifyAccountBookAccess(
    accountBookId: string,
    userAddress: string,
  ) {
    return prisma.accountBook.findUnique({
      where: {
        id: accountBookId,
        team: {
          teamMembers: {
            some: {
              user: {
                address: userAddress,
              },
            },
          },
        },
      },
    });
  }

  public async getSkuByIdWithTeamAccess(skuId: string, address: string) {
    const sku = await prisma.digitalProductPassportSku.findUnique({
      where: { id: skuId },
      include: {
        accountBook: {
          include: {
            team: {
              include: { teamMembers: { where: { user: { address } } } },
            },
          },
        },
      },
    });
    return sku;
  }

  public async createSku(data: {
    accountBookId: string;
    gtin: string;
    name: string;
    status: string;
    modulesData: Prisma.InputJsonValue;
    missingGaps: Prisma.InputJsonValue;
  }): Promise<IDigitalProductPassportSku> {
    const sku = await prisma.digitalProductPassportSku.create({
      data,
    });
    return this.mapSkuToInterface(sku);
  }

  public async getBatchByNumber(
    skuId: string,
    batchNumber: string,
  ): Promise<IDigitalProductPassportBatch | null> {
    const batch = await prisma.digitalProductPassportBatch.findFirst({
      where: { skuId, batchNumber },
    });
    if (!batch) return null;
    return this.mapBatchToInterface(batch);
  }

  public async createBatch(data: {
    skuId: string;
    batchNumber: string;
    serialRange: string | null;
    manufactureDate: Date;
    facilitySite: string;
    publicUrl: string;
    dynamicOverrides: Prisma.InputJsonValue;
  }): Promise<IDigitalProductPassportBatch> {
    const batch = await prisma.digitalProductPassportBatch.create({
      data,
    });
    return this.mapBatchToInterface(batch);
  }

  private mapSkuToInterface(
    sku: DigitalProductPassportSku,
  ): IDigitalProductPassportSku {
    return {
      id: sku.id,
      accountBookId: sku.accountBookId,
      gtin: sku.gtin,
      name: sku.name,
      status: sku.status,
      modulesData: sku.modulesData as JSONValue,
      missingGaps: sku.missingGaps as JSONValue,
      createdAt: sku.createdAt,
      updatedAt: sku.updatedAt,
    };
  }

  private mapBatchToInterface(
    batch: DigitalProductPassportBatch,
  ): IDigitalProductPassportBatch {
    return {
      id: batch.id,
      skuId: batch.skuId,
      batchNumber: batch.batchNumber,
      serialRange: batch.serialRange,
      manufactureDate: batch.manufactureDate,
      facilitySite: batch.facilitySite,
      dynamicOverrides: batch.dynamicOverrides as JSONValue,
      publicUrl: batch.publicUrl,
      createdAt: batch.createdAt,
    };
  }
}
