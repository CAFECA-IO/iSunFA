import React, { useState } from 'react';
import { Button } from '../button/button';
import DatePicker, { DatePickerType } from '../date_picker/date_picker';
import { default30DayPeriodInSec } from '../../constants/display';

const FinancialReportSection = () => {
  const [period, setPeriod] = useState(default30DayPeriodInSec);

  return (
    <div className="flex w-full shrink-0 grow basis-0 flex-col bg-gray-100 px-0 pb-20 pt-20">
      <div className="flex gap-0 max-md:flex-wrap">
        <div className="flex w-fit shrink-0 grow basis-0 flex-col pb-5 pt-16 max-md:max-w-full">
          <div className="flex flex-col justify-center text-4xl font-semibold leading-10 text-slate-500 max-md:max-w-full max-md:pr-5">
            <div className="w-full justify-center px-10 md:px-28">Financial Report</div>
          </div>
          <div className="mt-4 flex flex-col justify-center px-0 py-2.5 max-md:max-w-full md:px-28">
            <div className="flex flex-col justify-center max-md:max-w-full">
              <div className="h-px shrink-0 border border-solid border-gray-300 bg-gray-300 max-md:max-w-full" />
            </div>
          </div>
        </div>
      </div>
      <div className="mt-16 flex w-600px max-w-full flex-col self-center px-5 max-md:mt-10">
        <div className="flex flex-col justify-center max-md:max-w-full">
          <div className="flex flex-col max-md:max-w-full">
            <div className="justify-center text-sm font-semibold leading-5 tracking-normal text-slate-700 max-md:max-w-full">
              Report Type
            </div>
            <div className="mt-2 flex gap-0 rounded-xs border border-solid border-slate-300 bg-white shadow-sm max-md:max-w-full max-md:flex-wrap">
              <div className="flex flex-1 flex-col justify-center text-base font-medium leading-6 tracking-normal text-slate-700 max-md:max-w-full">
                <div className="items-start justify-center px-3 py-2.5 max-md:max-w-full max-md:pr-5">
                  Balance Sheet
                </div>
              </div>
              <div className="my-auto flex flex-col justify-center px-3 py-2.5">
                <div className="flex items-center justify-center">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="20"
                    height="20"
                    fill="none"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fill="#314362"
                      fillRule="evenodd"
                      d="M4.472 6.97a.75.75 0 011.06 0l4.47 4.47 4.47-4.47a.75.75 0 011.06 1.061l-5 5a.75.75 0 01-1.06 0l-5-5a.75.75 0 010-1.06z"
                      clipRule="evenodd"
                    ></path>
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="mt-20 flex flex-col justify-center max-md:mt-10 max-md:max-w-full">
          <div className="flex flex-col max-md:max-w-full">
            <div className="justify-center text-sm font-semibold leading-5 tracking-normal text-slate-700 max-md:max-w-full">
              Report Language
            </div>
            <div className="mt-2 flex items-center gap-0 rounded-xs border border-solid border-slate-300 bg-white shadow-sm max-md:max-w-full max-md:flex-wrap">
              <div className="my-auto flex flex-col justify-center self-stretch px-3 py-2.5">
                <div className="flex items-center justify-center rounded-full">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    fill="none"
                    viewBox="0 0 16 16"
                  >
                    <g clipPath="url(#clip0_904_61430)">
                      <path fill="#BD3D44" d="M0 0h16v16H0"></path>
                      <path
                        fill="#000"
                        d="M0 1.813h16H0zM0 4.28h16H0zM0 6.75h16H0zm0 2.469h16H0zm0 2.469h16H0zm0 2.468h16H0z"
                      ></path>
                      <path
                        fill="#fff"
                        d="M16 14.781H0v-1.25h16v1.25zm0-2.469H0v-1.25h16v1.25zm0-2.468H0v-1.25h16v1.25zm0-2.469H0v-1.25h16v1.25zm0-2.469H0v-1.25h16v1.25zm0-2.468H0v-1.25h16v1.25z"
                      ></path>
                      <path fill="#192F5D" d="M0 0h12.188v8.594H0V0z"></path>
                      <path
                        fill="#fff"
                        d="M1.031.344L.92.688H.562L.85.896l-.11.34.291-.209.29.21-.109-.341.288-.21h-.356L1.03.344zM3.063.344L2.95.688h-.356l.287.209-.11.34.292-.209.29.21-.11-.341.288-.21h-.356L3.063.344zM5.094.344L4.98.688h-.356l.287.209-.109.34.29-.209.291.21-.109-.341.287-.21h-.356L5.094.344zM7.125.344l-.112.344h-.357l.288.209-.11.34.291-.209.29.21-.109-.341.288-.21h-.357L7.125.344zM9.156.344l-.112.344h-.357l.288.209-.11.34.291-.209.29.21-.108-.341.287-.21h-.356L9.156.344zM11.037.897l-.109.34.29-.209.291.21L11.4.897l.287-.21h-.356L11.22.344l-.113.344h-.356l.287.209zM2.063 1.219l-.113.343h-.356l.287.21-.11.34.292-.209.29.21-.11-.341.288-.21h-.356l-.112-.343zM4.094 1.219l-.113.343h-.356l.288.21-.11.34.29-.209.291.21-.109-.341.287-.21h-.356l-.112-.343zM6.125 1.219l-.112.343h-.357l.288.21-.11.34.291-.209.29.21-.109-.341.288-.21h-.357l-.112-.343zM8.156 1.219l-.112.343h-.357l.288.21-.11.34.291-.209.29.21-.108-.341.287-.21h-.356l-.113-.343zM10.188 1.219l-.113.343h-.356l.287.21-.11.34.291-.209.291.21-.11-.341.288-.21H10.3l-.113-.343zM1.031 2.063l-.112.343H.562l.288.21-.11.34.291-.21.29.21-.109-.34.288-.21h-.356l-.113-.344zM3.063 2.063l-.113.343h-.356l.287.21-.11.34.292-.21.29.21-.11-.34.288-.21h-.356l-.112-.344zM5.094 2.063l-.113.343h-.356l.287.21-.109.34.29-.21.291.21-.109-.34.287-.21h-.356l-.112-.344zM7.125 2.063l-.112.343h-.357l.288.21-.11.34.291-.21.29.21-.109-.34.288-.21h-.357l-.112-.344zM9.156 2.063l-.112.343h-.357l.288.21-.11.34.291-.21.29.21-.108-.34.287-.21h-.356l-.113-.344zM11.219 2.063l-.113.343h-.356l.287.21-.109.34.29-.21.291.21-.109-.34.287-.21h-.356l-.112-.344zM2.063 2.938l-.113.343h-.356l.287.21-.11.34.292-.21.29.21-.11-.34.288-.21h-.356l-.112-.344zM4.094 2.938l-.113.343h-.356l.288.21-.11.34.29-.21.291.21-.109-.34.287-.21h-.356l-.112-.344zM6.125 2.938l-.112.343h-.357l.288.21-.11.34.291-.21.29.21-.109-.34.288-.21h-.357l-.112-.344zM8.156 2.938l-.112.343h-.357l.288.21-.11.34.291-.21.29.21-.108-.34.287-.21h-.356l-.113-.344zM10.188 2.938l-.113.343h-.356l.287.21-.11.34.291-.21.291.21-.11-.34.288-.21H10.3l-.113-.344zM1.031 3.781l-.112.344H.562l.288.21-.11.34.291-.21.29.21-.109-.34.288-.21h-.356l-.113-.344zM3.063 3.781l-.113.344h-.356l.287.21-.11.34.292-.21.29.21-.11-.34.288-.21h-.356l-.112-.344zM5.094 3.781l-.113.344h-.356l.287.21-.109.34.29-.21.291.21-.109-.34.287-.21h-.356l-.112-.344zM7.125 3.781l-.112.344h-.357l.288.21-.11.34.291-.21.29.21-.109-.34.288-.21h-.357l-.112-.344zM9.156 3.781l-.112.344h-.357l.288.21-.11.34.291-.21.29.21-.108-.34.287-.21h-.356l-.113-.344zM11.219 3.781l-.113.344h-.356l.287.21-.109.34.29-.21.291.21-.109-.34.287-.21h-.356l-.112-.344zM2.063 4.656L1.95 5h-.356l.287.21-.11.34.292-.21.29.21-.11-.34.288-.21h-.356l-.112-.344zM4.094 4.656L3.98 5h-.356l.288.21-.11.34.29-.21.291.21-.109-.34.287-.21h-.356l-.112-.344zM6.125 4.656L6.013 5h-.357l.288.21-.11.34.291-.21.29.21-.109-.34.288-.21h-.357l-.112-.344zM8.156 4.656L8.044 5h-.357l.288.21-.11.34.291-.21.29.21-.108-.34.287-.21h-.356l-.113-.344zM10.188 4.656L10.075 5h-.356l.287.21-.11.34.291-.21.291.21-.11-.34.288-.21H10.3l-.113-.344zM1.031 5.531l-.112.344H.562l.288.21-.11.34.291-.21.29.21-.109-.34.288-.21h-.356l-.113-.344zM3.063 5.531l-.113.344h-.356l.287.21-.11.34.292-.21.29.21-.11-.34.288-.21h-.356l-.112-.344zM5.094 5.531l-.113.344h-.356l.287.21-.109.34.29-.21.291.21-.109-.34.287-.21h-.356l-.112-.344zM7.125 5.531l-.112.344h-.357l.288.21-.11.34.291-.21.29.21-.109-.34.288-.21h-.357l-.112-.344zM9.156 5.531l-.112.344h-.357l.288.21-.11.34.291-.21.29.21-.108-.34.287-.21h-.356l-.113-.344zM11.219 5.531l-.113.344h-.356l.287.21-.109.34.29-.21.291.21-.109-.34.287-.21h-.356l-.112-.344zM2.175 6.75l-.112-.344-.113.344h-.356l.287.21-.11.34.292-.21.29.21-.11-.34.288-.21h-.356zM4.206 6.75l-.112-.344-.113.344h-.356l.288.21-.11.34.29-.21.291.21-.109-.34.287-.21h-.356zM6.237 6.75l-.112-.344-.112.344h-.357l.288.21-.11.34.291-.21.29.21-.109-.34.288-.21h-.357zM8.269 6.75l-.113-.344-.112.344h-.357l.288.21-.11.34.291-.21.29.21-.108-.34.287-.21h-.356zM10.3 6.75l-.113-.344-.112.344h-.356l.287.21-.11.34.291-.21.291.21-.11-.34.288-.21H10.3zM1.144 7.594L1.03 7.25l-.112.344H.562l.288.21-.11.34.291-.21.29.21-.109-.34.288-.21h-.356zM3.175 7.594l-.112-.344-.113.344h-.356l.287.21-.11.34.292-.21.29.21-.11-.34.288-.21h-.356zM5.206 7.594l-.112-.344-.113.344h-.356l.287.21-.109.34.29-.21.291.21-.109-.34.287-.21h-.356zM7.237 7.594l-.112-.344-.112.344h-.357l.288.21-.11.34.291-.21.29.21-.109-.34.288-.21h-.357zM9.269 7.594l-.113-.344-.112.344h-.357l.288.21-.11.34.291-.21.29.21-.108-.34.287-.21h-.356zM11.331 7.594l-.112-.344-.113.344h-.356l.287.21-.109.34.29-.21.291.21-.109-.34.287-.21h-.356z"
                      ></path>
                    </g>
                    <defs>
                      <clipPath id="clip0_904_61430">
                        <path fill="#fff" d="M0 0H16V16H0z"></path>
                      </clipPath>
                    </defs>
                  </svg>
                </div>
              </div>
              <div className="flex flex-1 flex-col justify-center self-stretch whitespace-nowrap text-base font-medium leading-6 tracking-normal text-slate-700 max-md:max-w-full">
                <div className="items-start justify-center px-3 py-2.5 max-md:max-w-full max-md:pr-5">
                  English
                </div>
              </div>
              <div className="my-auto flex flex-col justify-center self-stretch px-3 py-2.5">
                <div className="flex items-center justify-center">
                  {' '}
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="20"
                    height="20"
                    fill="none"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fill="#314362"
                      fillRule="evenodd"
                      d="M4.472 6.97a.75.75 0 011.06 0l4.47 4.47 4.47-4.47a.75.75 0 011.06 1.061l-5 5a.75.75 0 01-1.06 0l-5-5a.75.75 0 010-1.06z"
                      clipRule="evenodd"
                    ></path>
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="mt-20 flex flex-col max-md:mt-10 max-md:max-w-full">
          <div className="flex gap-4 max-md:max-w-full max-md:flex-wrap">
            <div className="flex gap-2">
              <div className="my-auto flex flex-col justify-center">
                <div className="flex items-center justify-center">
                  {' '}
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    fill="none"
                    viewBox="0 0 16 16"
                  >
                    <g fillRule="evenodd" clipPath="url(#clip0_904_69620)" clipRule="evenodd">
                      <path
                        fill="#FFA502"
                        d="M12.286 0c.473 0 .857.384.857.857v2h2a.857.857 0 110 1.714h-2v2a.857.857 0 11-1.714 0v-2h-2a.857.857 0 010-1.714h2v-2c0-.473.383-.857.857-.857z"
                      ></path>
                      <path
                        fill="#002462"
                        d="M8.099 1.855a5.542 5.542 0 00-1.242-.141c-1.373 0-2.698.509-3.68 1.426-.985.918-1.545 2.172-1.545 3.488v4.314c0 .268-.114.532-.33.734-.25.233-.447.324-.73.324a.571.571 0 000 1.142h12.57a.571.571 0 100-1.142c-.282 0-.48-.09-.73-.324a1.004 1.004 0 01-.33-.734V8.848A2.286 2.286 0 0110 6.57V6h-.571a2.286 2.286 0 01-1.33-4.145zm-2.385 12.43a.857.857 0 000 1.715H8a.857.857 0 000-1.715H5.714z"
                      ></path>
                    </g>
                    <defs>
                      <clipPath id="clip0_904_69620">
                        <path fill="#fff" d="M0 0H16V16H0z"></path>
                      </clipPath>
                    </defs>
                  </svg>
                </div>
              </div>
              <div className="text-sm font-medium leading-5 tracking-normal text-slate-800">
                Period
              </div>
            </div>
            <div className="my-auto flex flex-1 flex-col justify-center max-md:max-w-full">
              <div className="h-px shrink-0 border border-solid border-slate-800 bg-slate-800 max-md:max-w-full" />
            </div>
          </div>
          <div className="mt-6 flex w-full flex-col justify-center">
            <DatePicker type={DatePickerType.TEXT} period={period} setFilteredPeriod={setPeriod} />
          </div>
        </div>
        <Button className="mt-20 flex items-center justify-center rounded-xs px-4 py-2 max-md:mt-10 max-md:max-w-full max-md:px-5">
          <div className="flex gap-1">
            <div className="text-sm font-medium leading-5 tracking-normal text-yellow-700">
              Generate
            </div>
            <div className="my-auto flex items-center justify-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="17"
                height="16"
                fill="none"
                viewBox="0 0 17 16"
              >
                <g>
                  <path
                    fill="#996301"
                    fillRule="evenodd"
                    d="M9.128 3.294a1 1 0 011.415 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.415-1.414l2.293-2.293H3.17a1 1 0 110-2h8.252L9.128 4.708a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  ></path>
                </g>
              </svg>
            </div>
          </div>
        </Button>
      </div>
    </div>
  );
};

export default FinancialReportSection;
