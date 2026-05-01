import { ApiCode, HTTP_MAP } from "@/lib/utils/status";
import { fail, IApiResponse } from "@/lib/utils/response";
import { IErrorDef } from "@/lib/utils/error_dictionary";

export class AppError extends Error {
  readonly code: ApiCode;
  readonly http: number;
  readonly apiCode: string;

  constructor(def: IErrorDef) {
    super(def.message);
    this.code = def.status;
    this.apiCode = def.code;
    this.http = HTTP_MAP[def.status] ?? 500;
    Error.captureStackTrace(this, this.constructor);
  }

  mapToResponse(): IApiResponse<null> {
    return fail({
      code: this.apiCode,
      message: this.message,
      status: this.code,
    });
  }
}
