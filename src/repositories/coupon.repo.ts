import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated";
import { COUPON_STATUS } from "@/constants/status";

export class CouponRepository {
  async getCampaigns(skip: number, take: number) {
    const [totalElements, campaigns] = await Promise.all([
      prisma.couponCampaign.count(),
      prisma.couponCampaign.findMany({
        skip,
        take,
        orderBy: { createdAt: "desc" },
      }),
    ]);
    return { totalElements, campaigns };
  }

  async createCampaign(data: Prisma.CouponCampaignCreateInput) {
    return prisma.couponCampaign.create({ data });
  }

  async updateCampaign(id: string, data: Prisma.CouponCampaignUpdateInput) {
    return prisma.couponCampaign.update({
      where: { id },
      data,
    });
  }

  async deleteCampaign(id: string) {
    return prisma.couponCampaign.delete({
      where: { id },
    });
  }

  async airdrop(
    campaignId: string,
    users: { userId: string; customQrContent?: string }[],
  ) {
    return prisma.$transaction(async (tx) => {
      const campaign = await tx.couponCampaign.findUnique({
        where: { id: campaignId },
      });
      if (!campaign) throw new Error("Campaign not found");

      if (
        campaign.maxClaims > 0 &&
        campaign.claimsCount + users.length > campaign.maxClaims
      ) {
        throw new Error("Exceeds max claims limit");
      }

      const userIds = users.map((u) => u.userId);
      const existingRecords = await tx.coupon.findMany({
        where: {
          campaignId,
          userId: { in: userIds },
        },
      });
      const existingUserIds = existingRecords.map(
        (r: { userId: string }) => r.userId,
      );
      const newUsers = users.filter((u) => !existingUserIds.includes(u.userId));

      if (newUsers.length === 0) return { airdropped: 0 };

      await tx.coupon.createMany({
        data: newUsers.map((user) => ({
          userId: user.userId,
          campaignId,
          txHashClaim: "AIRDROP_PENDING",
          customQrContent: user.customQrContent || null,
        })),
      });

      await tx.couponCampaign.update({
        where: { id: campaignId },
        data: {
          claimsCount: {
            increment: newUsers.length,
          },
        },
      });

      return { airdropped: newUsers.length };
    });
  }
  async getUserCoupons(userId: string) {
    return prisma.coupon.findMany({
      where: { userId },
      include: { campaign: true },
      orderBy: { createdAt: "desc" },
    });
  }

  async claimCoupon(userId: string, claimCode: string) {
    return prisma.$transaction(async (tx) => {
      const campaign = await tx.couponCampaign.findUnique({
        where: { claimCode },
      });

      if (!campaign) {
        throw new Error("Invalid claim code");
      }

      if (campaign.redemptionDeadline < new Date()) {
        throw new Error("Coupon redemption period has expired");
      }

      if (
        campaign.maxClaims > 0 &&
        campaign.claimsCount >= campaign.maxClaims
      ) {
        throw new Error("Coupon is fully claimed");
      }

      const existingRecord = await tx.coupon.findFirst({
        where: {
          userId,
          campaignId: campaign.id,
        },
      });

      if (existingRecord) {
        throw new Error("User has already claimed this coupon");
      }

      const record = await tx.coupon.create({
        data: {
          userId,
          campaignId: campaign.id,
          txHashClaim: "CLAIM_PENDING",
        },
        include: { campaign: true },
      });

      await tx.couponCampaign.update({
        where: { id: campaign.id },
        data: {
          claimsCount: {
            increment: 1,
          },
        },
      });

      return record;
    });
  }

  async useCoupon(userId: string, recordId: string) {
    const record = await prisma.coupon.findFirst({
      where: {
        id: recordId,
        userId,
      },
    });

    if (!record) {
      throw new Error("Coupon record not found");
    }

    if (record.status !== COUPON_STATUS.ACTIVE) {
      throw new Error("Coupon is not active");
    }

    return prisma.coupon.update({
      where: { id: recordId },
      data: {
        status: COUPON_STATUS.USED,
      },
      include: { campaign: true },
    });
  }

  async getCoupons(
    page: number,
    limit: number,
    campaignId?: string,
    search?: string,
  ) {
    const skip = (page - 1) * limit;

    const where: Prisma.CouponWhereInput = {};

    if (campaignId) {
      where.campaignId = campaignId;
    }

    if (search) {
      where.user = {
        OR: [
          {
            name: {
              contains: search,
              mode: "insensitive",
            },
          },
          {
            address: {
              contains: search,
              mode: "insensitive",
            },
          },
        ],
      };
    }

    const [totalElements, coupons] = await Promise.all([
      prisma.coupon.count({ where }),
      prisma.coupon.findMany({
        where,
        skip,
        take: limit,
        include: {
          user: true,
          campaign: true,
        },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    return {
      data: coupons,
      totalElements,
      totalPages: Math.ceil(totalElements / limit),
    };
  }

  async forceResetCouponStatus(couponId: string) {
    return prisma.coupon.update({
      where: { id: couponId },
      data: {
        status: COUPON_STATUS.ACTIVE,
        txHashBurn: null,
      },
      include: {
        user: true,
        campaign: true,
      },
    });
  }
}

export const couponRepo = new CouponRepository();
