export interface IInviteTemplate {
  inviterName: string;
  teamName: string;
  inviteLink: string;
}

export interface IFreeTemplate {
  userName: string;
  currentPlanName: string;
  currentDataStatus: string;
  subscribeLink: string;
}

export interface IPayTemplate {
  planName: string;
  userName: string;
  startTime: string;
  endTime: string;
  price: string;
}

export interface IPayErrorTemplate {
  userName: string;
  planName: string;
  startTime: string;
  endTime: string;
  price: string;
  payStatus: string;
  payLink: string;
}

export interface ISubscribeTemplate {
  userName: string;
}
