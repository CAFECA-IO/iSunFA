/* eslint-disable */
import React, { useEffect, useRef, useState } from 'react';
import { TranslateFunction } from '../../interfaces/locale';
import { useTranslation } from 'next-i18next';

function ContactForm() {
  const { t }: { t: TranslateFunction } = useTranslation('common');

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [message, setMessage] = useState('');
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [emailValid, setEmailValid] = useState(true);

  // const [message, setMessage] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const autoResize = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto'; // Reset height so the scrollHeight measurement is accurate
      textarea.style.height = textarea.scrollHeight + 'px';
    }
  };

  // Automatically resize the textarea to fit initial content (if any)
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);
    autoResize();
  };

  const validateEmail = (email: string) => {
    const re = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;
    return re.test(email);
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!validateEmail(email)) {
      setEmailValid(false);
      return;
    }

    console.log('Form Data', { name, email, phoneNumber, message });
    // Here you can add what you want to do with the form values, e.g., send them to an API.

    setFormSubmitted(true);
    // Reset form fields
    setName('');
    setEmail('');
    setPhoneNumber('');
    setMessage('');
  };

  return (
    <div className="flex w-full items-center justify-center px-16 py-20 max-md:max-w-full max-md:px-5">
      <form
        onSubmit={handleSubmit}
        className="mt-20 flex w-[800px] max-w-full flex-col rounded-[40px] bg-secondaryBlue p-12 shadow-xl max-md:mt-10 max-md:px-5"
      >
        <div className="flex flex-col">
          <h1 className="justify-center text-5xl font-semibold leading-[51.92px] tracking-tighter text-amber-400">
            Get In Touch
          </h1>
          <p className="mt-2 text-base font-medium leading-6 tracking-normal text-white">
            Our Staff will contact with you as soon as possible.
          </p>
        </div>
        <div className="mt-12">
          <div className="flex flex-col pb-4">
            <label className="pb-2 text-base font-medium leading-6 tracking-normal text-white">
              Name <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              className="rounded border border-solid border-secondaryBlue bg-tertiaryBlue px-4 py-2.5 text-xl leading-7 tracking-tight text-slate-400"
              required
            />
          </div>
          <div className="mt-4 flex flex-col pb-4">
            <label className="pb-2 text-base font-medium leading-6 tracking-normal text-white">
              E-Mail <span className="text-red-400">*</span>
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className={`rounded border border-solid ${emailValid ? 'border-secondaryBlue' : 'border-red-500'} bg-tertiaryBlue px-4 py-2.5 text-xl leading-7 tracking-tight text-slate-400`}
              required
            />
            {!emailValid && (
              <p className="mt-1 text-xs text-red-500">Please enter a valid email address.</p>
            )}
          </div>
          <div className="mt-4 flex flex-col pb-4">
            <label className="pb-2 text-base font-medium leading-6 tracking-normal text-white">
              Phone Number
            </label>
            <input
              type="tel"
              value={phoneNumber}
              onChange={e => setPhoneNumber(e.target.value)}
              className="rounded border border-solid border-secondaryBlue bg-tertiaryBlue px-4 py-2.5 text-xl leading-7 tracking-tight text-slate-400"
            />
          </div>
          <div className="mt-4 flex flex-col pb-4">
            <label className="pb-2 text-base font-medium leading-6 tracking-normal text-white">
              What do you want to say... <span className="text-red-400">*</span>
            </label>
            <textarea
              ref={textareaRef}
              onChange={handleChange}
              rows={3}
              value={message}
              // onChange={e => setMessage(e.target.value)}
              className="rounded border border-solid border-secondaryBlue bg-tertiaryBlue px-4 py-2.5 text-xl leading-7 tracking-tight text-slate-400"
              placeholder={t('CONTACT_US_PAGE.MESSAGE_PLACEHOLDER')}
              required
            ></textarea>
          </div>
          <div className="flex w-full justify-end">
            <button
              type="submit"
              className="group mt-4 flex items-center justify-center gap-2 self-end rounded-md bg-primaryYellow px-6 py-2.5 hover:bg-primaryYellow/70 max-md:px-5"
            >
              <span className="text-base font-semibold leading-6 tracking-normal text-secondaryBlue group-hover:text-white">
                Submit
              </span>
              <span>
                {/* <Image
                src="/elements/sender.svg"
                className="fill-current text-red-200 group-hover:text-white"
                width={20}
                height={20}
                alt="sender"
              /> */}

                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 20 20"
                  fill="none"
                >
                  <path
                    fill-rule="evenodd"
                    clip-rule="evenodd"
                    d="M15.6697 5.74737L9.92047 11.4966L11.6702 15.9961L15.6697 5.74737ZM8.50626 10.0824L14.2555 4.33315L4.00682 8.33265L8.50626 10.0824ZM17.1618 1.06932C17.3191 1.02365 17.6692 0.930018 18.0506 1.05745C18.473 1.19853 18.8044 1.52994 18.9454 1.95225C19.0729 2.33371 18.9792 2.68383 18.9336 2.84106C18.8831 3.01491 18.8031 3.21974 18.7266 3.41565L18.7143 3.44714L13.2223 17.5203L13.2095 17.5531C13.1241 17.7722 13.0376 17.9939 12.9521 18.1669C12.88 18.3126 12.7021 18.663 12.3224 18.8602C11.9125 19.0732 11.4244 19.0729 11.0147 18.8594C10.6353 18.6617 10.4578 18.3112 10.3859 18.1654C10.3005 17.9923 10.2143 17.7705 10.1291 17.5513L10.1164 17.5184L7.97943 12.0235L2.48446 9.88653C2.47352 9.88228 2.46258 9.87802 2.45162 9.87376C2.23241 9.78856 2.01064 9.70236 1.83753 9.61702C1.69169 9.54512 1.34116 9.36765 1.14345 8.98818C0.929994 8.57848 0.929707 8.09044 1.14268 7.68049C1.33994 7.30079 1.69027 7.1229 1.83603 7.05083C2.00903 6.96529 2.2307 6.87883 2.4498 6.79337C2.46075 6.7891 2.4717 6.78483 2.48263 6.78056L16.5558 1.28861L16.5873 1.27629C16.7832 1.19979 16.988 1.11981 17.1618 1.06932Z"
                    // fill="#002462"
                    className="fill-current text-secondaryBlue group-hover:text-white"
                  />
                </svg>
              </span>
            </button>
          </div>
        </div>
      </form>
      {formSubmitted && (
        // FIXME: Add a proper success message
        <div className="mt-4 text-center text-green-500">Thank you for contacting us!</div>
      )}
    </div>

    // <div className="flex w-full items-center justify-center px-16 py-20 max-md:max-w-full max-md:px-5">
    //         <div className="mt-20 flex w-[800px] max-w-full flex-col rounded-[40px] bg-secondaryBlue p-12 shadow-xl max-md:mt-10 max-md:px-5">
    //           <div className="flex flex-col max-md:max-w-full">
    //             <div className="justify-center text-5xl font-semibold leading-[51.92px] tracking-tighter text-amber-400 max-md:max-w-full">
    //               Get In Touch
    //             </div>
    //             <div className="mt-2 text-base font-medium leading-6 tracking-normal text-white max-md:max-w-full">
    //               Our Staff will contact with you as soon as possible.
    //             </div>
    //           </div>
    //           <div className="mt-12 flex flex-col max-md:mt-10 max-md:max-w-full">
    //             <div className="flex flex-col whitespace-nowrap pb-4 max-md:max-w-full">
    //               <div className="flex items-start gap-1 pb-2 pr-20 text-base leading-6 max-md:flex-wrap max-md:pr-5">
    //                 <div className="justify-center font-medium tracking-normal text-white">
    //                   Name
    //                 </div>
    //                 <div className="justify-center text-red-400">*</div>
    //               </div>
    //               <div className="flex flex-col justify-center rounded text-xl leading-7 tracking-tight text-slate-400 max-md:max-w-full">
    //                 <div className="flex flex-col justify-center rounded border border-solid border-secondaryBlue bg-tertiaryBlue px-4 py-2.5 max-md:max-w-full">
    //                   {/* TODO: Change it to input */}
    //                   <div className="justify-center max-md:max-w-full">example</div>
    //                 </div>
    //               </div>
    //             </div>
    //             <div className="mt-4 flex flex-col whitespace-nowrap pb-4 max-md:max-w-full">
    //               <div className="flex items-start gap-1 pb-2 pr-20 text-base leading-6 max-md:flex-wrap max-md:pr-5">
    //                 <div className="justify-center font-medium tracking-normal text-white">
    //                   E-Mail
    //                 </div>
    //                 <div className="justify-center text-red-400">*</div>
    //               </div>
    //               <div className="flex flex-col justify-center rounded text-xl leading-7 tracking-tight text-slate-400 max-md:max-w-full">
    //                 <div className="flex flex-col justify-center rounded border border-solid border-secondaryBlue bg-tertiaryBlue px-4 py-2.5 max-md:max-w-full">
    //                   {/* TODO: Change it to input */}
    //                   <div className="justify-center max-md:max-w-full">example</div>
    //                 </div>
    //               </div>
    //             </div>
    //             <div className="mt-4 flex flex-col pb-4 max-md:max-w-full">
    //               <div className="flex flex-col items-start pb-2 text-base font-medium leading-6 tracking-normal text-white max-md:max-w-full max-md:pr-5">
    //                 <div className="justify-center">Phone Number</div>
    //               </div>
    //               <div className="flex flex-col justify-center whitespace-nowrap rounded text-xl leading-7 tracking-tight text-slate-400 max-md:max-w-full">
    //                 <div className="flex flex-col justify-center rounded border border-solid border-secondaryBlue bg-tertiaryBlue px-4 py-2.5 max-md:max-w-full">
    //                   {/* TODO: Change it to input */}
    //                   <div className="justify-center max-md:max-w-full">example</div>
    //                 </div>
    //               </div>
    //             </div>
    //             <div className="mt-4 flex flex-col pb-4 max-md:max-w-full">
    //               <div className="flex gap-1 pb-2 pr-20 text-base leading-6 max-md:flex-wrap max-md:pr-5">
    //                 <div className="justify-center font-medium tracking-normal text-white">
    //                   What go you want to say...
    //                 </div>
    //                 <div className="justify-center self-start whitespace-nowrap text-red-400">
    //                   *
    //                 </div>
    //               </div>
    //               <div className="flex flex-col justify-center text-xl leading-7 tracking-tight text-slate-400 max-md:max-w-full">
    //                 <div className="justify-center rounded border border-solid border-secondaryBlue bg-tertiaryBlue px-3.5 py-2 max-md:max-w-full">
    //                   Autosize height based on content lines
    //                   <br />
    //                   <br />
    //                 </div>
    //               </div>
    //             </div>
    //             <div className="mt-4 flex justify-center gap-2 self-end rounded-md bg-amber-400 px-6 py-2.5 max-md:px-5">
    //               <div className="text-base font-semibold leading-6 tracking-normal text-blue-950">
    //                 Submit
    //               </div>
    //               <div className="my-auto flex items-center justify-center">
    //                 <img
    //                   loading="lazy"
    //                   src="https://cdn.builder.io/api/v1/image/assets/TEMP/3a06b56acae9973cbe89c34274ba3940cff29f74bbf07e2ea634bdd13e456ba7?apiKey=0e17b0b875f041659e186639705112b1&"
    //                   className="aspect-square w-5"
    //                 />
    //               </div>
    //             </div>
    //           </div>
    //         </div>
    //       </div>
  );
}

export default ContactForm;
