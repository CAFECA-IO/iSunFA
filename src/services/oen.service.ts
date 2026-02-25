import { User } from "@/generated/client";

interface IProductDetail {
  productionCode: string;
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
}

export const chargeCreditCardToken = async (
  user: User,
  orderId: string,
  amount: number,
  productDetails: IProductDetail[],
) => {
  if (!user.oenPaymentToken) {
    throw new Error("User has no bounded credit card token");
  }

  const oenApiUrl = "https://payment-api.testing.oen.tw/token/transactions";
  const merchantId = process.env.OEN_MERCHANT_ID;
  const paymentToken = process.env.OEN_PAYMENT_TOKEN;

  const payload = {
    merchantId,
    amount,
    currency: "TWD",
    token: user.oenPaymentToken,
    orderId,
    userName: user.name || `User-${user.id.substring(0, 8)}`,
    userEmail: "support@cafeca.io",
    productDetails,
  };

  console.log(
    `[Oen Service] Charging user ${user.id} against token. Order: ${orderId}, Amount: ${amount}`,
  );

  const response = await fetch(oenApiUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${paymentToken}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(
      `[Oen Service] Charging failed for order ${orderId}:`,
      response.status,
      errorText,
    );
    throw new Error(`Token charging failed with status ${response.status}`);
  }

  const responseData = await response.json();
  console.log(
    `[Oen Service] Charging successful for order ${orderId}:`,
    responseData,
  );

  return responseData;
};
