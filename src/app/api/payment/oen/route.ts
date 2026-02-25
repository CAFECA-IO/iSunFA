import { NextRequest, NextResponse } from "next/server";
import { getIdentityFromDeWT } from "@/lib/auth/dewt";
import { jsonFail, jsonOk } from "@/lib/utils/response";
import { ApiCode } from "@/lib/utils/status";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");
    let authHeader = request.headers.get("Authorization");

    if (token) {
      authHeader = `Bearer ${token}`;
    }

    const user = await getIdentityFromDeWT(authHeader);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const oenApiUrl = "https://payment-api.testing.oen.tw/checkout-token";
    const merchantId = process.env.OEN_MERCHANT_ID;
    const paymentToken = process.env.OEN_PAYMENT_TOKEN;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    const customId = `bind_${user.id}`;

    const paymentBody = {
      merchantId,
      customId,
      successUrl: `${appUrl}/api/v1/payment/oen/callback?action=bind&status=success`,
      failureUrl: `${appUrl}/api/v1/payment/oen/callback?action=bind&status=failed`,
    };

    console.log(
      "[API] /payment/oen requesting binding checkout token:",
      paymentBody,
    );

    const response = await fetch(oenApiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${paymentToken}`,
      },
      body: JSON.stringify(paymentBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(
        "[API] /payment/oen API error:",
        response.status,
        errorText,
      );
      return NextResponse.json(
        { error: "Failed to create payment session for binding" },
        { status: 500 },
      );
    }

    const responseData = await response.json();

    if (!responseData.success && !responseData.id && !responseData.data?.id) {
      console.error("[API] /payment/oen business error:", responseData);
      return NextResponse.json(
        { error: "Failed to initialize binding" },
        { status: 500 },
      );
    }

    const id = responseData.data?.id || responseData.id;

    const paymentUrl = `https://${merchantId}.testing.oen.tw/checkout/subscription/create/${id}`;

    return NextResponse.redirect(paymentUrl);
  } catch (error) {
    console.error("[API] /payment/oen error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("Authorization");
    const user = await getIdentityFromDeWT(authHeader);

    if (!user) {
      return jsonFail(ApiCode.UNAUTHORIZED, "Invalid or expired token");
    }

    const oenApiUrl = "https://payment-api.testing.oen.tw/checkout-token";
    const merchantId = process.env.OEN_MERCHANT_ID;
    const paymentToken = process.env.OEN_PAYMENT_TOKEN;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    const customId = `bind_${user.id}`;

    const paymentBody = {
      merchantId,
      customId,
      successUrl: `${appUrl}/api/v1/payment/oen/callback?action=bind&status=success`,
      failureUrl: `${appUrl}/api/v1/payment/oen/callback?action=bind&status=failed`,
    };

    const response = await fetch(oenApiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${paymentToken}`,
      },
      body: JSON.stringify(paymentBody),
    });

    if (!response.ok) {
      return jsonFail(
        ApiCode.INTERNAL_SERVER_ERROR,
        "Failed to create payment session for binding",
      );
    }

    const responseData = await response.json();
    const id = responseData.data?.id || responseData.id;
    const paymentUrl = `https://${merchantId}.testing.oen.tw/checkout/subscription/create/${id}`;

    return jsonOk({ oenResponse: { paymentUrl } });
  } catch (error) {
    console.error("[API] /payment/oen error:", error);
    return jsonFail(ApiCode.INTERNAL_SERVER_ERROR, "Internal Server Error");
  }
}
