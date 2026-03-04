import { NextRequest } from 'next/server';
import { getIdentityFromDeWT } from '@/lib/auth/dewt';
import { prisma } from '@/lib/prisma';
import { jsonOk, jsonFail } from '@/lib/utils/response';
import { ApiCode } from '@/lib/utils/status';
// import { DEFAULT_PLAN } from '@/constants/plans';
import { MODULES } from '@/constants/modules';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');

    // Info: (20251224 - Tzuhan) 1. Verify Token & Get User
    const user = await getIdentityFromDeWT(authHeader);

    if (!user) {
      return jsonFail(ApiCode.UNAUTHORIZED, 'Invalid or missing device token');
    }

    // Info: (20260302 - Tzuhan) [流程 6-1: 檢查綁卡狀態] 每次前端請求使用者資料時，取得該使用者所有的 OEN 綁定紀錄，供前端 PaymentModal 選擇
    const paymentMethods = await prisma.paymentMethod.findMany({
      where: { userId: user.id, provider: 'OEN' },
      select: {
        id: true,
        provider: true,
        data: true,
        isDefault: true,
        createdAt: true,
      }
    });

    // Info: (20260302 - Tzuhan) [機制: 處理中點數] 找出所有已扣款成功但還未上鏈的訂單點數加總，讓前端介面能顯示「處理中」，避免使用者誤以為扣款失敗
    const pendingOrders = await prisma.order.findMany({
      where: {
        userId: user.id,
        status: { in: ['PENDING', 'MINT_FAILED'] },
        type: 'OEN_PAYMENT',
        paymentTransactions: {
          some: {
            status: 'SUCCESS'
          }
        }
      },
    });

    const pendingCredits = pendingOrders.reduce((sum, order) => {
      const data = order.data as { credits?: number };
      return sum + (data?.credits || 0);
    }, 0);

    // ToDo: (20260116 - Luphia) Use Blockchain Data for Plan & Credits
    // let plan: string = DEFAULT_PLAN;
    // let credits = 0;

    if (user.identityAddress) {
      try {
        // Info: (20260116 - Luphia) Use Blockchain Data for Plan & Credits
        // Commented out as getPlan/getCredits are not in ABI currently
        /* 
        const [chainPlan, chainCredits] = await Promise.all([
          publicClient.readContract({
            address: user.identityAddress as Address,
            abi: ABIS.IDENTITY,
            functionName: 'getPlan',
          }),
          publicClient.readContract({
            address: user.identityAddress as Address,
            abi: ABIS.IDENTITY,
            functionName: 'getCredits',
          }),
        ]);
        plan = chainPlan as string;
        credits = Number(chainCredits);
        */
      } catch (err) {
        console.warn("Deprecate: (20260310 - Tzuhan) ", `[API] /auth/me failed to read contract for ${user.identityAddress}:`, err);
      }
    }

    return jsonOk({
      ...user,
      address: user.address,
      modules: MODULES.filter((m) => m.basic).map((m) => m.key),
      isAdmin: user.role === 'ADMIN',
      identityAddress: user.identityAddress,
      paymentMethods: paymentMethods.map(pm => ({
        ...pm,
        createdAt: pm.createdAt.toISOString()
      })),
      pendingCredits,
    });
  } catch (error) {
    console.error("Deprecate: (20260310 - Tzuhan) ", '[API] /auth/me error:', error);
    return jsonFail(ApiCode.INTERNAL_SERVER_ERROR, 'Internal Server Error');
  }
}
