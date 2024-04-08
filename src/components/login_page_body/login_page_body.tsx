/* eslint-disable */
import React from 'react';

const LoginPageBody = () => {
  return (
    <div>
      <div className="bg-gray-100">
        <div className="flex gap-5 max-lg:flex-col max-lg:gap-0">
          <div className="order-1 flex w-6/12 flex-col max-lg:ml-0 max-lg:w-full lg:order-1">
            <div className="-mt-[40px] flex grow flex-col justify-start max-lg:max-w-full md:-mt-[100px] lg:-mt-[70px]">
              <div className="relative flex h-full w-full flex-col overflow-hidden py-0 max-lg:max-w-full">
                <img
                  loading="lazy"
                  src="/elements/login_bg.svg"
                  // srcSet="https://cdn.builder.io/api/v1/image/assets/TEMP/c2d0a045aa974ae712e426285be84b742d773af94f8477ecef6f3aa41485ac65?apiKey=0e17b0b875f041659e186639705112b1&width=100 100w, https://cdn.builder.io/api/v1/image/assets/TEMP/c2d0a045aa974ae712e426285be84b742d773af94f8477ecef6f3aa41485ac65?apiKey=0e17b0b875f041659e186639705112b1&width=200 200w, https://cdn.builder.io/api/v1/image/assets/TEMP/c2d0a045aa974ae712e426285be84b742d773af94f8477ecef6f3aa41485ac65?apiKey=0e17b0b875f041659e186639705112b1&width=400 400w, https://cdn.builder.io/api/v1/image/assets/TEMP/c2d0a045aa974ae712e426285be84b742d773af94f8477ecef6f3aa41485ac65?apiKey=0e17b0b875f041659e186639705112b1&width=800 800w, https://cdn.builder.io/api/v1/image/assets/TEMP/c2d0a045aa974ae712e426285be84b742d773af94f8477ecef6f3aa41485ac65?apiKey=0e17b0b875f041659e186639705112b1&width=1200 1200w, https://cdn.builder.io/api/v1/image/assets/TEMP/c2d0a045aa974ae712e426285be84b742d773af94f8477ecef6f3aa41485ac65?apiKey=0e17b0b875f041659e186639705112b1&width=1600 1600w, https://cdn.builder.io/api/v1/image/assets/TEMP/c2d0a045aa974ae712e426285be84b742d773af94f8477ecef6f3aa41485ac65?apiKey=0e17b0b875f041659e186639705112b1&width=2000 2000w, https://cdn.builder.io/api/v1/image/assets/TEMP/c2d0a045aa974ae712e426285be84b742d773af94f8477ecef6f3aa41485ac65?apiKey=0e17b0b875f041659e186639705112b1&"
                  className="size-full object-cover"
                />
              </div>
            </div>
          </div>
          <div className="order-2 ml-5 flex w-6/12 flex-col max-lg:ml-0 max-lg:w-full lg:order-2">
            <div className="flex grow flex-col justify-center pb-20 max-lg:max-w-full">
              <div className="mt-16 flex flex-col items-center px-20 max-lg:mt-10 max-lg:max-w-full max-lg:px-5">
                <div className="flex flex-col items-center justify-center self-stretch px-20 max-lg:max-w-full max-lg:px-5">
                  <div className="text-5xl font-bold leading-[51.84px] text-amber-400 max-lg:text-4xl">
                    Log In
                  </div>
                  <div className="mt-2 text-center text-base font-medium leading-6 tracking-normal text-slate-600">
                    Register your device → <br />
                    Scan the QR code with the device you registered with{' '}
                  </div>
                </div>
                <div className="mt-32 flex w-[242px] max-w-full flex-col max-lg:mt-10">
                  <div className="mx-5 flex flex-col justify-center rounded-[999px] max-lg:mx-2.5">
                    <div className="flex aspect-square flex-col items-center justify-center rounded-[999px] bg-gray-300 px-16 max-lg:px-5">
                      <div className="flex items-center justify-center max-lg:mx-2">
                        <img
                          loading="lazy"
                          src="https://cdn.builder.io/api/v1/image/assets/TEMP/60fe1728445a73d0ea2384aff945f6a9b3ebfd57b0593bb94f4f534a3493f21c?apiKey=0e17b0b875f041659e186639705112b1&"
                          className="aspect-square w-16"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="mt-10 flex justify-center gap-2 rounded-md bg-slate-600 px-8 py-3.5 max-lg:px-5">
                    <div className="text-lg font-medium leading-7 tracking-normal text-white">
                      Log in with Device
                    </div>
                    <div className="my-auto flex items-center justify-center">
                      <img
                        loading="lazy"
                        src="https://cdn.builder.io/api/v1/image/assets/TEMP/d65bcc008096cb9f16416c920b31e5637c6f2ad5fb5e7ca86d7112607a8ca888?apiKey=0e17b0b875f041659e186639705112b1&"
                        className="aspect-square w-6"
                      />
                    </div>
                  </div>
                  <div className="mt-10 flex w-[137px] max-w-full flex-col justify-center self-center text-base font-semibold leading-6 tracking-normal text-blue-600">
                    <div className="justify-center rounded-md">Register my Device</div>
                  </div>
                </div>
                <div className="mt-32 flex justify-center gap-1 rounded-md px-4 py-2 max-lg:mt-10">
                  <div className="text-sm font-medium leading-5 tracking-normal text-sky-950">
                    Login Environment Tips
                  </div>
                  <div className="my-auto flex items-center justify-center">
                    <img
                      loading="lazy"
                      src="https://cdn.builder.io/api/v1/image/assets/TEMP/4b8136d5ec9c9c5e03705f7b20b01e8334a90bebee9a8f507f4ec5dbad2f1971?apiKey=0e17b0b875f041659e186639705112b1&"
                      className="aspect-square w-4"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPageBody;
