import { NextRequest, NextResponse } from "next/server";
import { IOenCallbackData } from "@/interfaces/payment";
import { PAYMENT_STATUS } from "@/constants/status";
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

    /**
     * Info: (20261015 - Luphia) 個人購點的入帳已併入 `processOenPayment` 的交易
     * （區塊鏈退役）：收款、開收據、入點數帳本、訂單 COMPLETED 一次提交。
     * 原本交易提交後才在這裡鑄造鏈上點數，而且只有拿到 txHash 才標 COMPLETED。
     */
    await paymentRepo.processOenPayment(
      order,
      body,
      status,
      token as string | undefined,
    );

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
