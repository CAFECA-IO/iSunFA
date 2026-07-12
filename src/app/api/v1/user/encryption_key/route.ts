import { NextRequest } from "next/server";
import { getIdentityFromDeWT } from "@/lib/auth/dewt";
import { jsonOk, jsonFail } from "@/lib/utils/response";
import { API_ERRORS } from "@/lib/utils/error_dictionary";
import { userEncryptionKeyRepo } from "@/repositories/user_encryption_key.repo";

// Info: (20260712 - Luphia) 查詢加密公鑰；帶 ?address= 取他人公鑰（供加密給對方），否則取自己（含 PRF 包裝私鑰供解包）
export async function GET(request: NextRequest) {
  try {
    const sessionUser = await getIdentityFromDeWT(
      request.headers.get("Authorization"),
    );
    if (!sessionUser) {
      return jsonFail(API_ERRORS.AUTH_INVALID_TOKEN);
    }

    const address = request.nextUrl.searchParams.get("address");
    if (address) {
      const record = await userEncryptionKeyRepo.findByUserAddress(address);
      return jsonOk(
        record ? { encryptionPublicKey: record.encryptionPublicKey } : null,
      );
    }

    const own = await userEncryptionKeyRepo.findByUserAddress(
      sessionUser.address,
    );
    return jsonOk(
      own
        ? {
            encryptionPublicKey: own.encryptionPublicKey,
            wrappedPrivateKey: own.wrappedPrivateKey,
            prfSalt: own.prfSalt,
            algorithm: own.algorithm,
          }
        : null,
    );
  } catch (error) {
    console.error("[API] /user/encryption_key GET error:", error);
    return jsonFail(API_ERRORS.IS_UNKNOWN);
  }
}

// Info: (20260712 - Luphia) 註冊/更新自身加密金鑰：只存公鑰、PRF 包裝後的主私鑰密文與 PRF salt
export async function POST(request: NextRequest) {
  try {
    const sessionUser = await getIdentityFromDeWT(
      request.headers.get("Authorization"),
    );
    if (!sessionUser) {
      return jsonFail(API_ERRORS.AUTH_INVALID_TOKEN);
    }

    const { encryptionPublicKey, wrappedPrivateKey, prfSalt } =
      await request.json();
    if (!encryptionPublicKey || !wrappedPrivateKey || !prfSalt) {
      return jsonFail(API_ERRORS.VL_MISSING_PARAMS);
    }

    await userEncryptionKeyRepo.upsert({
      userAddress: sessionUser.address,
      encryptionPublicKey,
      wrappedPrivateKey,
      prfSalt,
    });
    return jsonOk({ registered: true });
  } catch (error) {
    console.error("[API] /user/encryption_key POST error:", error);
    return jsonFail(API_ERRORS.IS_UNKNOWN);
  }
}
