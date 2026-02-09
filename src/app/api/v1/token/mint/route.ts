import { NextRequest } from 'next/server';
import { getIdentityFromDeWT } from '@/lib/auth/dewt';
import { jsonOk, jsonFail } from '@/lib/utils/response';
import { ApiCode } from '@/lib/utils/status';
import { mintToAddress } from '@/services/token.service';
import { CONTRACT_ADDRESSES } from '@/config/contracts';

export async function POST(request: NextRequest) {
    try {
        const authHeader = request.headers.get('Authorization');
        const user = await getIdentityFromDeWT(authHeader);

        if (!user) {
            return jsonFail(ApiCode.UNAUTHORIZED, 'Invalid or expired token');
        }

        const { amount } = await request.json();

        if (!amount || amount <= 0) {
            return jsonFail(ApiCode.VALIDATION_ERROR, 'Invalid amount');
        }

        const result = await mintToAddress(CONTRACT_ADDRESSES.NTD_TOKEN, user.address, amount);

        if (!result.success) {
            return jsonFail(ApiCode.INTERNAL_SERVER_ERROR, result.message);
        }

        return jsonOk({
            txHash: (result.data as { tx: string })?.tx,
            message: 'Minting successful'
        });

    } catch (error) {
        console.error('[API] /token/mint error:', error);
        return jsonFail(ApiCode.INTERNAL_SERVER_ERROR, 'Internal Server Error');
    }
}
