'use client';

import { Fragment, useEffect } from 'react';
import { Transition } from '@headlessui/react';
import { Check } from 'lucide-react';

interface ISuccessNotificationProps {
  show: boolean;
  title: string;
  message: string;
  onClose: () => void;
  autoCloseDelay?: number;
}

export default function SuccessNotification({
  show,
  title,
  message,
  onClose,
  autoCloseDelay = 5000,
}: ISuccessNotificationProps) {
  useEffect(() => {
    if (show) {
      const timer = setTimeout(() => {
        onClose();
      }, autoCloseDelay);

      return () => clearTimeout(timer);
    }
  }, [show, autoCloseDelay, onClose]);

  return (
    <div
      aria-live="assertive"
      className="pointer-events-none fixed inset-0 flex items-end px-4 py-6 sm:items-start sm:p-6 z-50"
    >
      <div className="flex w-full flex-col items-center space-y-4 sm:items-end">
        <Transition
          show={show}
          as={Fragment}
          enter="transform ease-out duration-300 transition"
          enterFrom="translate-y-2 opacity-0 sm:translate-y-0 sm:translate-x-2"
          enterTo="translate-y-0 opacity-100 sm:translate-x-0"
          leave="transition ease-in duration-100"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="pointer-events-auto w-full max-w-sm rounded-xl bg-white/90 backdrop-blur-md shadow-2xl ring-1 ring-black/5 overflow-hidden">
            <div className="p-4">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <div className="relative flex items-center justify-center h-10 w-10 rounded-full bg-green-100">
                    <Check className="h-6 w-6 text-green-600 animate-[bounce_1s_infinite]" aria-hidden="true" />
                    <span className="absolute inset-0 rounded-full animate-ping bg-green-400 opacity-20"></span>
                  </div>
                </div>
                <div className="ml-3 w-0 flex-1 pt-0.5">
                  <p className="text-sm font-semibold text-gray-900">{title}</p>
                  <p className="mt-1 text-sm text-gray-500">{message}</p>
                </div>
                <div className="ml-4 flex flex-shrink-0">
                  <button
                    type="button"
                    className="inline-flex rounded-md bg-transparent text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                    onClick={onClose}
                  >
                    <span className="sr-only">Close</span>
                    <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                      <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
            {/* Info: (20260130 - Luphia) Progress bar animation */}
            <div className="h-1 w-full bg-gray-100">
              <div
                className="h-full bg-green-500 transition-all duration-linear"
                style={{
                  width: show ? '100%' : '0%',
                  transitionDuration: `${autoCloseDelay}ms`
                }}
              />
            </div>
          </div>
        </Transition>
      </div>
    </div>
  );
}
