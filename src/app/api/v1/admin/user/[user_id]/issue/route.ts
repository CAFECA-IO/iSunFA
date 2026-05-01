import { API_ERRORS } from "@/lib/utils/error_dictionary";
import { webAuthnRepo } from "@/repositories/webauthn.repo";
import { validateAdminFido2 } from "@/lib/auth/admin_validator";
import { issuePurchasedPointsToMember } from "@/services/member.service";
import { paymentRepo } from "@/repositories/payment.repo";
import { jsonOk, jsonFail } from "@/lib/utils/response";
import { ApiCode } from "@/lib/utils/status";
import { CURRENCY_UNIT } from "@/constants/price";
import { ORDER_STATUS, ORDER_TYPE } from "@/constants/status";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ user_id: string }> },
) {
  try {
    const { user: adminUser, body } = await validateAdminFido2(req);

    const { user_id: userId } = await params;
    if (!userId) {
      return jsonFail(API_ERRORS.VL_MISSING_PARAMS);
    }

    const amount = Number(body.amount);

    if (isNaN(amount) || amount <= 0) {
      return jsonFail({
        code: "VA000099",
        message: "Issue amount must be greate...",
        status: ApiCode.VALIDATION_ERROR,
      });
    }

    const targetUser = await webAuthnRepo.findUserById(userId);
    if (!targetUser) {
      return jsonFail(API_ERRORS.NF_USER);
    }

    const result = await issuePurchasedPointsToMember(
      targetUser.address,
      amount,
    );
    if (!result.success) {
      return jsonFail({
        code: "VL000099",
        message: String(result.message).slice(0, 30),
        status: ApiCode.VALIDATION_ERROR,
      });
    }

    await paymentRepo.createOrder({
      userId: targetUser.id,
      type: ORDER_TYPE.ADMIN_ISSUED,
      amount: amount,
      unit: CURRENCY_UNIT.ICP,
      status: ORDER_STATUS.COMPLETED,
      challenge: "admin_distribute",
      data: { adminIssued: true, issuedBy: adminUser.id },
      transactionHash: (result.data as { tx: string })?.tx || "",
    });

    return jsonOk(null, "Issue success");
  } catch (error) {
    return jsonFail({
      code: "IS000099",
      message: String((error as Error).message).slice(0, 30),
      status: ApiCode.INTERNAL_SERVER_ERROR,
    });
  }
}
