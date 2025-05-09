import { SortBy, SortOrder } from '@/constants/sort';
import { WORK_TAG } from '@/interfaces/account_book';
import { ITeam } from '@/interfaces/team';

export const DEFAULT_SORT_OPTIONS = [{ sortBy: SortBy.CREATED_AT, sortOrder: SortOrder.DESC }];

// Info: (20250418 - Liz) 申報頻率
export enum FILING_FREQUENCY {
  BIMONTHLY_FILING = 'BIMONTHLY_FILING',
  MONTHLY_FILING = 'MONTHLY_FILING',
}

// Info: (20250418 - Liz) 申報頻率選項的補充說明
export const FILING_FREQUENCY_OPTIONS = [
  { label: FILING_FREQUENCY.BIMONTHLY_FILING, subLabel: 'EVERY_TWO_MONTHS' },
  { label: FILING_FREQUENCY.MONTHLY_FILING, subLabel: 'EVERY_MONTH' },
];

// Info: (20250418 - Liz) 申報方式(總繳種類)
export enum FILING_METHOD {
  SINGLE_ENTITY_FILING = 'SINGLE_ENTITY_FILING',
  CONSOLIDATED_FILING = 'CONSOLIDATED_FILING',
  INDIVIDUAL_FILING = 'INDIVIDUAL_FILING',
}

// Info: (20250507 - Liz) 申報方式選項的補充說明
export const FILING_METHOD_OPTIONS = [
  {
    label: FILING_METHOD.SINGLE_ENTITY_FILING,
    subLabel: 'SINGLE_HEAD_OFFICE_WITHOUT_BRANCH_UNITS',
  },
  { label: FILING_METHOD.CONSOLIDATED_FILING, subLabel: 'HEAD_OFFICE_FILES_FOR_ALL_BRANCHES' },
  { label: FILING_METHOD.INDIVIDUAL_FILING, subLabel: 'EACH_UNIT_FILES_SEPARATELY' },
];

// Info: (20250418 - Liz) (申報人)申報方式
export enum DECLARANT_FILING_METHOD {
  SELF_FILING = 'SELF_FILING',
  AGENT_FILING = 'AGENT_FILING',
}

// Info: (20250507 - Liz) 申報代理人的角色有三種：會計師(稅務代理人)、記帳士、記帳及報稅代理人
export enum AGENT_FILING_ROLE {
  ACCOUNTANT = 'ACCOUNTANT',
  BOOKKEEPER = 'BOOKKEEPER',
  BOOKKEEPER_AND_FILING_AGENT = 'BOOKKEEPER_AND_FILING_AGENT',
}

// Info: (20250421 - Liz) 第一步驟表單狀態
export interface Step1FormState {
  imageId: string;
  companyName: string;
  responsiblePerson: string;
  taxId: string;
  taxSerialNumber: string;
  contactPerson: string;
  isSameAsResponsiblePerson: boolean;
  phoneNumber: string;
  tag: WORK_TAG | null;
  team: ITeam | null;
  city: string | null;
  district: string | null;
  districtOptions: string[];
  enteredAddress: string;
  isTagDropdownOpen: boolean;
  isTeamDropdownOpen: boolean;
  isCityDropdownOpen: boolean;
  isDistrictDropdownOpen: boolean;
  companyNameError: string | null;
  responsiblePersonError: string | null;
  taxIdError: string | null;
  taxSerialNumberError: string | null;
  teamError: string | null;
  tagError: string | null;
}

export const initialStep1FormState: Step1FormState = {
  imageId: '',
  companyName: '',
  responsiblePerson: '',
  taxId: '',
  taxSerialNumber: '',
  contactPerson: '',
  isSameAsResponsiblePerson: false,
  phoneNumber: '',
  tag: null,
  team: null,
  city: null,
  district: null,
  districtOptions: [],
  enteredAddress: '',
  isTagDropdownOpen: false,
  isTeamDropdownOpen: false,
  isCityDropdownOpen: false,
  isDistrictDropdownOpen: false,
  companyNameError: null,
  responsiblePersonError: null,
  taxIdError: null,
  taxSerialNumberError: null,
  teamError: null,
  tagError: null,
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
