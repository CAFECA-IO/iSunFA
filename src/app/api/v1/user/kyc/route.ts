import { NextRequest } from 'next/server';
import { getIdentityFromDeWT } from '@/lib/auth/dewt';
import { jsonOk, jsonFail } from '@/lib/utils/response';
import { ApiCode } from '@/lib/utils/status';
import { registerUser } from '@/services/token.service';
import { ABIS, CONTRACT_ADDRESSES } from '@/config/contracts';
import { publicClient } from '@/lib/viem_public';

export async function POST(request: NextRequest) {
    try {
        const authHeader = request.headers.get('Authorization');
        const user = await getIdentityFromDeWT(authHeader);

        if (!user) {
            return jsonFail(ApiCode.UNAUTHORIZED, 'Invalid or expired token');
        }

        const body = await request.json();

        // Info: (20260202 - Tzuhan) Update KYC Data
        // const updatedUser = await webAuthnRepo.updateKYCData(user.id, body);
        console.log('[API] KYC Data updated for user:', user.address, "kycData:", body);

        console.log('[API] Registering identity for:', user.address, 'at Token:', CONTRACT_ADDRESSES.NTD_TOKEN);

        if (!CONTRACT_ADDRESSES.NTD_TOKEN) {
            throw new Error('Server Config Error: NTD Token Address is missing');
        }

        const result = await registerUser(CONTRACT_ADDRESSES.NTD_TOKEN, user.address);

        if (!result.success) {
            console.error('Identity registration failed:', result.message);
            return jsonFail(ApiCode.INTERNAL_SERVER_ERROR, `KYC saved but Identity deployment failed: ${result.message}`);
        }

        try {
            const identityAddress = await publicClient.readContract({
                address: CONTRACT_ADDRESSES.IDENTITY_REGISTRY, // Info: (20260202 - Tzuhan) We need registry address.
                abi: ABIS.IDENTITY_REGISTRY,
                functionName: 'identity',
                args: [user.address as `0x${string}`]
            });

            return jsonOk({
                identityDeployment: result,
                identityAddress,
            });
        } catch (e) {
            console.warn('Failed to fetch/update identity address:', e);
            return jsonFail(ApiCode.INTERNAL_SERVER_ERROR, 'Failed to fetch/update identity address');
        }


    } catch (error) {
        console.error('[API] /user/kyc error:', error);
        return jsonFail(ApiCode.INTERNAL_SERVER_ERROR, 'Internal Server Error');
    }
}
