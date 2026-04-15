import { webAuthnRepo } from "@/repositories/webauthn.repo";
import { validateAdminFido2 } from "@/lib/auth/admin_validator";
import { issuePurchasedPointsToMember } from "@/services/member.service";
import { paymentRepo } from "@/repositories/payment.repo";
import { jsonOk, jsonFail } from "@/lib/utils/response";
import { ApiCode } from "@/lib/utils/status";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ user_id: string }> },
) {
  try {
    const { user: adminUser, body } = await validateAdminFido2(req);

    const { user_id: userId } = await params;
    if (!userId) {
      return jsonFail(ApiCode.VALIDATION_ERROR, "Missing user_id");
    }

    const amount = Number(body.amount);

    if (isNaN(amount) || amount <= 0) {
      return jsonFail(
        ApiCode.VALIDATION_ERROR,
        "Issue amount must be greater than 0",
      );
    }

    const targetUser = await webAuthnRepo.findUserById(userId);
    if (!targetUser) {
      return jsonFail(ApiCode.NOT_FOUND, "Missing user");
    }

    const result = await issuePurchasedPointsToMember(
      targetUser.address,
      amount,
    );
    if (!result.success) {
      return jsonFail(ApiCode.VALIDATION_ERROR, result.message);
    }

    await paymentRepo.createOrder({
      userId: targetUser.id,
      type: "ADMIN_ISSUED",
      amount: amount,
      status: "COMPLETED",
      challenge: "admin_distribute",
      data: { adminIssued: true, issuedBy: adminUser.id },
      transactionHash: (result.data as { tx: string })?.tx || "",
    });

    return jsonOk(null, "Issue success");
  } catch (error) {
    return jsonFail(ApiCode.INTERNAL_SERVER_ERROR, (error as Error).message);
  }
}
