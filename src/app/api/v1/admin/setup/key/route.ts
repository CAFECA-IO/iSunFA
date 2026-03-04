import { generateKeyPair, exportPKCS8 } from 'jose';
import { jsonOk, jsonFail } from '@/lib/utils/response';
import { ApiCode } from '@/lib/utils/status';

export async function GET() {
  try {
    const { privateKey } = await generateKeyPair('ES256', { extractable: true });
    const pkcs8Pem = await exportPKCS8(privateKey);

    return jsonOk({ key: pkcs8Pem });
  } catch (error) {
    console.error('Failed to generate key', error);
    return jsonFail(ApiCode.INTERNAL_SERVER_ERROR, 'Failed to generate key');
  }
}
