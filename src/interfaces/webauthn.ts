export interface IUserAuth {
  username: string;
  credential: ICredential;
  client: IClient;
  authenticator: IAuthenticator;
  attestation: string;
}

export interface ICredential {
  id: string;
  publicKey: string;
  algorithm: string;
}

export interface IClient {
  type: string;
  challenge: string;
  origin: string;
  crossOrigin: boolean;
}

export interface IAuthenticator {
  rpIdHash: string;
  flags: IAuthenticatorFlags;
  counter: number;
  synced: boolean;
  aaguid: string;
  name: string;
  icon_light: string;
  icon_dark: string;
}

export interface IAuthenticatorFlags {
  userPresent: boolean;
  userVerified: boolean;
  backupEligibility: boolean;
  backupState: boolean;
  attestedData: boolean;
  extensionsIncluded: boolean;
}
