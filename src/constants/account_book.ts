import { SortBy, SortOrder } from '@/constants/sort';
import { WORK_TAG } from '@/interfaces/account_book';
import { ITeam } from '@/interfaces/team';

export const DEFAULT_SORT_OPTIONS = [{ sortBy: SortBy.CREATED_AT, sortOrder: SortOrder.DESC }];

// Info: (20250418 - Liz) 申報頻率
export enum FILING_FREQUENCY {
  BIMONTHLY_FILING = 'BIMONTHLY_FILING',
  MONTHLY_FILING = 'MONTHLY_FILING',
}

export const FILING_FREQUENCY_OPTIONS = [
  { label: FILING_FREQUENCY.BIMONTHLY_FILING, subLabel: 'EVERY_TWO_MONTHS' },
  { label: FILING_FREQUENCY.MONTHLY_FILING, subLabel: 'EVERY_MONTH' },
];

// Info: (20250418 - Liz) 申報方式
export enum FILING_METHOD {
  SINGLE_ENTITY_FILING = 'SINGLE_ENTITY_FILING',
  CONSOLIDATED_FILING = 'CONSOLIDATED_FILING',
  INDIVIDUAL_FILING = 'INDIVIDUAL_FILING',
}

export const FILING_METHOD_OPTIONS = [
  {
    label: FILING_METHOD.SINGLE_ENTITY_FILING,
    subLabel: 'SINGLE_HEAD_OFFICE_WITHOUT_BRANCH_UNITS',
  },
  { label: FILING_METHOD.CONSOLIDATED_FILING, subLabel: 'HEAD_OFFICE_FILES_FOR_ALL_BRANCHES' },
  { label: FILING_METHOD.INDIVIDUAL_FILING, subLabel: 'EACH_UNIT_FILES_SEPARATELY' },
];

// Info: (20250418 - Liz) 申報方式
export enum DECLARANT_FILING_METHOD {
  SELF_FILING = 'SELF_FILING',
  AGENT_FILING = 'AGENT_FILING',
}

export enum AGENT_FILING_ROLE {
  ACCOUNTANT = 'ACCOUNTANT',
  BOOKKEEPER = 'BOOKKEEPER',
  BOOKKEEPER_AND_FILING_AGENT = 'BOOKKEEPER_AND_FILING_AGENT',
}

// Info: (20250421 - Liz) 第一步驟表單狀態
export interface Step1FormState {
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
  isStepTwoBusinessTaxSettingOpen: boolean;
}

export const initialStep1FormState: Step1FormState = {
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
  isStepTwoBusinessTaxSettingOpen: false,
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
  filingFrequency: string | null;
  filingMethod: string | null;
  declarantFilingMethod: string | null;

  declarantName: string;
  declarantPersonalId: string;
  declarantPhoneNumber: string;
  agentFilingRole: AGENT_FILING_ROLE | null;
  agentFilingRoleIdText: string;
  agentFilingRoleIdNumber: string;

  filingFrequencyError: string | null;
  filingMethodError: string | null;
  declarantFilingMethodError: string | null;

  declarantNameError: string | null;
  declarantPersonalIdError: string | null;
  declarantPhoneNumberError: string | null;
  agentFilingRoleError: string | null;

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
  agentFilingRoleIdText: '',
  agentFilingRoleIdNumber: '',

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
