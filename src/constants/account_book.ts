import { SortBy, SortOrder } from '@/constants/sort';
import {
  AGENT_FILING_ROLE,
  DECLARANT_FILING_METHOD,
  FILING_FREQUENCY,
  FILING_METHOD,
  IAccountBookWithTeam,
} from '@/interfaces/account_book';
import { ITeam } from '@/interfaces/team';
import { LocaleKey } from '@/constants/normal_setting';
import { CurrencyType } from '@/constants/currency';

export const DEFAULT_SORT_OPTIONS = [{ sortBy: SortBy.CREATED_AT, sortOrder: SortOrder.DESC }];

// Info: (20250418 - Liz) 申報頻率選項的補充說明
export const FILING_FREQUENCY_OPTIONS = [
  { label: FILING_FREQUENCY.BIMONTHLY_FILING, subLabel: 'EVERY_TWO_MONTHS' },
  { label: FILING_FREQUENCY.MONTHLY_FILING, subLabel: 'EVERY_MONTH' },
];

// Info: (20250507 - Liz) 申報方式選項的補充說明
export const FILING_METHOD_OPTIONS = [
  {
    label: FILING_METHOD.SINGLE_ENTITY_FILING,
    subLabel: 'SINGLE_HEAD_OFFICE_WITHOUT_BRANCH_UNITS',
  },
  { label: FILING_METHOD.CONSOLIDATED_FILING, subLabel: 'HEAD_OFFICE_FILES_FOR_ALL_BRANCHES' },
  { label: FILING_METHOD.INDIVIDUAL_FILING, subLabel: 'EACH_UNIT_FILES_SEPARATELY' },
];

// Info: (20250421 - Liz) 第一步驟表單狀態
export interface Step1FormState {
  imageId: string;
  companyName: string;
  businessLocation: LocaleKey | undefined; // Info: (20250604 - Liz) 商業地址
  accountingCurrency: CurrencyType | undefined; // Info: (20250604 - Liz) 會計幣別
  taxId: string;
  taxSerialNumber: string;
  team: ITeam | null;
  // tag: WORK_TAG | null;
  // representativeName: string;
  // contactPerson: string;
  // isSameAsResponsiblePerson: boolean;
  // phoneNumber: string;
  // city: string | null;
  // district: string | null;
  // districtOptions: string[];
  // enteredAddress: string;
  // isTagDropdownOpen: boolean;
  isTeamDropdownOpen: boolean;
  // isCityDropdownOpen: boolean;
  // isDistrictDropdownOpen: boolean;
  // responsiblePersonError: string | null;
  // taxSerialNumberError: string | null;
  // tagError: string | null;
  companyNameError: string | null;
  taxIdError: string | null;
  businessLocationError: string | null;
  accountingCurrencyError: string | null;
  teamError: string | null;
}

// Info: (20250526 - Liz) 第一步驟表單狀態的初始值
export const initialStep1FormState: Step1FormState = {
  imageId: '',
  companyName: '',
  businessLocation: undefined,
  accountingCurrency: undefined,
  taxId: '',
  taxSerialNumber: '',
  team: null,
  // tag: null,
  // representativeName: '',
  // contactPerson: '',
  // isSameAsResponsiblePerson: false,
  // phoneNumber: '',
  // city: null,
  // district: null,
  // districtOptions: [],
  // enteredAddress: '',
  // isTagDropdownOpen: false,
  isTeamDropdownOpen: false,
  // isCityDropdownOpen: false,
  // isDistrictDropdownOpen: false,
  // responsiblePersonError: null,
  // taxSerialNumberError: null,
  // tagError: null,
  companyNameError: null,
  taxIdError: null,
  businessLocationError: null,
  accountingCurrencyError: null,
  teamError: null,
};

// Info: (20250526 - Liz) 第一步驟表單狀態的初始值建立函式 => 判斷目前是否是「編輯模式」，如果是，就從現有資料中填入表單欄位，否則就用初始值
export const createInitialStep1FormState = (
  accountBookToEdit?: IAccountBookWithTeam
): Step1FormState => {
  if (!accountBookToEdit) return initialStep1FormState;

  return {
    ...initialStep1FormState,
    companyName: accountBookToEdit.name ?? initialStep1FormState.companyName,
    taxId: accountBookToEdit.taxId ?? initialStep1FormState.taxId,
    team: accountBookToEdit.team ?? initialStep1FormState.team,
    imageId: accountBookToEdit.imageId ?? initialStep1FormState.imageId,
    businessLocation: accountBookToEdit.businessLocation ?? initialStep1FormState.businessLocation,
    accountingCurrency:
      accountBookToEdit.accountingCurrency ?? initialStep1FormState.accountingCurrency,
    taxSerialNumber: accountBookToEdit.taxSerialNumber ?? initialStep1FormState.taxSerialNumber,
  };
};

export type Step1FormAction =
  | {
      type: 'UPDATE_FIELD';
      field: keyof Step1FormState;
      value:
        | Step1FormState[keyof Step1FormState]
        | ((prev: Step1FormState[keyof Step1FormState]) => Step1FormState[keyof Step1FormState]);
    }
  | { type: 'RESET'; payload?: Step1FormState };

export const step1FormReducer = (
  state: Step1FormState,
  action: Step1FormAction
): Step1FormState => {
  switch (action.type) {
    case 'UPDATE_FIELD': {
      const currentValue = state[action.field];
      const newValue =
        typeof action.value === 'function'
          ? (action.value as (prev: typeof currentValue) => typeof currentValue)(currentValue)
          : action.value;

      return {
        ...state,
        [action.field]: newValue,
      };
    }
    case 'RESET':
      return action.payload ?? initialStep1FormState;
    default:
      return state;
  }
};

// Info: (20250421 - Liz) 第二步驟表單狀態
export type Step2FormState = {
  // Info: (20250507 - Liz) 申報頻率、總繳種類、(代理人)申報方式
  filingFrequency: FILING_FREQUENCY | null;
  filingMethod: FILING_METHOD | null;
  declarantFilingMethod: DECLARANT_FILING_METHOD | null;

  // Info: (20250507 - Liz) 申報人姓名、身分證字號、電話號碼
  declarantName: string;
  declarantPersonalId: string;
  declarantPhoneNumber: string;

  // Info: (20250507 - Liz) 申報代理人的角色、證書字號或登錄字號
  agentFilingRole: AGENT_FILING_ROLE | null;
  licenseId: string;

  // Info: (20250507 - Liz) 錯誤訊息
  filingFrequencyError: string | null;
  filingMethodError: string | null;
  declarantFilingMethodError: string | null;
  declarantNameError: string | null;
  declarantPersonalIdError: string | null;
  declarantPhoneNumberError: string | null;
  agentFilingRoleError: string | null;

  // Info: (20250507 - Liz) 下拉選單開關
  isFilingFrequencyDropdownOpen: boolean;
  isFilingMethodDropdownOpen: boolean;
  isDeclarantFilingMethodDropdownOpen: boolean;
  isAgentFilingRolesDropdownOpen: boolean;

  // Info: (20250516 - Liz) 是否跳過驗證
  isValidationSkipped: boolean;
};

export type Step2FormAction =
  | {
      type: 'UPDATE_FIELD';
      field: keyof Step2FormState;
      value:
        | Step2FormState[keyof Step2FormState]
        | ((prev: Step2FormState[keyof Step2FormState]) => Step2FormState[keyof Step2FormState]);
    }
  | { type: 'RESET'; payload?: Partial<Step2FormState> };

export const initialStep2FormState: Step2FormState = {
  filingFrequency: null,
  filingMethod: null,
  declarantFilingMethod: null,

  declarantName: '',
  declarantPersonalId: '',
  declarantPhoneNumber: '',
  agentFilingRole: AGENT_FILING_ROLE.ACCOUNTANT,
  licenseId: '',

  filingFrequencyError: null,
  filingMethodError: null,
  declarantFilingMethodError: null,
  declarantNameError: null,
  declarantPersonalIdError: null,
  declarantPhoneNumberError: null,
  agentFilingRoleError: null,

  isFilingFrequencyDropdownOpen: false,
  isFilingMethodDropdownOpen: false,
  isDeclarantFilingMethodDropdownOpen: false,
  isAgentFilingRolesDropdownOpen: false,

  isValidationSkipped: false,
};

export const step2FormReducer = (
  state: Step2FormState,
  action: Step2FormAction
): Step2FormState => {
  switch (action.type) {
    case 'UPDATE_FIELD': {
      const currentValue = state[action.field];
      const newValue =
        typeof action.value === 'function'
          ? (action.value as (prev: typeof currentValue) => typeof currentValue)(currentValue)
          : action.value;

      return {
        ...state,
        [action.field]: newValue,
      };
    }
    case 'RESET':
      return {
        ...state,
        ...action.payload,
      };
    default:
      return state;
  }
};
