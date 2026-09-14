import { accountBookCompanyProfileRepo } from "@/repositories/account_book_company_profile.repo";
import {
  IAccountBookCompanyProfile,
  IAccountBookCompanyProfileView,
} from "@/interfaces/salary_company_profile";

/**
 * Info: (20260914 - Julian) 還沒設定過的帳本看到的那一份。
 *
 * 不回 `null`：前端表單需要一組可以直接綁的空值，而每個呼叫端各自
 * 決定「沒設定長什麼樣」會長出好幾種版本。`isConfigured` 讓
 * 「還沒設定」與「設定成空字串」在型別上分得開。
 */
const EMPTY_PROFILE: IAccountBookCompanyProfile = {
  entityName: "",
  taxId: null,
  responsiblePerson: null,
  address: null,
  leaveYearScheme: null,
  leaveYearStartMonth: null,
  leaveYearStartDay: null,
};

export const accountBookCompanyProfileService = {
  async getProfile(
    accountBookId: string,
  ): Promise<IAccountBookCompanyProfileView> {
    const profile =
      await accountBookCompanyProfileRepo.getProfile(accountBookId);

    return profile === null
      ? { ...EMPTY_PROFILE, isConfigured: false }
      : { ...profile, isConfigured: true };
  },

  async saveProfile(params: {
    accountBookId: string;
    profile: IAccountBookCompanyProfile;
  }): Promise<IAccountBookCompanyProfileView> {
    const saved = await accountBookCompanyProfileRepo.upsertProfile(params);

    return { ...saved, isConfigured: true };
  },
};
