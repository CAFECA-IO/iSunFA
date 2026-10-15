import {
  encodePacked,
  getAddress,
  keccak256,
  slice,
  stringToHex,
  type Address,
} from "viem";
import { ACCOUNT_ADDRESS_DERIVATION_TAG } from "@/constants/auth_provider";

/**
 * Info: (20261015 - Luphia) 鏈下、決定性的帳號位址推導（區塊鏈退役）。
 *
 * 原本的帳號位址是 SCW_FACTORY.getAddress（CREATE2）回傳的合約位址，必須打 RPC；
 * 自建鏈損毀後改由這支純函式推導。viem 在這裡只當雜湊函式庫使用，不碰任何節點。
 *
 * 推導規則：`getAddress(slice(keccak256(encodePacked(
 *   ['string','bytes','uint256','uint256'],
 *   [tag, stringToHex(credentialId), pubKeyX, pubKeyY])), 12))`
 *
 * - 同一組 (credentialId, pubKeyX, pubKeyY) 永遠得到同一個位址，因此重送註冊、
 *   伺服器重算都對得上；不同金鑰得到不同位址（碰撞機率等同 keccak256 的 160-bit 截斷）。
 * - 既有使用者的位址是當年鏈上算出來的，**不會**等於這裡的結果——它們已經在
 *   `User.address`，DB 為準，不重算也不改寫。這支只用於新建的帳號。
 * - 回傳 EIP-55 checksum 形式，與 viem 過去回傳合約位址的形狀一致。
 */
export interface IAccountKeyMaterial {
  credentialId: string;
  pubKeyX: string | bigint;
  pubKeyY: string | bigint;
}

function toUint256(value: string | bigint, field: string): bigint {
  let parsed: bigint;
  try {
    parsed = typeof value === "bigint" ? value : BigInt(value);
  } catch {
    throw new Error(`${field} is not an integer`);
  }
  // Info: (20261015 - Luphia) Fail Fast：P-256 座標必為 0 < v < 2^256，越界代表上游解析錯誤
  if (parsed <= BigInt(0) || parsed >= BigInt(2) ** BigInt(256)) {
    throw new Error(`${field} is out of uint256 range`);
  }
  return parsed;
}

export function deriveAccountAddress(material: IAccountKeyMaterial): Address {
  if (!material.credentialId) {
    throw new Error("credentialId is required");
  }
  const pubKeyX = toUint256(material.pubKeyX, "pubKeyX");
  const pubKeyY = toUint256(material.pubKeyY, "pubKeyY");

  const digest = keccak256(
    encodePacked(
      ["string", "bytes", "uint256", "uint256"],
      [
        ACCOUNT_ADDRESS_DERIVATION_TAG,
        stringToHex(material.credentialId),
        pubKeyX,
        pubKeyY,
      ],
    ),
  );

  return getAddress(slice(digest, 12));
}
