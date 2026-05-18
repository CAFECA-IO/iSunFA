import { couponService } from "@/services/coupon.service";
import { jsonOk, jsonFail } from "@/lib/utils/response";
import { API_ERRORS } from "@/lib/utils/error_dictionary";

export async function PUT(
  request: Request,
  props: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await props.params;
    const body = await request.json();
    const {
      title,
      metadataHash,
      claimCode,
      redemptionDeadline,
      usageDeadline,
      maxClaims,
      isTransferable,
      customQrContent,
    } = body;

    const campaign = await couponService.updateCampaign(id, {
      title,
      metadataHash,
      claimCode,
      redemptionDeadline,
      usageDeadline,
      maxClaims,
      isTransferable,
      customQrContent,
    });

    return jsonOk(campaign);
  } catch (error) {
    console.error("Failed to update coupon campaign:", error);
    return jsonFail(API_ERRORS.IS_DB_FAILED);
  }
}

export async function DELETE(
  request: Request,
  props: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await props.params;

    await couponService.deleteCampaign(id);

    return jsonOk({ success: true });
  } catch (error) {
    console.error("Failed to delete coupon campaign:", error);
    return jsonFail(API_ERRORS.IS_DB_FAILED);
  }
}
