import { NextRequest, NextResponse } from "next/server";
import { mintToAddress } from "@/services/token.service";
import { CONTRACT_ADDRESSES } from "@/config/contracts";
import { IOenCallbackData } from "@/interfaces/payment";
import { PAYMENT_STATUS, PAYMENT_PROVIDER } from "@/constants/status";
import { paymentRepo } from "@/repositories/payment.repo";

export async function POST(request: NextRequest) {
  try {
    let bodyText = "";
    let body: IOenCallbackData;
    try {
      if (
        request.headers
          .get("content-type")
          ?.includes("application/x-www-form-urlencoded")
      ) {
        const formData = await request.formData();
        bodyText = JSON.stringify(Object.fromEntries(formData.entries()));
        body = Object.fromEntries(formData.entries());
      } else {
        bodyText = await request.text();
        body = JSON.parse(bodyText);
      }
    } catch (err) {
      console.warn(
        "Deprecate: (20260310 - Tzuhan) ",
        "[OEN Callback] Failed to parse payload:",
        err,
      );
      return NextResponse.json(
        { message: "Invalid payload format" },
        { status: 400 },
      );
    }

    let customId = body.customId;
    if (typeof customId === "string" && customId.startsWith("{")) {
      try {
        customId = JSON.parse(customId).orderId || customId;
      } catch (err) {
        console.warn(
          "Deprecate: (20260310 - Tzuhan) ",
          "[OEN Callback] Failed to parse customId as JSON:",
          err,
        );
      }
    }

    const { token } = body;
    const status = body.success
      ? PAYMENT_STATUS.SUCCESS
      : PAYMENT_STATUS.FAILED;

    if (!customId) {
      return NextResponse.json(
        { message: "No customId provided" },
        { status: 400 },
      );
    }

    const order = await paymentRepo.getOrderWithUser(customId as string);

    if (!order) {
      return NextResponse.json({ message: "Order not found" }, { status: 404 });
    }

    const { shouldMint, creditsToMint, amountPaid } =
      await paymentRepo.processOenPayment(
        order,
        body,
        status,
        token as string | undefined,
      );

    if (shouldMint && creditsToMint > 0 && order.user?.address) {
      const memo = JSON.stringify({
        provider: PAYMENT_PROVIDER.OEN_CALLBACK,
        orderId: order.id,
        amount: amountPaid,
      });
      const mintResult = await mintToAddress(
        CONTRACT_ADDRESSES.NTD_TOKEN,
        order.user.address,
        creditsToMint,
        memo,
      );

      if (!mintResult.success) {
        await paymentRepo.updateOrderMintFailed(
          order.id,
          order.data as object,
          body,
          mintResult.message,
        );
        // Info: (20260406 - Luphia) We don't return 500 here because the webhook itself is technically processed successfully up to minting.
      } else {
        const txHash = (mintResult.data as { tx: string })?.tx;
        if (txHash) {
          await paymentRepo.updateOrderCompleted(order.id, txHash);
        }
      }
    }

    return NextResponse.json({ message: "OK" });
  } catch (err) {
    console.warn(
      "Deprecate: (20260310 - Tzuhan) ",
      "[OEN Callback] Error processing webhook:",
      err,
    );
    return NextResponse.json(
      { message: "Internal Server Error" },
      { status: 500 },
    );
  }
}
