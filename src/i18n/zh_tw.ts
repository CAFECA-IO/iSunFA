import { adminDashboard } from "@/i18n/locales/zh_tw/admin_dashboard";
import { common } from "@/i18n/locales/zh_tw/common";
import { faith } from "@/i18n/locales/zh_tw/faith";
import { cookieConsent } from "@/i18n/locales/zh_tw/cookie_consent";
import { dashboard } from "@/i18n/locales/zh_tw/dashboard";
import { header } from "@/i18n/locales/zh_tw/header";
import { checkinReward } from "@/i18n/locales/zh_tw/checkin_reward";
import { authModal } from "@/i18n/locales/zh_tw/auth_modal";
import { features } from "@/i18n/locales/zh_tw/features";
import { esgTarget } from "@/i18n/locales/zh_tw/esg_target";
import { registrationSteps } from "@/i18n/locales/zh_tw/registration_steps";
import { loginSteps } from "@/i18n/locales/zh_tw/login_steps";
import { techSpecs } from "@/i18n/locales/zh_tw/tech_specs";
import { acknowledgement } from "@/i18n/locales/zh_tw/acknowledgement";
import { pricing } from "@/i18n/locales/zh_tw/pricing";
import { chat } from "@/i18n/locales/zh_tw/chat";
import { hero } from "@/i18n/locales/zh_tw/hero";
import { footer } from "@/i18n/locales/zh_tw/footer";
import { accountBookSelection } from "@/i18n/locales/zh_tw/account_book_selection";
import { billing } from "@/i18n/locales/zh_tw/billing";
import { sidebar } from "@/i18n/locales/zh_tw/sidebar";
import { locked } from "@/i18n/locales/zh_tw/locked";
import { analysis } from "@/i18n/locales/zh_tw/analysis";
import { aiConsultationRoom } from "@/i18n/locales/zh_tw/ai_consultation_room";
import { aiConsultationSection } from "@/i18n/locales/zh_tw/ai_consultation_section";
import { calculator } from "@/i18n/locales/zh_tw/calculator";
import { currencyAlias } from "@/i18n/locales/zh_tw/currency_alias";
import { date } from "@/i18n/locales/zh_tw/date";
import { ocr } from "@/i18n/locales/zh_tw/ocr";
import { journal } from "@/i18n/locales/zh_tw/journal";
import { voucher } from "@/i18n/locales/zh_tw/voucher";
import { coefficient } from "@/i18n/locales/zh_tw/coefficient";
import { esgActivityType } from "@/i18n/locales/zh_tw/esg_activity_type";
import { esgMain } from "@/i18n/locales/zh_tw/esg_main";
import { esgSummary } from "@/i18n/locales/zh_tw/esg_summary";
import { esgTable } from "@/i18n/locales/zh_tw/esg_table";
import { esgVerify } from "@/i18n/locales/zh_tw/esg_verify";
import { verify } from "@/i18n/locales/zh_tw/verify";
import { esg } from "@/i18n/locales/zh_tw/esg";
import { teamManagement } from "@/i18n/locales/zh_tw/team_management";
import { esgReport } from "@/i18n/locales/zh_tw/esg_report";
import { reportView } from "@/i18n/locales/zh_tw/report_view";
import { cashFlowStatementView } from "@/i18n/locales/zh_tw/cash_flow_statement_view";
import { balanceSheetView } from "@/i18n/locales/zh_tw/balance_sheet_view";
import { incomeStatementView } from "@/i18n/locales/zh_tw/income_statement_view";
import { adminSetup } from "@/i18n/locales/zh_tw/admin_setup";
import { adminMember } from "@/i18n/locales/zh_tw/admin_member";
import { adminBlockchain } from "@/i18n/locales/zh_tw/admin_blockchain";
import { adminBilling } from "@/i18n/locales/zh_tw/admin_billing";
import { adminMissionBoard } from "@/i18n/locales/zh_tw/admin_mission_board";
import { emissionSources } from "@/i18n/locales/zh_tw/emission_sources";
import { orderManagement } from "@/i18n/locales/zh_tw/order_management";
import { transportationCarbonFootprintCalculator } from "@/i18n/locales/zh_tw/transportation_carbon_footprint_calculator";

export const zhTw = {
  transportation_carbon_footprint_calculator:
    transportationCarbonFootprintCalculator,
  common,
  faith,
  cookie_consent: cookieConsent,
  dashboard,
  header,
  checkin_reward: checkinReward,
  auth_modal: authModal,
  features,
  esg_target: esgTarget,
  registration_steps: registrationSteps,
  login_steps: loginSteps,
  tech_specs: techSpecs,
  acknowledgement,
  pricing,
  chat,
  hero,
  footer,
  account_book_selection: accountBookSelection,
  billing,
  sidebar,
  locked,
  analysis,
  ai_consultation_room: aiConsultationRoom,
  ai_consultation_section: aiConsultationSection,
  calculator,
  currency_alias: currencyAlias,
  date,
  ocr,
  journal,
  voucher,
  coefficient,
  esg_activity_type: esgActivityType,
  esg_main: esgMain,
  esg_summary: esgSummary,
  esg_table: esgTable,
  esg_verify: esgVerify,
  verify,
  esg,
  teamManagement,
  esg_report: esgReport,
  report_view: reportView,
  cash_flow_statement_view: cashFlowStatementView,
  balance_sheet_view: balanceSheetView,
  income_statement_view: incomeStatementView,
  admin_setup: adminSetup,
  admin_member: adminMember,
  admin_blockchain: adminBlockchain,
  admin_billing: adminBilling,
  admin_dashboard: adminDashboard,
  admin_mission_board: adminMissionBoard,
  emission_sources: emissionSources,
  order_management: orderManagement,
} as const;

export type BaseTranslation = typeof zhTw;
