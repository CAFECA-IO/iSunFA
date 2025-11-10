import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'next-i18next';
import Image from 'next/image';
import APIHandler from '@/lib/utils/api_handler';
import { APIName } from '@/constants/api_connection';
import { Button } from '@/components/button/button';
import { FormAnimation } from '@/constants/form_animation';
import { TranslateFunction } from '@/interfaces/locale';
import { FiSend } from 'react-icons/fi';

function ContactForm() {
  const { t }: { t: TranslateFunction } = useTranslation('landing_page');

  // Info: (20240318 - Shirley) 是否顯示動畫 & 顯示哪個動畫
  const [showAnim, setShowAnim] = useState(false);
  const [animation, setAnimation] = useState<string>('');

  const [inputName, setInputName] = useState('');
  const [inputEmail, setInputEmail] = useState('');
  const [inputPhone, setInputPhone] = useState('');
  const [inputMessage, setInputMessage] = useState('');

  const [emailValid, setEmailValid] = useState(true);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const emailRule = /^\w+((-\w+)|(\.\w+))*@[A-Za-z0-9]+((\.|-)[A-Za-z0-9]+)*\.[A-Za-z]+$/;
  const emailIsValid = emailRule.test(inputEmail);

  const nameChangeHandler = (event: React.ChangeEvent<HTMLInputElement>) => {
    setInputName(event.target.value);
  };
  const phoneChangeHandler = (event: React.ChangeEvent<HTMLInputElement>) => {
    setInputPhone(event.target.value);
  };
  const emailChangeHandler = (event: React.ChangeEvent<HTMLInputElement>) => {
    setEmailValid(emailRule.test(event.target.value));
    setInputEmail(event.target.value);
  };

  const {
    trigger: email,
    error: emailError,
    success: emailSuccess,
  } = APIHandler<void>(APIName.EMAIL);

  // Info: (20230731 - Shirley) 送出失敗事件處理
  const failedProcess = async () => {
    setAnimation(FormAnimation.ERROR);
    setShowAnim(true);
  };

  // Info: (20230731 - Shirley) 送出成功事件處理
  const successProcess = async () => {
    setAnimation(FormAnimation.SUCCESS);
    setShowAnim(true);

    // Info: (20230731 - Shirley) 3 秒顯示動畫
    await new Promise((resolve) => {
      setTimeout(resolve, 3000);
    });
    // Info: (20230731 - Shirley) 清空表單
    setInputName('');
    setInputPhone('');
    setInputEmail('');
    setInputMessage('');
    setShowAnim(false);
  };

  // Info: (20230731 - Shirley) 送出信件
  const sendEmail = async () => {
    const now = new Date().toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' });

    const emailData = {
      title: 'iSunFA Contact Form',
      content: `<div><h3>姓名：${inputName}</h3><h3>手機：${inputPhone}</h3><h3>Email：${inputEmail}</h3><h3>意見：${inputMessage}</h3><p>${now}<p></div>`,
    };

    // Info: (20230731 - Shirley) 3 秒顯示動畫
    await new Promise((resolve) => {
      setTimeout(resolve, 3000);
    });

    email({ header: { 'Content-Type': 'application/json; charset=UTF-8' }, body: emailData });
  };

  useEffect(() => {
    if (emailSuccess) {
      successProcess();
    }
    if (emailError) {
      failedProcess();
    }
  }, [emailSuccess, emailError]);

  // Info: (20230731 - Shirley) 點擊送出按鈕
  const submitHandler = async (event: React.FormEvent<HTMLFormElement>) => {
    // Info: (20230731 - Shirley) 先驗證信箱格式，不符合就直接 return
    if (!emailIsValid) return;
    event.preventDefault();

    // Info: (20230731 - Shirley) 顯示 loading 動畫
    setAnimation(FormAnimation.LOADING);
    setShowAnim(true);

    try {
      await sendEmail();
    } catch (error) {
      (error as Error).message += ' (from submitHandler)';
      await failedProcess();
    }
  };

  // Info: (20230731 - Shirley) 點擊重試按鈕
  const retryHandler = async () => {
    // Info: (20230731 - Shirley) 顯示 loading 動畫
    setAnimation(FormAnimation.LOADING);
    setShowAnim(true);

    try {
      await sendEmail();
    } catch (error) {
      (error as Error).message += ' (from retryHandler)';
      await failedProcess();
    }
  };

  const messageChangeHandler = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputMessage(e.target.value);
    // autoResize();   // Info: (20240321 - Shirley) Automatically resize the textarea to fit initial content (if any)
  };

  const animPart = (
    <div
      className={`${
        showAnim ? 'relative' : 'hidden'
      } mx-auto mt-20 flex h-700px w-800px max-w-full flex-col items-center justify-center rounded-2xl bg-navy-blue-600 p-12 shadow-xl max-md:mt-10 max-md:px-5`}
    >
      <div
        className={`absolute left-0 top-0 ${
          showAnim ? 'flex' : 'hidden'
        } h-full w-full items-center justify-center`}
      >
        {animation === FormAnimation.LOADING ? (
          /* Info:(20230731 - Shirley) Loading animation */
          <div className="flex flex-col items-center space-y-10">
            <Image
              src="/animations/loading_animation.svg"
              width={100}
              height={100}
              alt="loading_animation"
            />
            <p className="text-sm">{t('landing_page:CONTACT_US.SENDING')}</p>
          </div>
        ) : animation === FormAnimation.SUCCESS ? (
          /* Info: (20230731 - Shirley) Success animation */
          <div className="flex flex-col items-center space-y-10">
            <Image src="/animations/success.gif" width={150} height={150} alt="loading_animation" />
            <p className="text-sm">{t('landing_page:CONTACT_US.SUCCESS')}</p>
          </div>
        ) : animation === FormAnimation.ERROR ? (
          /* Info: (20230731 - Shirley) Error animation */
          <div className="flex flex-col items-center">
            <Image src="/animations/error.gif" width={100} height={100} alt="error_animation" />
            <p className="text-sm">{t('landing_page:CONTACT_US.ERROR')}</p>
            <Button
              id="retry-btn"
              type="button"
              variant="tertiary"
              onClick={retryHandler}
              className="mt-6 px-10 py-3"
            >
              {t('landing_page:CONTACT_US.TRY_AGAIN')}
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );

  const formPart = (
    <form
      onSubmit={submitHandler}
      className={`${
        showAnim ? 'invisible opacity-0' : 'visible opacity-100'
      } mt-20 flex w-330px max-w-full flex-col rounded-2xl bg-navy-blue-600 p-12 shadow-xl max-md:mt-10 max-md:px-5 md:w-620px lg:w-800px`}
    >
      <div className="flex flex-col">
        {/* Info: (tzuhan - 20240513) remove arbitrary value? @Shirley  */}
        <h1 className="justify-center text-5xl font-semibold leading-52px tracking-tighter text-orange-400">
          {t('landing_page:CONTACT_US.TITLE')}
        </h1>
        <p className="mt-2 text-base font-medium leading-6 tracking-normal text-navy-blue-25">
          {t('landing_page:CONTACT_US.DESCRIPTION')}
        </p>
      </div>
      <div className="mt-12">
        <div className="flex flex-col pb-4">
          <label
            htmlFor="Name"
            className="pb-2 text-base font-medium leading-6 tracking-normal text-navy-blue-25"
          >
            {t('landing_page:CONTACT_US.NAME')}
            <span className="text-red-500">*</span>
          </label>
          <input
            id="Name"
            type="text"
            value={inputName}
            onChange={nameChangeHandler}
            className="rounded border border-solid border-navy-blue-600 bg-navy-blue-400 px-4 py-2.5 text-xl leading-7 tracking-tight text-navy-blue-200 outline-none"
            required
          />
        </div>
        <div className="mt-4 flex flex-col pb-4">
          <label
            htmlFor="Email"
            className="pb-2 text-base font-medium leading-6 tracking-normal text-navy-blue-25"
          >
            {t('landing_page:CONTACT_US.EMAIL')} <span className="text-red-500">*</span>
          </label>
          <input
            id="Email"
            type="email"
            value={inputEmail}
            onChange={emailChangeHandler}
            className={`rounded border border-solid ${emailValid ? 'border-navy-blue-600' : 'border-red-500'} bg-navy-blue-400 px-4 py-2.5 text-xl leading-7 tracking-tight text-navy-blue-200 outline-none`}
            required
          />
          {!emailValid && (
            <p className="mt-1 text-xs text-red-500">{t('landing_page:CONTACT_US.EMAIL_VERIFY')}</p>
          )}
        </div>
        <div className="mt-4 flex flex-col pb-4">
          <label
            htmlFor="Phone"
            className="pb-2 text-base font-medium leading-6 tracking-normal text-navy-blue-25"
          >
            {t('landing_page:CONTACT_US.PHONE')}
          </label>
          <input
            id="Phone"
            type="tel"
            value={inputPhone}
            onChange={phoneChangeHandler}
            className="rounded border border-solid border-navy-blue-600 bg-navy-blue-400 px-4 py-2.5 text-xl leading-7 tracking-tight text-navy-blue-200 outline-none"
          />
        </div>
        <div className="mt-4 flex flex-col pb-4">
          {/* Info: (tzuhan - 20240513) A form label must be associated with a control? @Shirley */}
          <label
            htmlFor="Message"
            className="pb-2 text-base font-medium leading-6 tracking-normal text-navy-blue-25"
          >
            {t('landing_page:CONTACT_US.MESSAGE')} <span className="text-red-500">*</span>
          </label>
          <textarea
            id="Message"
            ref={textareaRef}
            onChange={messageChangeHandler}
            rows={3}
            value={inputMessage}
            className="min-h-120px rounded border border-solid border-navy-blue-600 bg-navy-blue-400 px-4 py-2.5 text-xl leading-7 tracking-tight text-navy-blue-200 outline-none"
            placeholder={t('landing_page:CONTACT_US.MESSAGE_PLACEHOLDER')}
            required
          ></textarea>
        </div>
        <div className="mt-4 flex w-full justify-end">
          <Button type="submit" className="space-x-3" variant="default">
            <span className="text-base font-semibold leading-6 tracking-normal">
              {t('landing_page:CONTACT_US.SUBMIT')}
            </span>
            <span>
              <FiSend size={20} />
            </span>
          </Button>
        </div>
      </div>
    </form>
  );

  return (
    <div className="">
      <div
        className={`${showAnim ? `hidden` : `flex`} w-full items-center justify-center px-16 py-20 max-md:max-w-full max-md:px-5`}
      >
        {formPart}
      </div>
      {animPart}
    </div>
  );
}

export default ContactForm;
