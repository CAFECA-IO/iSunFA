import { API_ERRORS } from "@/lib/utils/error_dictionary";
import { generateKeyPair, exportPKCS8 } from "jose";
import { jsonOk, jsonFail } from "@/lib/utils/response";
export async function GET() {
  try {
    const { privateKey } = await generateKeyPair("ES256", {
      extractable: true,
    });
    const pkcs8Pem = await exportPKCS8(privateKey);

    return jsonOk({ key: pkcs8Pem });
  } catch (error) {
    console.error("Failed to generate key", error);
    return jsonFail(API_ERRORS.IS_KEY_FAILED);
  }
}
