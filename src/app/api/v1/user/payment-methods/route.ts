import { NextRequest } from 'next/server';
import { getIdentityFromDeWT } from '@/lib/auth/dewt';
import { prisma } from '@/lib/prisma';
import { jsonOk, jsonFail } from '@/lib/utils/response';
import { ApiCode } from '@/lib/utils/status';

export async function GET(request: NextRequest) {
    try {
        const authHeader = request.headers.get('Authorization');
        const user = await getIdentityFromDeWT(authHeader);

        if (!user) {
            return jsonFail(ApiCode.UNAUTHORIZED, 'Invalid or missing device token');
        }

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

        return jsonOk({
            paymentMethods: paymentMethods.map(pm => ({
                ...pm,
                createdAt: pm.createdAt.toISOString()
            })),
        });
    } catch (error) {
        console.error("Deprecate: (20260310 - Tzuhan) ", '[API] /user/payment-methods error:', error);
        return jsonFail(ApiCode.INTERNAL_SERVER_ERROR, 'Internal Server Error');
    }
}
