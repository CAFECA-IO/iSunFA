import { JsonWebKeySchema } from '@/lib/utils/zod_schema/json_web_key';

export function parseJsonWebKeyFromString(jwkString: string): JsonWebKey {
  try {
    // Step 1: 解析 JSON 字串
    const parsedObject = JSON.parse(jwkString);

    // Step 2: 驗證結構
    const result = JsonWebKeySchema.safeParse(parsedObject);
    if (!result.success) {
      throw new Error('Invalid JWK structure');
    }

    // Step 3: 返回驗證成功的 JWK 物件
    return result.data;
  } catch (error) {
    throw new Error('Failed to parse JWK string');
  }
}
