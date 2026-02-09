import { CREDIT_PLANS } from '@/config/credit_plans';
import { jsonOk, jsonFail } from '@/lib/utils/response';
import { ApiCode } from '@/lib/utils/status';

export async function GET() {
    try {
        return jsonOk(CREDIT_PLANS);
    } catch (error) {
        console.error('Failed to fetch pricing plans:', error);
        return jsonFail(ApiCode.INTERNAL_SERVER_ERROR, 'Failed to fetch pricing plans');
    }
}
