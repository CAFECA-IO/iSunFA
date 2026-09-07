import { describe, it, expect } from "@jest/globals";
import { AppError } from "@/lib/utils/error";
import { API_ERRORS } from "@/lib/utils/error_dictionary";
import {
  isPrismaError,
  PRISMA_ERROR,
  rethrowAsAppError,
} from "@/lib/utils/prisma_error";

/**
 * Info: (20260814 - Julian) Prisma 錯誤的包裝。
 *
 * 最重要的一條是「沒對應到的原樣拋回」—— 把未知錯誤也包成某個業務錯誤，
 * 等於用一個看起來合理的訊息蓋住真正的故障。
 */

const prismaError = (code: string) => ({ code, clientVersion: "7.8.0" });

describe("isPrismaError", () => {
  it("以 code 欄位辨識，不依賴 instanceof", () => {
    expect(
      isPrismaError(prismaError("P2002"), PRISMA_ERROR.UNIQUE_CONSTRAINT),
    ).toBe(true);
  });

  it("代碼不同就是 false", () => {
    expect(
      isPrismaError(prismaError("P2025"), PRISMA_ERROR.UNIQUE_CONSTRAINT),
    ).toBe(false);
  });

  it("非物件、null、沒有 code 的一律 false", () => {
    expect(isPrismaError(null, PRISMA_ERROR.UNIQUE_CONSTRAINT)).toBe(false);
    expect(isPrismaError("P2002", PRISMA_ERROR.UNIQUE_CONSTRAINT)).toBe(false);
    expect(
      isPrismaError(new Error("boom"), PRISMA_ERROR.UNIQUE_CONSTRAINT),
    ).toBe(false);
  });
});

describe("rethrowAsAppError", () => {
  it("對應到的換成 AppError", () => {
    try {
      rethrowAsAppError(prismaError("P2002"), {
        [PRISMA_ERROR.UNIQUE_CONSTRAINT]: API_ERRORS.CF_LEAVE_RECALL_PENDING,
      });
      throw new Error("should not reach");
    } catch (error) {
      expect(error).toBeInstanceOf(AppError);
      expect((error as AppError).apiCode).toBe(
        API_ERRORS.CF_LEAVE_RECALL_PENDING.code,
      );
    }
  });

  it("沒對應到的原樣拋回，不包成業務錯誤", () => {
    const original = prismaError("P1001");
    expect(() =>
      rethrowAsAppError(original, {
        [PRISMA_ERROR.UNIQUE_CONSTRAINT]: API_ERRORS.CF_LEAVE_RECALL_PENDING,
      }),
    ).toThrow();

    try {
      rethrowAsAppError(original, {
        [PRISMA_ERROR.UNIQUE_CONSTRAINT]: API_ERRORS.CF_LEAVE_RECALL_PENDING,
      });
    } catch (error) {
      expect(error).toBe(original);
      expect(error).not.toBeInstanceOf(AppError);
    }
  });

  it("一張表可以對應多個代碼，各走各的", () => {
    const mapping = {
      [PRISMA_ERROR.UNIQUE_CONSTRAINT]: API_ERRORS.CF_LEAVE_RECALL_PENDING,
      [PRISMA_ERROR.FOREIGN_KEY]: API_ERRORS.NF_LEAVE_DAY,
    };

    try {
      rethrowAsAppError(prismaError("P2003"), mapping);
    } catch (error) {
      expect((error as AppError).apiCode).toBe(API_ERRORS.NF_LEAVE_DAY.code);
    }
  });
});
