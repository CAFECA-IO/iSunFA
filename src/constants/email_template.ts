export enum EmailTemplateName {
  INVITE = 'invite',
  PAY = 'pay',
  PAY_ERROR = 'pay_error',
  SUBSCRIBE = 'subscribe',
  FREE = 'free',
  VERIFICATION = 'verification_code',
}

export type EmailTemplateData = {
  [EmailTemplateName.INVITE]: {
    receiverName: string;
    teamName: string;
    inviteLink: string;
  };
  // Info: (20250421 - Tzuhan) 具體可傳入的資料需要再確認
  [EmailTemplateName.PAY]: {
    receiverName: string;
    planName: string;
    amount: string;
    startDate: string;
    endDate: string;
  };
  [EmailTemplateName.PAY_ERROR]: {
    receiverName: string;
    planName: string;
    amount: string;
    startDate: string;
    endDate: string;
    payStatus: string;
    payLink: string;
  };
  [EmailTemplateName.SUBSCRIBE]: {
    receiverName: string;
  };
  [EmailTemplateName.FREE]: {
    receiverName: string;
    currentPlanName: string;
    currentDataStatus: string;
    subscribeLink: string;
  };
  [EmailTemplateName.VERIFICATION]: {
    receiverName: string;
    eventType: string;
    verificationCode: string;
    remainingMins: string;
  };
};
