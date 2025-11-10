import nodemailer, { SendMailOptions } from 'nodemailer';

export default class MailService {
  private static instance: MailService;

  private transporter: nodemailer.Transporter;

  private constructor() {
    this.transporter = nodemailer.createTransport({
      service: process.env.MAIL_SERVICE,
      auth: {
        user: process.env.MAIL_CLIENT_ID,
        pass: process.env.MAIL_CLIENT_PASSWORD,
      },
    });
  }

  // Info: (20240516 - Jacky) INSTANCE CREATE FOR MAIL
  static getInstance() {
    if (!MailService.instance) {
      MailService.instance = new MailService();
    }
    return MailService.instance;
  }

  // Info: (20240516 - Jacky) SEND MAIL
  async sendMail(options: SendMailOptions): Promise<boolean> {
    try {
      await this.transporter.sendMail(options);
      return true;
    } catch (error) {
      (error as Error).message =
        `Failed to send email to ${options.to}: ${(error as Error).message}`;
      return false;
    }
  }

  // Info: (20240516 - Jacky) VERIFY CONNECTION
  async verifyConnection() {
    return this.transporter.verify();
  }

  // Info: (20240516 - Jacky) CREATE TRANSPORTER
  getTransporter() {
    return this.transporter;
  }
}
