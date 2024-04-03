// TODO: temp solution (20240115 - Shirley)
/* eslint-disable */
const nodemailer = require('nodemailer');

class SendMail {
  /* Info: (20230324 - Shirley) 設定不含參數的 constructor */

  static async sendMail(config, comment) {
    /* Info: (20230324 - Shirley) create gmail service */
    const transporter = nodemailer.createTransport({
      service: 'Gmail',
      host: 'smtp.gmail.com',
      port: 465,
      auth: {
        /* Info: (20230324 - Shirley) 發信的帳號密碼，由 dotenv 傳入以保障安全 */
        user: config.googleClientID,
        pass: config.googleClientPassword,
        reci: config.receiverEmail,
      },
    });

    /* Info: (20230324 - Shirley) 設定信件模板 */
    const mailOptions = {
      /* Info: (20230324 - Shirley) 寄件地址 */
      from: config.googleClientID,
      /* Info: (20230324 - Shirley) 收信人 */
      to: config.receiverEmail,
      /* Info: (20230324 - Shirley) 主旨 */
      subject: 'iSunFA 表單回覆',
      /* Info: (20230324 - Shirley) plaintext body */
      text: comment,
      /* Info: (20230324 - Shirley) html body */
      html: '<p>' + comment + '</p>',
    };

    /* Info: (20230324 - Shirley) send mail with defined transport object */
    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        throw error;
      } else {
        return info.response;
      }
    });

    return { success: true };
  }
}

(module.exports = SendMail),
  {
    rules: {
      'react/no-unescaped-entities': 'off',
      '@next/next/no-page-custom-font': 'off',
    },
  };
