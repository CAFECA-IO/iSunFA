import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const orderId = searchParams.get("orderId");
  const status = searchParams.get("status");

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  const tab = searchParams.get("tab") || "credits";

  if (status === "success") {
    return NextResponse.redirect(
      `${appUrl}/pricing?payment_status=success&orderId=${orderId}&tab=${tab}`,
    );
  } else {
    return NextResponse.redirect(
      `${appUrl}/pricing?payment_status=error&orderId=${orderId}&tab=${tab}`,
    );
  }
}
