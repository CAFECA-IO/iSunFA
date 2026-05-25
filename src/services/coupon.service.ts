import { couponRepo } from "@/repositories/coupon.repo";
import { Prisma } from "@/generated";

export class CouponService {
  async getCampaigns(page: number, limit: number) {
    const skip = (page - 1) * limit;
    const { totalElements, campaigns } = await couponRepo.getCampaigns(
      skip,
      limit,
    );
    return {
      data: campaigns,
      pagination: {
        page,
        limit,
        totalElements,
        totalPages: Math.ceil(totalElements / limit),
      },
    };
  }

  async createCampaign(data: {
    title: string;
    metadataHash: string;
    claimCode?: string | null;
    redemptionDeadline: string | Date;
    usageDeadline: string | Date;
    maxClaims?: number;
    isTransferable?: boolean;
    customQrContent?: string | null;
  }) {
    return couponRepo.createCampaign({
      title: data.title,
      metadataHash: data.metadataHash,
      claimCode: data.claimCode || null,
      redemptionDeadline: new Date(data.redemptionDeadline),
      usageDeadline: new Date(data.usageDeadline),
      maxClaims: data.maxClaims || 0,
      isTransferable: data.isTransferable ?? true,
      customQrContent: data.customQrContent || null,
    });
  }

  async updateCampaign(
    id: string,
    data: {
      title?: string;
      metadataHash?: string;
      claimCode?: string | null;
      redemptionDeadline?: string | Date;
      usageDeadline?: string | Date;
      maxClaims?: number;
      isTransferable?: boolean;
      customQrContent?: string | null;
    },
  ) {
    const updateData: Prisma.CouponCampaignUpdateInput = {};
    if (data.title !== undefined) updateData.title = data.title;
    if (data.metadataHash !== undefined)
      updateData.metadataHash = data.metadataHash;
    if (data.claimCode !== undefined)
      updateData.claimCode = data.claimCode || null;
    if (data.redemptionDeadline)
      updateData.redemptionDeadline = new Date(data.redemptionDeadline);
    if (data.usageDeadline)
      updateData.usageDeadline = new Date(data.usageDeadline);
    if (data.maxClaims !== undefined) updateData.maxClaims = data.maxClaims;
    if (data.isTransferable !== undefined)
      updateData.isTransferable = data.isTransferable;
    if (data.customQrContent !== undefined)
      updateData.customQrContent = data.customQrContent || null;

    return couponRepo.updateCampaign(id, updateData);
  }

  async deleteCampaign(id: string) {
    return couponRepo.deleteCampaign(id);
  }

  async airdrop(
    campaignId: string,
    users: { userId: string; customQrContent?: string }[],
  ) {
    return couponRepo.airdrop(campaignId, users);
  }

  async getUserCoupons(userId: string) {
    return couponRepo.getUserCoupons(userId);
  }

  async claimCoupon(userId: string, claimCode: string) {
    return couponRepo.claimCoupon(userId, claimCode);
  }

  async useCoupon(userId: string, recordId: string) {
    return couponRepo.useCoupon(userId, recordId);
  }

  async getCoupons(
    page: number,
    limit: number,
    campaignId?: string,
    search?: string,
  ) {
    const { data, totalElements, totalPages } = await couponRepo.getCoupons(
      page,
      limit,
      campaignId,
      search,
    );
    return {
      data,
      pagination: {
        page,
        limit,
        totalElements,
        totalPages,
      },
    };
  }

  async forceResetCouponStatus(couponId: string) {
    return couponRepo.forceResetCouponStatus(couponId);
  }
}

export const couponService = new CouponService();
