/* eslint-disable */
import React, { useEffect, useRef, useState } from 'react';
import { TranslateFunction } from '../../interfaces/locale';
import { useTranslation } from 'next-i18next';
import { FormAnimation } from '../../constants/form_animation';
import Image from 'next/image';
import { Button } from '../button/button';
import APIHandler from '@/lib/utils/api_handler';
import { APIName } from '@/constants/api_connection';

function ContactForm() {
  const { t }: { t: TranslateFunction } = useTranslation('common');

  // Info: (20240318 - Shirley) 是否顯示動畫 & 顯示哪個動畫
  const [showAnim, setShowAnim] = useState(false);
  const [animation, setAnimation] = useState<string>('');

  const [inputName, setInputName] = useState('');
  const [inputEmail, setInputEmail] = useState('');
  const [inputPhone, setInputPhone] = useState('');
  const [inputMessage, setInputMessage] = useState('');

  const [emailValid, setEmailValid] = useState(true);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const emailRule = /^\w+((-\w+)|(\.\w+))*\@[A-Za-z0-9]+((\.|-)[A-Za-z0-9]+)*\.[A-Za-z]+$/;
  const emailIsValid = emailRule.test(inputEmail);

  const nameChangeHandler = (event: React.ChangeEvent<HTMLInputElement>) => {
    setInputName(event.target.value);
  };
  const phoneChangeHandler = (event: React.ChangeEvent<HTMLInputElement>) => {
    setInputPhone(event.target.value);
  };
  const emailChangeHandler = (event: React.ChangeEvent<HTMLInputElement>) => {
    setInputEmail(event.target.value);
  };

  const {
    trigger: email,
    error: enmailError,
    code: emailCode,
    success: enmailSuccess,
  } = APIHandler<void>(
    APIName.EMAIL,
    {
      header: { 'Content-Type': 'application/json; charset=UTF-8' },
    },
    false,
    false
  );

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
    // eslint-disable-next-line no-promise-executor-return
    await new Promise((resolve) => setTimeout(resolve, 3000));
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
      comment: `<h3>姓名：${inputName}</h3><h3>手機：${inputPhone}</h3><h3>Email：${inputEmail}</h3><h3>意見：${inputMessage}</h3><p>${now}<p>`,
    };

    // Info: (20230731 - Shirley) 3 秒顯示動畫
    // eslint-disable-next-line no-promise-executor-return
    await new Promise((resolve) => setTimeout(resolve, 3000));

    // Info: (20230731 - Shirley) call API
    // const res = await fetch('/api/v1/email', {
    //   method: 'POST',
    //   body: JSON.stringify(emailData),
    //   headers: {
    //     'Content-Type': 'application/json; charset=UTF-8',
    //   },
    // });

    email({ body: emailData });
    // const result = await res.json();

    // const { success } = result;
    // if (success) {
    //   await successProcess();
    // } else {
    //   await failedProcess();
    // }
  };

  useEffect(() => {
    if (enmailSuccess) {
      successProcess();
    }
    if (enmailError) {
      failedProcess();
      console.log(`enmailError(${emailCode}): `, enmailError);
    }
  }, [enmailSuccess, enmailError]);

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
      await failedProcess();
    }
  };

  const autoResize = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto'; // Reset height so the scrollHeight measurement is accurate
      textarea.style.height = textarea.scrollHeight + 'px';
    }
  };

  const messageChangeHandler = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputMessage(e.target.value);
    // autoResize();   // Info: Automatically resize the textarea to fit initial content (if any) (20240321 - Shirley)
  };

  const animPart = (
    <div
      className={`${
        showAnim ? 'relative' : 'hidden'
      } mx-auto mt-20 flex h-700px w-800px max-w-full flex-col items-center justify-center rounded-2xl bg-secondaryBlue p-12 shadow-xl max-md:mt-10 max-md:px-5`}
    >
      <div
        className={`absolute left-0 top-0 ${
          showAnim ? 'flex' : 'hidden'
        } h-full w-full items-center justify-center`}
      >
        {/* eslint-disable no-nested-ternary */}
        {animation === FormAnimation.LOADING ? (
          /* Info:(20230731 - Shirley) Loading animation */
          <div className="flex flex-col items-center space-y-10">
            <Image src="/animations/Loading.svg" width={100} height={100} alt="loading_animation" />
            <p className="text-sm">{t('CONTACT_US.SENDING')}</p>
          </div>
        ) : animation === FormAnimation.SUCCESS ? (
          /* Info:(20230731 - Shirley) Success animation */
          <div className="flex flex-col items-center space-y-10">
            <Image src="/animations/success.gif" width={150} height={150} alt="loading_animation" />
            <p className="text-sm">{t('CONTACT_US.SUCCESS')}</p>
          </div>
        ) : animation === FormAnimation.ERROR ? (
          /* Info:(20230731 - Shirley) Error animation */
          <div className="flex flex-col items-center">
            <Image src="/animations/error.gif" width={100} height={100} alt="error_animation" />
            <p className="text-sm">{t('CONTACT_US.ERROR')}</p>
            <button
              type="button"
              onClick={retryHandler}
              className="mt-6 rounded-lg bg-violet px-10 py-3 text-white hover:bg-hoverWhite hover:text-black"
            >
              {t('CONTACT_US.TRY_AGAIN')}
            </button>
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
      } mt-20 flex w-330px max-w-full flex-col rounded-2xl bg-secondaryBlue p-12 shadow-xl max-md:mt-10 max-md:px-5 md:w-620px lg:w-800px`}
    >
      <div className="flex flex-col">
        <h1 className="justify-center text-5xl font-semibold leading-[51.92px] tracking-tighter text-amber-400">
          {t('CONTACT_US.TITLE')}
        </h1>
        <p className="mt-2 text-base font-medium leading-6 tracking-normal text-white">
          {t('CONTACT_US.DESCRIPTION')}
        </p>
      </div>
      <div className="mt-12">
        <div className="flex flex-col pb-4">
          <label className="pb-2 text-base font-medium leading-6 tracking-normal text-white">
            {t('CONTACT_US.NAME')}
            <span className="text-red-400">*</span>
          </label>
          <input
            id="Name"
            type="text"
            value={inputName}
            onChange={nameChangeHandler}
            className="rounded border border-solid border-secondaryBlue bg-tertiaryBlue px-4 py-2.5 text-xl leading-7 tracking-tight text-slate-400"
            required
          />
        </div>
        <div className="mt-4 flex flex-col pb-4">
          <label className="pb-2 text-base font-medium leading-6 tracking-normal text-white">
            {t('CONTACT_US.EMAIL')} <span className="text-red-400">*</span>
          </label>
          <input
            id="Email"
            type="email"
            value={inputEmail}
            onChange={emailChangeHandler}
            className={`rounded border border-solid ${emailValid ? 'border-secondaryBlue' : 'border-red-500'} bg-tertiaryBlue px-4 py-2.5 text-xl leading-7 tracking-tight text-slate-400`}
            required
          />
          {!emailValid && (
            <p className="mt-1 text-xs text-red-500"> {t('CONTACT_US.EMAIL_VERIFY')}</p>
          )}
        </div>
        <div className="mt-4 flex flex-col pb-4">
          <label className="pb-2 text-base font-medium leading-6 tracking-normal text-white">
            {t('CONTACT_US.PHONE')}
          </label>
          <input
            id="Phone"
            type="tel"
            value={inputPhone}
            onChange={phoneChangeHandler}
            className="rounded border border-solid border-secondaryBlue bg-tertiaryBlue px-4 py-2.5 text-xl leading-7 tracking-tight text-slate-400"
          />
        </div>
        <div className="mt-4 flex flex-col pb-4">
          <label className="pb-2 text-base font-medium leading-6 tracking-normal text-white">
            {t('CONTACT_US.MESSAGE')} <span className="text-red-400">*</span>
          </label>
          <textarea
            id="Message"
            ref={textareaRef}
            onChange={messageChangeHandler}
            rows={3}
            value={inputMessage}
            className="min-h-120px rounded border border-solid border-secondaryBlue bg-tertiaryBlue px-4 py-2.5 text-xl leading-7 tracking-tight text-slate-400"
            placeholder={t('CONTACT_US.MESSAGE_PLACEHOLDER')}
            required
          ></textarea>
        </div>
        <div className="mt-4 flex w-full justify-end">
          <Button className="space-x-3">
            <span className="text-base font-semibold leading-6 tracking-normal text-secondaryBlue group-hover:text-white">
              {t('CONTACT_US.SUBMIT')}
            </span>
            <span>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 20 20"
                fill="none"
              >
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M15.6697 5.74737L9.92047 11.4966L11.6702 15.9961L15.6697 5.74737ZM8.50626 10.0824L14.2555 4.33315L4.00682 8.33265L8.50626 10.0824ZM17.1618 1.06932C17.3191 1.02365 17.6692 0.930018 18.0506 1.05745C18.473 1.19853 18.8044 1.52994 18.9454 1.95225C19.0729 2.33371 18.9792 2.68383 18.9336 2.84106C18.8831 3.01491 18.8031 3.21974 18.7266 3.41565L18.7143 3.44714L13.2223 17.5203L13.2095 17.5531C13.1241 17.7722 13.0376 17.9939 12.9521 18.1669C12.88 18.3126 12.7021 18.663 12.3224 18.8602C11.9125 19.0732 11.4244 19.0729 11.0147 18.8594C10.6353 18.6617 10.4578 18.3112 10.3859 18.1654C10.3005 17.9923 10.2143 17.7705 10.1291 17.5513L10.1164 17.5184L7.97943 12.0235L2.48446 9.88653C2.47352 9.88228 2.46258 9.87802 2.45162 9.87376C2.23241 9.78856 2.01064 9.70236 1.83753 9.61702C1.69169 9.54512 1.34116 9.36765 1.14345 8.98818C0.929994 8.57848 0.929707 8.09044 1.14268 7.68049C1.33994 7.30079 1.69027 7.1229 1.83603 7.05083C2.00903 6.96529 2.2307 6.87883 2.4498 6.79337C2.46075 6.7891 2.4717 6.78483 2.48263 6.78056L16.5558 1.28861L16.5873 1.27629C16.7832 1.19979 16.988 1.11981 17.1618 1.06932Z"
                  className="fill-current text-secondaryBlue group-hover:text-white"
                />
              </svg>
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
