/* eslint-disable */

import React from 'react';
import { Button } from '../button/button';
import { useGlobal } from '../../contexts/global_context';
import { BOOKMARK_LIST } from '../../constants/config';
import { useDashboard } from '../../contexts/dashboard_context';

const DashboardBookmark = () => {
  const { addBookmarkModalVisibilityHandler } = useGlobal();
  const { bookmarkList } = useDashboard();
  const [bookmark, setBookmark] = React.useState<string[]>(bookmarkList);
  const [btnSelected, setBtnSelected] = React.useState<string[]>([]);
  const [contractBtnClicked, setContractBtnClicked] = React.useState(false);
  const [employeesBtnClicked, setEmployeesBtnClicked] = React.useState(false);
  const [accountingBtnClicked, setAccountingBtnClicked] = React.useState(false);
  console.log('bookmarkList useDashboard', bookmarkList);

  const contractBtnClickHandler = () => {
    setContractBtnClicked(prev => !prev);
    setBtnSelected(prev => [...prev, 'Contract']);
  };

  const employeesBtnClickHandler = () => {
    setEmployeesBtnClicked(prev => !prev);
    setBtnSelected(prev => [...prev, 'Employees']);
  };

  const accountingBtnClickHandler = () => {
    setAccountingBtnClicked(prev => !prev);
    setBtnSelected(prev => [...prev, 'Accounting']);
  };

  const removeBtnClickHandler = () => {
    setBookmark(prev => {
      // Info: filter out all items that are in btnSelected, and return the rest (20240411 - Shirley)
      return prev.filter(item => !btnSelected.includes(item));
    });

    setContractBtnClicked(false);
    setEmployeesBtnClicked(false);
    setAccountingBtnClicked(false);
  };

  const addBtnClickHandler = () => {
    // setBookmark(prev => [...prev, 'New']);
    addBookmarkModalVisibilityHandler();
  };

  return (
    <div>
      <div className="dashboardBookmarkShadow mt-12 flex w-full gap-5 rounded-3xl bg-white px-6 py-6 max-lg:flex-wrap max-md:mt-10 max-md:max-w-full max-md:px-5">
        <div className="flex flex-1 gap-5 max-md:flex-wrap">
          {bookmark.includes('Contract') && (
            <Button
              onClick={contractBtnClickHandler}
              className={`${contractBtnClicked ? 'border-tertiaryBlue2 bg-lightGray3 text-secondaryBlue hover:bg-tertiaryBlue2/50' : 'border-transparent bg-tertiaryBlue text-white hover:bg-tertiaryBlue2'} flex justify-center gap-2 rounded-md border px-8 py-3.5 max-md:px-5`}
            >
              <div className="my-auto flex items-center justify-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <path
                    className="fill-current"
                    fillRule="evenodd"
                    d="M8.762 1.001h5.24a1 1 0 01.708.293l6 6a1 1 0 01.293.707v9.241c0 .805 0 1.47-.044 2.01-.046.563-.145 1.08-.392 1.565a4 4 0 01-1.748 1.748c-.485.247-1.002.346-1.564.392-.541.044-1.206.044-2.01.044H8.761c-.805 0-1.47 0-2.01-.044-.563-.046-1.08-.145-1.565-.392a4 4 0 01-1.748-1.748c-.247-.485-.346-1.002-.392-1.564-.044-.541-.044-1.206-.044-2.01V6.76c0-.805 0-1.47.044-2.01.046-.563.145-1.08.392-1.565a4 4 0 011.748-1.748c.485-.247 1.002-.346 1.564-.392.541-.044 1.206-.044 2.01-.044zM6.914 3.04c-.438.035-.663.1-.819.18a2 2 0 00-.874.874c-.08.157-.145.38-.18.82-.037.45-.038 1.032-.038 1.888v10.4c0 .857 0 1.439.037 1.89.036.438.101.662.18.818a2 2 0 00.875.874c.156.08.38.145.819.18.45.037 1.032.038 1.889.038h6.4c.857 0 1.439 0 1.889-.038.438-.035.663-.1.819-.18a2 2 0 00.874-.874c.08-.156.145-.38.18-.819.037-.45.038-1.032.038-1.889v-8.2H15.57c-.252 0-.498 0-.706-.017a2.022 2.022 0 01-.77-.2 2 2 0 01-.874-.875 2.022 2.022 0 01-.201-.77c-.017-.208-.017-.454-.017-.706V3.001h-4.2c-.857 0-1.439 0-1.889.038zm8.089 1.376l2.586 2.586h-1.986a8.189 8.189 0 01-.589-.011v-.013a8.205 8.205 0 01-.011-.576V4.415zm-8 4.586a1 1 0 011-1h2a1 1 0 110 2h-2a1 1 0 01-1-1zm0 4a1 1 0 011-1h8a1 1 0 110 2h-8a1 1 0 01-1-1zm0 4a1 1 0 011-1h8a1 1 0 110 2h-8a1 1 0 01-1-1z"
                    clipRule="evenodd"
                  ></path>
                </svg>
              </div>
              <div className="text-lg font-medium leading-7 tracking-normal">Contract</div>
            </Button>
          )}
          {bookmark.includes('Employees') && (
            <Button
              onClick={employeesBtnClickHandler}
              className={`${employeesBtnClicked ? 'border-tertiaryBlue2 bg-lightGray3 text-secondaryBlue hover:bg-tertiaryBlue2/50' : 'border-transparent bg-tertiaryBlue text-white hover:bg-tertiaryBlue2'} flex justify-center gap-2 rounded-md border px-8 py-3.5 max-md:px-5`}
            >
              <div className="my-auto flex items-center justify-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <g clipPath="url(#clip0_331_33311)">
                    <path
                      className="fill-current"
                      fillRule="evenodd"
                      d="M9.503 4.001a3.5 3.5 0 100 7 3.5 3.5 0 000-7zm-5.5 3.5a5.5 5.5 0 1111 0 5.5 5.5 0 01-11 0zm11.104-4.477a1 1 0 011.34-.45 5.5 5.5 0 010 9.855 1 1 0 01-.89-1.791 3.5 3.5 0 000-6.274 1 1 0 01-.45-1.34zM9.503 16c-2.447 0-4.67 1.333-6.109 3.493-.089.134-.158.237-.214.327a2.614 2.614 0 00-.096.162c.146.017.354.018.741.018H15.18c.388 0 .595-.001.742-.018-.021-.039-.051-.09-.096-.162-.057-.09-.125-.193-.215-.327C14.173 17.334 11.95 16 9.503 16zM1.73 18.385c1.75-2.628 4.558-4.384 7.773-4.384 3.214 0 6.022 1.756 7.773 4.384l.024.036c.154.23.317.477.432.71.138.281.237.604.214.99-.019.308-.12.593-.242.82a2.02 2.02 0 01-.548.655c-.33.25-.684.337-.998.373a8.534 8.534 0 01-.933.032H3.78c-.33 0-.657 0-.933-.032-.314-.036-.669-.124-.998-.373l.603-.797m14.656-5.41a1 1 0 011.343-.445c1.634.821 3.016 2.129 4.016 3.74l.034.054c.149.238.343.548.406.957.073.473-.055.925-.246 1.268a2.009 2.009 0 01-.948.879c-.383.163-.798.16-1.123.16h-.088a1 1 0 110-2c.215 0 .328-.002.409-.007l.002-.004a.127.127 0 00.003-.006 11.598 11.598 0 00-.149-.247c-.822-1.325-1.937-2.365-3.214-3.006a1 1 0 01-.445-1.343zM1.73 18.385l-.023.036.024-.036zm-.023.036c-.154.23-.318.477-.432.71l.432-.71zm-.432.71a1.934 1.934 0 00-.214.99l.214-.99zm-.214.99c.019.308.12.593.242.82l-.242-.82zm.242.82c.121.226.302.47.548.655l-.548-.655z"
                      clipRule="evenodd"
                    ></path>
                  </g>
                  <defs>
                    <clipPath id="clip0_331_33311">
                      <path fill="#fff" d="M0 0H24V24H0z"></path>
                    </clipPath>
                  </defs>
                </svg>
              </div>
              <div className="text-lg font-medium leading-7 tracking-normal">Employees</div>
            </Button>
          )}

          {bookmark.includes('Accounting') && (
            <Button
              onClick={accountingBtnClickHandler}
              className={`${accountingBtnClicked ? 'border-tertiaryBlue2 bg-lightGray3 text-secondaryBlue hover:bg-tertiaryBlue2/50' : 'border-transparent bg-tertiaryBlue text-white hover:bg-tertiaryBlue2'} flex justify-center gap-2 rounded-md border px-8 py-3.5 max-md:px-5`}
            >
              <div className="my-auto flex items-center justify-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <g clipPath="url(#clip0_331_33319)">
                    <path
                      className="fill-current"
                      fillRule="evenodd"
                      d="M7.762 2.001h8.482c.805 0 1.47 0 2.01.044.563.046 1.08.145 1.565.392a4 4 0 011.748 1.748c.247.485.346 1.002.392 1.564.044.541.044 1.206.044 2.01v8.483c0 .805 0 1.47-.044 2.01-.046.563-.145 1.08-.392 1.565a4 4 0 01-1.748 1.748c-.485.247-1.002.346-1.564.392-.541.044-1.206.044-2.01.044H7.761c-.805 0-1.47 0-2.01-.044-.563-.046-1.08-.145-1.565-.392a4 4 0 01-1.748-1.748c-.247-.485-.346-1.002-.392-1.564-.044-.541-.044-1.206-.044-2.01V7.76c0-.805 0-1.47.044-2.01.046-.563.145-1.08.392-1.565a4 4 0 011.748-1.748c.485-.247 1.002-.346 1.564-.392.541-.044 1.206-.044 2.01-.044zM5.914 4.04c-.438.035-.663.1-.819.18a2 2 0 00-.874.874c-.08.157-.145.38-.18.82-.037.45-.038 1.032-.038 1.888v8.4c0 .857 0 1.439.037 1.89.036.438.101.662.18.818a2 2 0 00.875.874c.156.08.38.145.819.18.45.037 1.032.038 1.889.038h8.4c.857 0 1.439 0 1.889-.038.438-.035.663-.1.819-.18a2 2 0 00.874-.874c.08-.156.145-.38.18-.819.037-.45.038-1.032.038-1.889v-8.4c0-.856 0-1.439-.038-1.889-.035-.438-.1-.662-.18-.819a2 2 0 00-.874-.874c-.157-.08-.38-.145-.82-.18C17.642 4.002 17.06 4 16.204 4h-8.4c-.857 0-1.439 0-1.889.038zM8.503 5.5a1 1 0 011 1v1h1a1 1 0 110 2h-1v1a1 1 0 11-2 0v-1h-1a1 1 0 010-2h1v-1a1 1 0 011-1zm8.293.293a1 1 0 111.414 1.414l-11 11a1 1 0 01-1.414-1.414l11-11zm-4.293 9.707a1 1 0 011-1h4a1 1 0 110 2h-4a1 1 0 01-1-1z"
                      clipRule="evenodd"
                    ></path>
                  </g>
                  <defs>
                    <clipPath id="clip0_331_33319">
                      <path fill="#fff" d="M0 0H24V24H0z"></path>
                    </clipPath>
                  </defs>
                </svg>
              </div>
              <div className="text-lg font-medium leading-7 tracking-normal">Accounting</div>
            </Button>
          )}
        </div>

        {/* Info: remove button (20240411 - Shirley) */}
        {contractBtnClicked || employeesBtnClicked || accountingBtnClicked ? (
          <Button
            onClick={removeBtnClickHandler}
            className={`${contractBtnClicked || employeesBtnClicked || accountingBtnClicked ? `bg-tertiaryBlue text-white hover:bg-tertiaryBlue/80` : `bg-transparent hover:bg-tertiaryBlue hover:text-white`} my-auto flex flex-col justify-center rounded-md border border-solid border-tertiaryBlue p-4 text-tertiaryBlue`}
          >
            <div className="flex items-center justify-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                fill="none"
                viewBox="0 0 20 20"
              >
                <g clipPath="url(#clip0_340_150763)">
                  <path
                    fill="#FCFDFF"
                    fillRule="evenodd"
                    d="M9.306.918H10.7c.441 0 .817 0 1.126.025.324.026.64.084.941.238.455.232.825.602 1.056 1.056.154.302.212.617.239.942.024.296.025.654.025 1.072h3.416a.75.75 0 110 1.5h-.916v8.615c0 .673 0 1.224-.037 1.672-.038.463-.118.881-.317 1.272a3.25 3.25 0 01-1.42 1.42c-.391.2-.81.28-1.273.318-.448.036-.998.036-1.672.036H8.138c-.674 0-1.224 0-1.672-.036-.463-.038-.882-.119-1.272-.318a3.25 3.25 0 01-1.42-1.42c-.2-.39-.28-.81-.318-1.272-.037-.448-.037-.999-.037-1.672V5.75h-.917a.75.75 0 010-1.5H5.92c0-.418.001-.776.025-1.072.027-.325.085-.64.239-.942a2.417 2.417 0 011.056-1.056c.301-.154.617-.212.941-.238.309-.025.685-.025 1.126-.025zM6.67 5.75H4.92v8.583c0 .713 0 1.202.032 1.581.03.37.085.57.159.714.168.33.435.597.765.765l-.34.668.34-.668c.144.073.343.129.713.159.38.03.869.031 1.581.031h3.667c.712 0 1.201 0 1.58-.031.371-.03.57-.086.714-.16a1.75 1.75 0 00.765-.764c.073-.144.129-.343.16-.714.03-.379.03-.868.03-1.58V5.75H6.67zm5.917-1.5H7.419c0-.433.002-.724.02-.95.02-.232.052-.328.08-.383a.917.917 0 01.4-.4c.056-.028.152-.061.383-.08.24-.02.555-.02 1.034-.02h1.333c.48 0 .793 0 1.034.02.231.019.327.052.382.08a.917.917 0 01.4.4c.029.055.062.151.08.383.019.226.02.517.02.95zm-4.25 4.583a.75.75 0 01.75.75v4.167a.75.75 0 01-1.5 0V9.584a.75.75 0 01.75-.75zm3.333 0a.75.75 0 01.75.75v4.167a.75.75 0 01-1.5 0V9.584a.75.75 0 01.75-.75z"
                    clipRule="evenodd"
                  ></path>
                </g>
                <defs>
                  <clipPath id="clip0_340_150763">
                    <path fill="#fff" d="M0 0H20V20H0z"></path>
                  </clipPath>
                </defs>
              </svg>
            </div>
          </Button>
        ) : (
          // {/* Info: add button (20240411 - Shirley) */}
          <Button
            onClick={addBtnClickHandler}
            className={`${contractBtnClicked || employeesBtnClicked || accountingBtnClicked ? `bg-tertiaryBlue text-white hover:bg-tertiaryBlue/80` : `bg-transparent hover:bg-tertiaryBlue hover:text-white`} my-auto flex flex-col justify-center rounded-md border border-solid border-tertiaryBlue p-4 text-tertiaryBlue`}
          >
            <div className="flex items-center justify-center">
              {contractBtnClicked || employeesBtnClicked || accountingBtnClicked ? (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  fill="none"
                  viewBox="0 0 20 20"
                >
                  <g clipPath="url(#clip0_340_150763)">
                    <path
                      fill="#FCFDFF"
                      fillRule="evenodd"
                      d="M9.306.918H10.7c.441 0 .817 0 1.126.025.324.026.64.084.941.238.455.232.825.602 1.056 1.056.154.302.212.617.239.942.024.296.025.654.025 1.072h3.416a.75.75 0 110 1.5h-.916v8.615c0 .673 0 1.224-.037 1.672-.038.463-.118.881-.317 1.272a3.25 3.25 0 01-1.42 1.42c-.391.2-.81.28-1.273.318-.448.036-.998.036-1.672.036H8.138c-.674 0-1.224 0-1.672-.036-.463-.038-.882-.119-1.272-.318a3.25 3.25 0 01-1.42-1.42c-.2-.39-.28-.81-.318-1.272-.037-.448-.037-.999-.037-1.672V5.75h-.917a.75.75 0 010-1.5H5.92c0-.418.001-.776.025-1.072.027-.325.085-.64.239-.942a2.417 2.417 0 011.056-1.056c.301-.154.617-.212.941-.238.309-.025.685-.025 1.126-.025zM6.67 5.75H4.92v8.583c0 .713 0 1.202.032 1.581.03.37.085.57.159.714.168.33.435.597.765.765l-.34.668.34-.668c.144.073.343.129.713.159.38.03.869.031 1.581.031h3.667c.712 0 1.201 0 1.58-.031.371-.03.57-.086.714-.16a1.75 1.75 0 00.765-.764c.073-.144.129-.343.16-.714.03-.379.03-.868.03-1.58V5.75H6.67zm5.917-1.5H7.419c0-.433.002-.724.02-.95.02-.232.052-.328.08-.383a.917.917 0 01.4-.4c.056-.028.152-.061.383-.08.24-.02.555-.02 1.034-.02h1.333c.48 0 .793 0 1.034.02.231.019.327.052.382.08a.917.917 0 01.4.4c.029.055.062.151.08.383.019.226.02.517.02.95zm-4.25 4.583a.75.75 0 01.75.75v4.167a.75.75 0 01-1.5 0V9.584a.75.75 0 01.75-.75zm3.333 0a.75.75 0 01.75.75v4.167a.75.75 0 01-1.5 0V9.584a.75.75 0 01.75-.75z"
                      clipRule="evenodd"
                    ></path>
                  </g>
                  <defs>
                    <clipPath id="clip0_340_150763">
                      <path fill="#fff" d="M0 0H20V20H0z"></path>
                    </clipPath>
                  </defs>
                </svg>
              ) : (
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
                    d="M10.0025 3.16776C10.5548 3.16776 11.0025 3.61547 11.0025 4.16776V9.00109H15.8359C16.3881 9.00109 16.8359 9.4488 16.8359 10.0011C16.8359 10.5534 16.3881 11.0011 15.8359 11.0011H11.0025V15.8344C11.0025 16.3867 10.5548 16.8344 10.0025 16.8344C9.45024 16.8344 9.00252 16.3867 9.00252 15.8344V11.0011H4.16919C3.6169 11.0011 3.16919 10.5534 3.16919 10.0011C3.16919 9.4488 3.6169 9.00109 4.16919 9.00109H9.00252V4.16776C9.00252 3.61547 9.45024 3.16776 10.0025 3.16776Z"
                    className="fill-current"
                  />
                </svg>
              )}
            </div>
          </Button>
        )}
      </div>

      <div className="flex h-800px w-full items-center justify-center">
        {' '}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="90"
          height="120"
          fill="none"
          viewBox="0 0 90 120"
        >
          <path
            fill="#7F8A9D"
            d="M26.963 99.76a.248.248 0 01-.08.18.216.216 0 01-.16.06h-6.82c-.066 0-.1.033-.1.1v3.74c0 .067.034.1.1.1h4.58a.19.19 0 01.16.08.19.19 0 01.08.16v1.52a.247.247 0 01-.08.18.216.216 0 01-.16.06h-4.58c-.066 0-.1.033-.1.1v3.86c0 .067.034.1.1.1h6.82a.19.19 0 01.16.08.19.19 0 01.08.16v1.52a.247.247 0 01-.08.18.216.216 0 01-.16.06h-9a.293.293 0 01-.18-.06.291.291 0 01-.06-.18V98.24c0-.067.02-.12.06-.16a.25.25 0 01.18-.08h9a.19.19 0 01.16.08.19.19 0 01.08.16v1.52zm13.076 1.86c1.027 0 1.827.313 2.4.94.587.613.88 1.473.88 2.58v6.62a.248.248 0 01-.08.18.216.216 0 01-.16.06h-1.82a.292.292 0 01-.18-.06.291.291 0 01-.06-.18v-6.14c0-.613-.166-1.1-.5-1.46-.32-.36-.753-.54-1.3-.54-.546 0-.993.18-1.34.54-.346.36-.52.84-.52 1.44v6.16a.248.248 0 01-.08.18.216.216 0 01-.16.06H35.3a.292.292 0 01-.18-.06.291.291 0 01-.06-.18v-6.14c0-.613-.166-1.1-.5-1.46-.333-.36-.773-.54-1.32-.54-.506 0-.926.147-1.26.44-.32.293-.506.693-.56 1.2v6.5a.248.248 0 01-.08.18.216.216 0 01-.16.06h-1.84a.292.292 0 01-.18-.06.291.291 0 01-.06-.18v-9.74c0-.067.02-.12.06-.16a.25.25 0 01.18-.08h1.84c.067 0 .12.027.16.08a.19.19 0 01.08.16v.66c0 .04.014.067.04.08.027.013.054 0 .08-.04a2.6 2.6 0 011.08-.82c.44-.187.927-.28 1.46-.28.654 0 1.227.133 1.72.4.494.267.874.653 1.14 1.16.04.053.087.053.14 0 .294-.533.7-.927 1.22-1.18.52-.253 1.1-.38 1.74-.38zm14.302 2.8c.24.68.36 1.513.36 2.5 0 .947-.113 1.76-.34 2.44-.293.88-.766 1.567-1.42 2.06-.64.493-1.453.74-2.44.74-.946 0-1.706-.34-2.28-1.02-.026-.027-.053-.033-.08-.02-.026.013-.04.04-.04.08v4.34a.19.19 0 01-.08.16.19.19 0 01-.16.08h-1.84a.25.25 0 01-.18-.08.216.216 0 01-.06-.16v-13.52c0-.067.02-.12.06-.16a.25.25 0 01.18-.08h1.84a.19.19 0 01.16.08.19.19 0 01.08.16v.6c0 .04.014.067.04.08.027.013.054 0 .08-.04.587-.693 1.354-1.04 2.3-1.04.947 0 1.747.247 2.4.74.654.493 1.127 1.18 1.42 2.06zm-2.6 4.9c.4-.613.6-1.427.6-2.44 0-.973-.16-1.74-.48-2.3-.373-.653-.94-.98-1.7-.98-.693 0-1.213.32-1.56.96-.306.52-.46 1.293-.46 2.32 0 1.053.167 1.853.5 2.4.347.587.847.88 1.5.88.707 0 1.24-.28 1.6-.84zm10.63-5.9a.247.247 0 01-.08.18.216.216 0 01-.16.06h-2.04c-.067 0-.1.033-.1.1v4.82c0 .507.107.873.32 1.1.227.227.58.34 1.06.34h.6a.19.19 0 01.16.08.19.19 0 01.08.16v1.5c0 .147-.08.233-.24.26l-1.04.02c-1.053 0-1.84-.18-2.36-.54-.52-.36-.787-1.04-.8-2.04v-5.7c0-.067-.033-.1-.1-.1h-1.14a.293.293 0 01-.18-.06.291.291 0 01-.06-.18v-1.4c0-.067.02-.12.06-.16a.25.25 0 01.18-.08h1.14c.067 0 .1-.033.1-.1v-2.34c0-.067.02-.12.06-.16a.25.25 0 01.18-.08h1.74a.19.19 0 01.16.08.19.19 0 01.08.16v2.34c0 .067.033.1.1.1h2.04a.19.19 0 01.16.08.19.19 0 01.08.16v1.4zm1.86 12.56c-.04 0-.073-.027-.1-.08a.283.283 0 01-.04-.16v-1.44c0-.067.02-.127.06-.18a.292.292 0 01.18-.06h.02c.547-.013.974-.073 1.28-.18.307-.093.56-.28.76-.56.2-.28.38-.7.54-1.26.014-.027.014-.067 0-.12l-3.3-9.9a.224.224 0 01-.02-.1c0-.12.067-.18.2-.18h1.96c.147 0 .24.067.28.2l2 7.04c.014.04.034.06.06.06.027 0 .047-.02.06-.06l2-7.04c.04-.133.134-.2.28-.2h1.9c.08 0 .134.027.16.08.04.04.047.107.02.2l-3.52 10.52c-.333.947-.66 1.653-.98 2.12-.32.467-.76.8-1.32 1-.546.2-1.326.3-2.34.3h-.14z"
          ></path>
          <path
            stroke="#CDD1D9"
            strokeLinecap="round"
            strokeWidth="3"
            d="M25 26l-6-16M65 26l6-16M45 26V2M2 79V55.39a2 2 0 01.58-1.41l20.246-20.39a2 2 0 011.419-.59h41.169a2 2 0 011.407.58l20.587 20.398A2 2 0 0188 55.4V79a2 2 0 01-2 2H4a2 2 0 01-2-2z"
          ></path>
          <path
            stroke="#CDD1D9"
            strokeLinecap="round"
            strokeWidth="3"
            d="M2 55h22.777a2 2 0 012 2v8a2 2 0 002 2h29.725a2 2 0 002-2v-8a2 2 0 012-2H87"
          ></path>
        </svg>
      </div>
    </div>
  );
};

export default DashboardBookmark;
