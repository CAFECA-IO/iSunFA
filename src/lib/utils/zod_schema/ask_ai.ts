import { VoucherType } from '@/constants/account';
import { AI_TYPE } from '@/constants/aich';
import { IZodValidator } from '@/interfaces/zod_validator';
import { z, ZodRawShape } from 'zod';
import { counterPartyEntityValidator } from '@/constants/counterparty';
import { ICounterpartyValidator } from 'src/lib/utils/zod_schema/counterparty';
import { ILineItemBetaValidator } from 'src/lib/utils/zod_schema/lineItem';
import { voucherEntityValidator } from 'src/lib/utils/zod_schema/voucher';
import { lineItemEntityValidator } from 'src/lib/utils/zod_schema/line_item';
import { accountEntityValidator } from 'src/lib/utils/zod_schema/account';
import { eventTypeToVoucherType } from 'src/lib/utils/common';

const nullSchema = z.union([z.object({}), z.string()]);

const askAIPostQueryValidatorV2 = z.object({
  reason: z.enum(['help', 'certificate', 'voucher']),
});

export const helpValidator = z.object({
  content: z.string(),
});

export const certificateValidator = z.object({
  fileId: z.number(),
});

export const voucherValidator = z.object({
  certificateId: z.number(),
});

const askAIPostBodyValidatorV2 = z.object({
  content: z.string().optional(),
  fileId: z.number().optional(),
  certificateId: z.number().optional(),
});

export const askAIPostValidatorV2: IZodValidator<
  (typeof askAIPostQueryValidatorV2)['shape'],
  (typeof askAIPostBodyValidatorV2)['shape']
> = {
  query: askAIPostQueryValidatorV2,
  body: askAIPostBodyValidatorV2,
};

export const askAIGetAllValidatorsV2: {
  [method: string]: IZodValidator<ZodRawShape, ZodRawShape>;
} = {
  POST: askAIPostValidatorV2,
};

const askAIGetResultQueryV2Schema = z.object({
  resultId: z.string(),
  reason: z.nativeEnum(AI_TYPE),
});

const askAIGetResultBodyV2Schema = nullSchema;

/**
 * Info: (20241107 - Murky)
 * @description IAIResultVoucherSchema is for AI result coming from ai service,
 * - lineItem id will be negative, account in lineItem beta need fuzzy search to make sure id  or code is correct
 * - counterParty need fuzzy search in database to make sure id  is correct
 */
const IAIResultVoucherSchema = z
  .object({
    aiType: z.nativeEnum(AI_TYPE),
    voucherDate: z
      .number()
      .describe('timestamp in second, allow user to set voucher date by themselves'),
    type: z
      .nativeEnum(VoucherType)
      .describe('voucher type which need to be transform from EventType'),
    note: z.string(),
    counterParty: ICounterpartyValidator,
    lineItems: z.array(ILineItemBetaValidator),
  })
  .strict(); // Info: (20241107 - Murky) strict可以過濾掉多餘的key

const askAIGetResultOutputV2Schema = z
  .union([
    z.null(), // Info: (20241107 - Murky) IHandleRequest 預設可能會回傳null
    z.discriminatedUnion('aiType', [
      // Info: (20241107 - Murky) 從api手動使用apiType判斷是哪一種回傳
      z.object({
        aiType: z.literal(AI_TYPE.CERTIFICATE),
      }),
      z.object({
        ...voucherEntityValidator.shape,
        aiType: z.literal(AI_TYPE.VOUCHER),
        counterParty: counterPartyEntityValidator,
        lineItems: z.array(
          z.object({
            ...lineItemEntityValidator.shape,
            account: accountEntityValidator,
          })
        ),
      }),
      // z.object({
      //   aiType: z.literal(AI_TYPE.HELP),
      // }),
    ]),
  ])
  .transform((data) => {
    if (!data) {
      return null;
    }

    switch (data.aiType) {
      case AI_TYPE.CERTIFICATE:
        return data;
      case AI_TYPE.VOUCHER: {
        const aiVoucherData: z.infer<typeof IAIResultVoucherSchema> = {
          aiType: data.aiType,
          voucherDate: data.date,
          type: eventTypeToVoucherType(data.type),
          note: data.note ?? '',
          counterParty: data.counterParty,
          lineItems: data.lineItems,
        };

        const aiVoucher = IAIResultVoucherSchema.parse(aiVoucherData); // Info: (20241107 - Murky) 用parse過濾掉多餘的key
        return aiVoucher;
      }
      // case AI_TYPE.HELP:
      // return data;
      default:
        return null;
    }
  });

const askAIGetResultFrontendV2Schema = z.discriminatedUnion('aiType', [
  z.object({
    aiType: z.literal(AI_TYPE.CERTIFICATE),
  }),
  z.object({
    ...IAIResultVoucherSchema.shape,
    aiType: z.literal(AI_TYPE.VOUCHER),
  }),
  z.object({
    aiType: z.literal(AI_TYPE.HELP),
  }),
]);

export const askAIGetResultV2Schema = {
  input: {
    querySchema: askAIGetResultQueryV2Schema,
    bodySchema: askAIGetResultBodyV2Schema,
  },
  outputSchema: askAIGetResultOutputV2Schema,
  frontend: askAIGetResultFrontendV2Schema,
};
