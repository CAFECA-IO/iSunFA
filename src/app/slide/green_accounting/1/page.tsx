'use client';

export default function GreenAccountingSlide1() {
  return (
    <div className="min-h-screen w-full bg-neutral-50 flex items-center justify-center p-4">
      <div className="w-[1280px] h-[720px] bg-white relative overflow-hidden shadow-2xl flex flex-col items-center justify-center border border-gray-200">

        {/* Info: (20260212 - Luphia) Background Gradients - Green Theme */}
        <div
          className="absolute inset-x-0 -top-40 -z-10 transform-gpu overflow-hidden blur-3xl pointer-events-none"
          aria-hidden="true"
        >
          <div
            className="relative left-[calc(50%-11rem)] aspect-[1155/678] w-[70rem] -translate-x-1/2 rotate-[30deg] bg-gradient-to-tr from-emerald-500 to-teal-400 opacity-20"
            style={{
              clipPath:
                'polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)',
            }}
          />
        </div>

        <div
          className="absolute inset-x-0 top-[calc(100%-13rem)] -z-10 transform-gpu overflow-hidden blur-3xl pointer-events-none"
          aria-hidden="true"
        >
          <div
            className="relative left-[calc(50%+3rem)] aspect-[1155/678] w-[70rem] -translate-x-1/2 bg-gradient-to-tr from-emerald-600 to-green-500 opacity-20"
            style={{
              clipPath:
                'polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)',
            }}
          />
        </div>

        {/* Info: (20260212 - Luphia) Delicate Pattern Overlay */}
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-[0.02] pointer-events-none"></div>

        {/* Info: (20260212 - Luphia) Content Container */}
        <div className="z-10 text-center space-y-8 animate-fade-in-up">

          {/* Info: (20260212 - Luphia) Brand area */}
          <div className="mb-12">
            <span className="text-emerald-700 font-bold tracking-[0.25em] text-sm md:text-base border border-emerald-200 px-6 py-2 rounded-full uppercase bg-emerald-50/50 backdrop-blur-sm shadow-sm">
              Green Accounting
            </span>
          </div>

          {/* Info: (20260212 - Luphia) Main Title */}
          <h1 className="text-8xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-br from-emerald-900 via-emerald-700 to-teal-600 leading-[1.1] drop-shadow-sm pb-4 mx-auto max-w-7xl">
            新北淨零智匯
            <br />
            <span className="text-6xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-emerald-700 to-teal-600 mt-4 block">
              企業碳會計數位轉型專案
            </span>
          </h1>

        </div>

        {/* Info: (20260212 - Luphia) Footer / Deco */}
        <div className="absolute bottom-6 w-full px-16 flex justify-between text-gray-400 text-[10px] tracking-[0.2em] uppercase font-medium">
          <div>iSunFA Green Accounting</div>
          <div className="flex gap-2 items-center">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
            2026 CAFECA Fintech
          </div>
        </div>

      </div>
    </div>
  );
}
