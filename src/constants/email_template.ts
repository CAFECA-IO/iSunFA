export enum EmailTemplateName {
  INVITE = 'invite',
  PAY = 'pay',
  PAY_ERROR = 'pay-error',
  SUBSCRIBE = 'subscribe',
  FREE = 'free',
}

export type EmailTemplateData = {
  [EmailTemplateName.INVITE]: {
    receiverName: string;
    teamName: string;
    inviteLink: string;
  };
  // Info: (20250421 - Tzuhan) 具體可傳入的資料需要再確認
  [EmailTemplateName.PAY]: {
    teamName: string;
    amount: string;
    payDate: string;
  };
  [EmailTemplateName.PAY_ERROR]: {
    teamName: string;
    failReason: string;
    retryLink: string;
  };
  [EmailTemplateName.SUBSCRIBE]: {
    teamName: string;
    startDate: string;
    endDate: string;
  };
  [EmailTemplateName.FREE]: {
    teamName: string;
    reminderDate: string;
  };
};
