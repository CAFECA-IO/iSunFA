import { NextRequest } from "next/server";
import { getIdentityFromDeWT } from "@/lib/auth/dewt";
import { jsonOk, jsonFail } from "@/lib/utils/response";
import { API_ERRORS } from "@/lib/utils/error_dictionary";
import { CHATROOM_KEY_ALGORITHMS } from "@/constants/chatroom_key";
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

    const { encryptionPublicKey, wrappedPrivateKey, prfSalt, algorithm } =
      await request.json();
    if (!encryptionPublicKey || !wrappedPrivateKey || !prfSalt) {
      return jsonFail(API_ERRORS.VL_MISSING_PARAMS);
    }

    /**
     * Info: (20260812 - Luphia) 記下這一列是**誰包裝的**（PR review P-1）。
     *
     * 原本這個欄位只吃 schema 的預設值 `WebAuthnPRF-…`,而對託管列來說那是錯的。
     * 沒有這個標記,「哪些對話的金鑰在平台手上」只能回頭 join UserCustodialKey
     * 推論當時的 custody —— 而 custody 會變;ADR 016 承諾的「補綁 passkey 後
     * 重新包裝」也找不出要重包哪些列。
     *
     * 走白名單而不是原封收下:這個值會被解包前的比對當成判斷依據,
     * 讓呼叫端塞任意字串等於讓它自己決定「要不要被檢查」。
     */
    if (
      algorithm !== undefined &&
      !CHATROOM_KEY_ALGORITHMS.includes(algorithm)
    ) {
      return jsonFail(API_ERRORS.VL_SCHEMA_ERROR);
    }

    await userEncryptionKeyRepo.upsert({
      userAddress: sessionUser.address,
      encryptionPublicKey,
      wrappedPrivateKey,
      prfSalt,
      algorithm,
    });
    return jsonOk({ registered: true });
  } catch (error) {
    console.error("[API] /user/encryption_key POST error:", error);
    return jsonFail(API_ERRORS.IS_UNKNOWN);
  }
}
