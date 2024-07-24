/* eslint-disable tailwindcss/no-arbitrary-value */
// TODO: 在 tailwindcss.config 註冊 css 變數，取消 eslint-disable (20240723 - Shirley Anna)
import React from 'react';
import Image from 'next/image';

const IncomeStatementReportBodyAll = () => {
  const page1 = (
    <div>
      {/* Info: watermark logo (20240723 - Anna) */}
      <div className="relative right-0 top-16 z-0">
        <Image
          className="absolute right-0 top-0"
          src="/logo/watermark_logo.svg"
          alt="isunfa logo"
          width={400}
          height={300}
        />
      </div>

      <header className="mb-[86px] flex justify-between text-white">
        <div className="w-[30%] bg-surface-brand-secondary pb-14px pl-[10px] pr-14px pt-[40px] font-bold">
          <div className="">
            <h1 className="mb-30px text-h6">
              2330 <br />
              台灣積體電路製造股份有限公司
            </h1>
            <p className="font-normal">
              2023年第四季 <br />
              合併財務報告 - 綜合損益表
            </p>
          </div>
        </div>
        <div className="box-border w-35% text-right">
          <h2 className="relative border-b-[10px] border-b-surface-brand-primary pr-5 pt-6 text-h6 font-bold text-surface-brand-secondary-soft">
            Income Statement
            <span className="absolute bottom-[-20px] right-0 h-[5px] w-[75%] bg-surface-brand-secondary"></span>
          </h2>
        </div>
      </header>

      <section className="text-text-neutral-secondary">
        <div className="text-primary-surface-brand-secondary z-1 relative mb-[16px] flex justify-between font-semibold text-surface-brand-secondary">
          <p>一、項目彙總格式</p>
          <p>單位：新台幣仟元 每股盈餘單位：新台幣元</p>
        </div>
        <table className="z-1 relative w-full border-collapse bg-white">
          <thead>
            <tr>
              <th className="border border-[#c1c9d5] bg-[#ffd892] p-[10px] text-left text-[14px] font-semibold">
                代號
              </th>
              <th className="border border-[#c1c9d5] bg-[#ffd892] p-[10px] text-left text-[14px] font-semibold">
                會計項目
              </th>
              <th
                className="border border-[#c1c9d5] bg-[#ffd892] p-[10px] text-end text-[14px] font-semibold"
                style={{ whiteSpace: 'nowrap' }}
              >
                2023-1-1 至 2023-12-31
              </th>
              <th className="border border-[#c1c9d5] bg-[#ffd892] p-[10px] text-center text-[14px] font-semibold">
                %
              </th>
              <th
                className="border border-[#c1c9d5] bg-[#ffd892] p-[10px] text-end text-[14px] font-semibold"
                style={{ whiteSpace: 'nowrap' }}
              >
                2022-1-1 至 2022-12-31
              </th>
              <th className="border border-[#c1c9d5] bg-[#ffd892] p-[10px] text-center text-[14px] font-semibold">
                %
              </th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="border border-[#dee2e6] p-[10px] text-[14px]">4000</td>
              <td className="border border-[#dee2e6] p-[10px] text-[14px]">營業收入</td>
              <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">
                2,161,735,841
              </td>
              <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">100</td>
              <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">
                2,263,891,292
              </td>
              <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">100</td>
            </tr>
            <tr>
              <td className="border border-[#dee2e6] p-[10px] text-[14px]">5000</td>
              <td className="border border-[#dee2e6] p-[10px] text-[14px]">營業成本</td>
              <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">986,625,213</td>
              <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">46</td>
              <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">915,536,486</td>
              <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">40</td>
            </tr>
            <tr>
              <td className="border border-[#dee2e6] p-[10px] text-[14px]">5950</td>
              <td className="border border-[#dee2e6] p-[10px] text-[14px]">營業毛利（毛損）潤額</td>
              <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">
                1,175,110,628
              </td>
              <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">54</td>
              <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">
                1,348,354,806
              </td>
              <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">60</td>
            </tr>
            <tr>
              <td className="border border-[#dee2e6] p-[10px] text-[14px]">6100</td>
              <td className="border border-[#dee2e6] p-[10px] text-[14px]">推銷費用</td>
              <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">10,590,705</td>
              <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">-</td>
              <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">9,920,446</td>
              <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">1</td>
            </tr>
            <tr>
              <td className="border border-[#dee2e6] p-[10px] text-[14px]">6200</td>
              <td className="border border-[#dee2e6] p-[10px] text-[14px]">管理費用</td>
              <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">60,872,841</td>
              <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">3</td>
              <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">53,524,898</td>
              <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">2</td>
            </tr>
            <tr>
              <td className="border border-[#dee2e6] p-[10px] text-[14px]">6300</td>
              <td className="border border-[#dee2e6] p-[10px] text-[14px]">研究發展費用</td>
              <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">182,370,170</td>
              <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">8</td>
              <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">163,262,283</td>
              <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">7</td>
            </tr>
            <tr>
              <td className="border border-[#dee2e6] p-[10px] text-[14px]">6000</td>
              <td className="border border-[#dee2e6] p-[10px] text-[14px]">營業費用合計</td>
              <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">253,833,716</td>
              <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">11</td>
              <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">226,707,525</td>
              <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">10</td>
            </tr>
            <tr>
              <td className="border border-[#dee2e6] p-[10px] text-[14px]">6500</td>
              <td className="border border-[#dee2e6] p-[10px] text-[14px]">其他收益及費損淨額</td>
              <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">188,694</td>
              <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">-</td>
              <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">(368,403)</td>
              <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">-</td>
            </tr>
            <tr>
              <td className="border border-[#dee2e6] p-[10px] text-[14px]">6900</td>
              <td className="border border-[#dee2e6] p-[10px] text-[14px]">營業利益（損失）</td>
              <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">921,465,606</td>
              <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">43</td>
              <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">
                1,121,278,851
              </td>
              <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">50</td>
            </tr>
          </tbody>
        </table>
      </section>
      <footer className="mt-[40px] flex items-center justify-between border-t-2 border-[#e0e0e0] bg-surface-brand-secondary p-[10px]">
        <p className="m-0 text-[12px] text-white">1</p>
        <div className="text-[16px] font-bold text-surface-brand-secondary">
          <img src="/logo/white_isunfa_logo_light.svg" alt="Company Logo" />
        </div>
      </footer>
    </div>
  );
  const page2 = (
    <div>
      <header className="flex justify-between text-white">
        <div className="mt-[29px] flex w-[28%]">
          <div className="h-[10px] w-[82.5%] bg-surface-brand-secondary"></div>
          <div className="h-[10px] w-[17.5%] bg-surface-brand-primary"></div>
        </div>
        <div className="flex flex-col">
          <div className="h-1 bg-surface-brand-secondary"></div>
          <div className="mt-1 h-1 bg-surface-brand-primary"></div>
        </div>
        <div className="w-35% text-right">
          <h2 className="relative border-b-[10px] border-b-surface-brand-primary pr-5 pt-6 text-h6 font-bold text-surface-brand-secondary-soft">
            Income Statement
            <span className="absolute bottom-[-20px] right-0 h-[5px] w-[75%] bg-surface-brand-secondary"></span>
          </h2>
        </div>
      </header>
      <section className="text-text-neutral-secondary">
        <div className="mb-[16px] mt-[32px] flex justify-between font-semibold text-surface-brand-secondary">
          <p>一、項目彙總格式</p>
          <p>單位：新台幣仟元 每股盈餘單位：新台幣元</p>
        </div>
        <table className="w-full border-collapse bg-white">
          <thead>
            <tr>
              <th className="border border-[#c1c9d5] bg-[#ffd892] p-[10px] text-left text-[14px] font-semibold">
                代號
              </th>
              <th className="border border-[#c1c9d5] bg-[#ffd892] p-[10px] text-left text-[14px] font-semibold">
                會計項目
              </th>
              <th
                className="border border-[#c1c9d5] bg-[#ffd892] p-[10px] text-end text-[14px] font-semibold"
                style={{ whiteSpace: 'nowrap' }}
              >
                2023-1-1 至 2023-12-31
              </th>
              <th className="border border-[#c1c9d5] bg-[#ffd892] p-[10px] text-center text-[14px] font-semibold">
                %
              </th>
              <th
                className="border border-[#c1c9d5] bg-[#ffd892] p-[10px] text-end text-[14px] font-semibold"
                style={{ whiteSpace: 'nowrap' }}
              >
                2022-1-1 至 2022-12-31
              </th>
              <th className="border border-[#c1c9d5] bg-[#ffd892] p-[10px] text-center text-[14px] font-semibold">
                %
              </th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="border border-[#dee2e6] p-[10px] text-[14px]">7100</td>
              <td className="border border-[#dee2e6] p-[10px] text-[14px]">營業外收入及支出</td>
              <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">60,293,901</td>
              <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">3</td>
              <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">22,422,209</td>
              <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">1</td>
            </tr>
            <tr>
              <td className="border border-[#dee2e6] p-[10px] text-[14px]">7010</td>
              <td className="border border-[#dee2e6] p-[10px] text-[14px]">利息收入合計</td>
              <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">479,984</td>
              <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">-</td>
              <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">947,697</td>
              <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">-</td>
            </tr>
            <tr>
              <td className="border border-[#dee2e6] p-[10px] text-[14px]">7020</td>
              <td className="border border-[#dee2e6] p-[10px] text-[14px]">其他收益及損失淨額</td>
              <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">4,276,095</td>
              <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">-</td>
              <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">3,493,538</td>
              <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">-</td>
            </tr>
            <tr>
              <td className="border border-[#dee2e6] p-[10px] text-[14px]">7050</td>
              <td className="border border-[#dee2e6] p-[10px] text-[14px]">財務成本淨額</td>
              <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">11,999,360</td>
              <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">(1)</td>
              <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">11,749,984</td>
              <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">(1)</td>
            </tr>
            <tr>
              <td className="border border-[#dee2e6] p-[10px] text-[14px]">7060</td>
              <td className="border border-[#dee2e6] p-[10px] text-[14px]">
                採用權益法認列之關聯企業及合資損益之份額淨額
              </td>
              <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">4,655,098</td>
              <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">-</td>
              <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">7,798,359</td>
              <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">-</td>
            </tr>
            <tr>
              <td className="border border-[#dee2e6] p-[10px] text-[14px]">7000</td>
              <td className="border border-[#dee2e6] p-[10px] text-[14px]">營業外收入及支出合計</td>
              <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">57,705,718</td>
              <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">2</td>
              <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">22,911,867</td>
              <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">1</td>
            </tr>
            <tr>
              <td className="border border-[#dee2e6] p-[10px] text-[14px]">7900</td>
              <td className="border border-[#dee2e6] p-[10px] text-[14px]">
                繼續營業單位稅前淨利（淨損）
              </td>
              <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">979,171,324</td>
              <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">45</td>
              <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">
                1,144,190,764
              </td>
              <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">51</td>
            </tr>
            <tr>
              <td className="border border-[#dee2e6] p-[10px] text-[14px]">7950</td>
              <td className="border border-[#dee2e6] p-[10px] text-[14px]">
                所得稅費用（利益）合計
              </td>
              <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">141,403,807</td>
              <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">6</td>
              <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">127,290,065</td>
              <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">6</td>
            </tr>
            <tr>
              <td className="border border-[#dee2e6] p-[10px] text-[14px]">8000</td>
              <td className="border border-[#dee2e6] p-[10px] text-[14px]">
                繼續營業單位本期淨利（淨損）
              </td>
              <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">837,767,517</td>
              <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">39</td>
              <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">
                1,016,900,515
              </td>
              <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">45</td>
            </tr>
            <tr>
              <td className="border border-[#dee2e6] p-[10px] text-[14px]">8200</td>
              <td className="border border-[#dee2e6] p-[10px] text-[14px]">本期淨利（淨損）</td>
              <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">837,767,517</td>
              <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">39</td>
              <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">
                1,016,900,515
              </td>
              <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">45</td>
            </tr>
            <tr>
              <td className="border border-[#dee2e6] p-[10px] text-[14px]">8310</td>
              <td className="border border-[#dee2e6] p-[10px] text-[14px]">其他綜合損益淨額</td>
              <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">1,538,305</td>
              <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">-</td>
              <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">-198,396</td>
              <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">-</td>
            </tr>
            <tr>
              <td className="border border-[#dee2e6] p-[10px] text-[14px]">8360</td>
              <td className="border border-[#dee2e6] p-[10px] text-[14px]">
                不重分類至損益之項目淨額
              </td>
              <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">(10,351,949)</td>
              <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">-1</td>
              <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">42,628,561</td>
              <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">2</td>
            </tr>
          </tbody>
        </table>
      </section>
      <footer className="mt-[40px] flex items-center justify-between border-t-2 border-[#e0e0e0] bg-surface-brand-secondary p-[10px]">
        <p className="m-0 text-[12px] text-white">2</p>
        <div className="text-[16px] font-bold text-surface-brand-secondary">
          <img src="/logo/white_isunfa_logo_light.svg" alt="Company Logo" />
        </div>
      </footer>
    </div>
  );
const page3 = (
  <div>
    <header className="flex justify-between text-white">
      <div className="mt-[29px] flex w-[28%]">
        <div className="h-[10px] w-[82.5%] bg-surface-brand-secondary"></div>
        <div className="h-[10px] w-[17.5%] bg-surface-brand-primary"></div>
      </div>
      <div className="flex flex-col">
        <div className="h-1 bg-surface-brand-secondary"></div>
        <div className="mt-1 h-1 bg-surface-brand-primary"></div>
      </div>
      <div className="w-35% text-right">
        <h2 className="relative border-b-[10px] border-b-surface-brand-primary pr-5 pt-6 text-h6 font-bold text-surface-brand-secondary-soft">
          Income Statement
          <span className="absolute bottom-[-20px] right-0 h-[5px] w-[75%] bg-surface-brand-secondary"></span>
        </h2>
      </div>
    </header>
    <section className="text-text-neutral-secondary">
      <div className="mb-[16px] mt-[32px] flex justify-between font-semibold text-surface-brand-secondary">
        <p>一、項目彙總格式</p>
        <p>單位：新台幣仟元 每股盈餘單位：新台幣元</p>
      </div>
      <table className="w-full border-collapse bg-white">
        <thead>
          <tr>
            <th className="border border-[#c1c9d5] bg-[#ffd892] p-[10px] text-left text-[14px] font-semibold">
              代號
            </th>
            <th className="border border-[#c1c9d5] bg-[#ffd892] p-[10px] text-left text-[14px] font-semibold">
              會計項目
            </th>
            <th
              className="border border-[#c1c9d5] bg-[#ffd892] p-[10px] text-end text-[14px] font-semibold"
              style={{ whiteSpace: 'nowrap' }}
            >
              2023-1-1 至 2023-12-31
            </th>
            <th className="border border-[#c1c9d5] bg-[#ffd892] p-[10px] text-center text-[14px] font-semibold">
              %
            </th>
            <th
              className="border border-[#c1c9d5] bg-[#ffd892] p-[10px] text-end text-[14px] font-semibold"
              style={{ whiteSpace: 'nowrap' }}
            >
              2022-1-1 至 2022-12-31
            </th>
            <th className="border border-[#c1c9d5] bg-[#ffd892] p-[10px] text-center text-[14px] font-semibold">
              %
            </th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="border border-[#dee2e6] p-[10px] text-[14px]">8300</td>
            <td className="border border-[#dee2e6] p-[10px] text-[14px]">其他綜合損益（淨額）</td>
            <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">-8,813,644</td>
            <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">-1</td>
            <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">42,430,165</td>
            <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">2</td>
          </tr>
          <tr>
            <td className="border border-[#dee2e6] p-[10px] text-[14px]">8500</td>
            <td className="border border-[#dee2e6] p-[10px] text-[14px]">本期綜合損益總額</td>
            <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">828,953,873</td>
            <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">38</td>
            <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">1,059,330,680</td>
            <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">47</td>
          </tr>
          <tr>
            <td colSpan={6} className="border border-[#dee2e6] p-[10px] text-[14px]">
              淨利（損）歸屬於：
            </td>
          </tr>
          <tr>
            <td className="border border-[#dee2e6] p-[10px] text-[14px]">8610</td>
            <td className="border border-[#dee2e6] p-[10px] text-[14px]">母公司業主（淨利/損）</td>
            <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">838,497,664</td>
            <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">39</td>
            <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">1,016,530,249</td>
            <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">45</td>
          </tr>
          <tr>
            <td className="border border-[#dee2e6] p-[10px] text-[14px]">8620</td>
            <td className="border border-[#dee2e6] p-[10px] text-[14px]">非控制權益（淨利/損）</td>
            <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">-730,147</td>
            <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">-</td>
            <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">370,266</td>
            <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">-</td>
          </tr>
          <tr>
            <td colSpan={6} className="border border-[#dee2e6] p-[10px] text-[14px]">
              綜合損益總額歸屬於：
            </td>
          </tr>
          <tr>
            <td className="border border-[#dee2e6] p-[10px] text-[14px]">8710</td>
            <td className="border border-[#dee2e6] p-[10px] text-[14px]">母公司業主（綜合損益）</td>
            <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">830,509,542</td>
            <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">38</td>
            <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">1,059,124,890</td>
            <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">47</td>
          </tr>
          <tr>
            <td className="border border-[#dee2e6] p-[10px] text-[14px]">8720</td>
            <td className="border border-[#dee2e6] p-[10px] text-[14px]">非控制權益（綜合損益）</td>
            <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">-1,555,669</td>
            <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">-</td>
            <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">205,790</td>
            <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">-</td>
          </tr>
          <tr className="font-semibold">
            <td className="eps border border-[#dee2e6] p-[10px] text-[14px]">9750</td>
            <td className="eps border border-[#dee2e6] p-[10px] text-[14px]">基本每股盈餘合計</td>
            <td className="eps border border-[#dee2e6] p-[10px] text-end text-[14px]">32.34</td>
            <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]"></td>
            <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]"></td>
            <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]"></td>
          </tr>
          <tr className="font-semibold">
            <td className="eps border border-[#dee2e6] p-[10px] text-[14px]">9850</td>
            <td className="eps border border-[#dee2e6] p-[10px] text-[14px]">稀釋每股盈餘合計</td>
            <td className="eps border border-[#dee2e6] p-[10px] text-end text-[14px]">32.34</td>
            <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]"></td>
            <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]"></td>
            <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]"></td>
          </tr>
        </tbody>
      </table>
      <div className="relative mt-6">
        <Image
          className="absolute bottom-[-100px] right-0 h-auto w-auto opacity-5"
          src="/logo/watermark_logo.svg"
          alt="iSunFA"
          width={450}
          height={300}
        />
      </div>
    </section>
    <footer className="mt-[40px] flex items-center justify-between border-t-2 border-[#e0e0e0] bg-surface-brand-secondary p-[10px]">
      <p className="m-0 text-[12px] text-white">3</p>
      <div className="text-[16px] font-bold text-surface-brand-secondary">
        <img src="/logo/white_isunfa_logo_light.svg" alt="Company Logo" />
      </div>
    </footer>
  </div>
);
const page4 = (
  <div>
    <header className="flex justify-between text-white">
      <div className="mt-[29px] flex w-[28%]">
        <div className="h-[10px] w-[82.5%] bg-surface-brand-secondary"></div>
        <div className="h-[10px] w-[17.5%] bg-surface-brand-primary"></div>
      </div>
      <div className="flex flex-col">
        <div className="h-1 bg-surface-brand-secondary"></div>
        <div className="mt-1 h-1 bg-surface-brand-primary"></div>
      </div>
      <div className="w-35% text-right">
        <h2 className="relative border-b-[10px] border-b-surface-brand-primary pr-5 pt-6 text-h6 font-bold text-surface-brand-secondary-soft">
          Income Statement
          <span className="absolute bottom-[-20px] right-0 h-[5px] w-[75%] bg-surface-brand-secondary"></span>
        </h2>
      </div>
    </header>
    <section className="text-text-neutral-secondary">
      <div className="mb-[16px] mt-[32px] flex justify-between font-semibold text-surface-brand-secondary">
        <p>二、細項分類格式</p>
        <p>單位：新台幣仟元 每股盈餘單位：新台幣元</p>
      </div>
      <table className="w-full border-collapse bg-white">
        <thead>
          <tr>
            <th className="border border-[#c1c9d5] bg-[#ffd892] p-[10px] text-left text-[14px] font-semibold">
              代號
            </th>
            <th className="border border-[#c1c9d5] bg-[#ffd892] p-[10px] text-left text-[14px] font-semibold">
              會計項目
            </th>
            <th
              className="border border-[#c1c9d5] bg-[#ffd892] p-[10px] text-end text-[14px] font-semibold"
              style={{ whiteSpace: 'nowrap' }}
            >
              2023-1-1 至 2023-12-31
            </th>
            <th className="border border-[#c1c9d5] bg-[#ffd892] p-[10px] text-center text-[14px] font-semibold">
              %
            </th>
            <th
              className="border border-[#c1c9d5] bg-[#ffd892] p-[10px] text-end text-[14px] font-semibold"
              style={{ whiteSpace: 'nowrap' }}
            >
              2022-1-1 至 2022-12-31
            </th>
            <th className="border border-[#c1c9d5] bg-[#ffd892] p-[10px] text-center text-[14px] font-semibold">
              %
            </th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="border border-[#dee2e6] p-[10px] text-[14px]">4000</td>
            <td className="border border-[#dee2e6] p-[10px] text-[14px]">營業收入合計</td>
            <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">2,161,735,841</td>
            <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">100</td>
            <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">2,263,891,292</td>
            <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">100</td>
          </tr>
          <tr>
            <td colSpan={6} className="border border-[#dee2e6] p-[10px] text-[14px]">
              營業成本
            </td>
          </tr>
          <tr>
            <td className="border border-[#dee2e6] p-[10px] text-[14px]">5000</td>
            <td className="border border-[#dee2e6] p-[10px] text-[14px]">營業成本合計</td>
            <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">986,625,213</td>
            <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">46</td>
            <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">915,536,486</td>
            <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">40</td>
          </tr>
          <tr>
            <td colSpan={6} className="border border-[#dee2e6] p-[10px] text-[14px]">
              營業毛利（毛損）
            </td>
          </tr>
          <tr>
            <td className="border border-[#dee2e6] p-[10px] text-[14px]">5900</td>
            <td className="border border-[#dee2e6] p-[10px] text-[14px]">營業毛利（毛損）</td>
            <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">1,175,110,628</td>
            <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">54</td>
            <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">1,348,354,806</td>
            <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">60</td>
          </tr>
          <tr>
            <td className="border border-[#dee2e6] p-[10px] text-[14px]">5950</td>
            <td className="border border-[#dee2e6] p-[10px] text-[14px]">營業毛利（毛損）淨額</td>
            <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">1,175,110,628</td>
            <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">54</td>
            <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">1,348,354,806</td>
            <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">60</td>
          </tr>
          <tr>
            <td colSpan={6} className="border border-[#dee2e6] p-[10px] text-[14px]">
              營業費用
            </td>
          </tr>
          <tr>
            <td className="border border-[#dee2e6] p-[10px] text-[14px]">6100</td>
            <td className="border border-[#dee2e6] p-[10px] text-[14px]">推銷費用</td>
            <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">10,590,705</td>
            <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">-</td>
            <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">9,920,446</td>
            <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">1</td>
          </tr>
          <tr>
            <td className="border border-[#dee2e6] p-[10px] text-[14px]">6200</td>
            <td className="border border-[#dee2e6] p-[10px] text-[14px]">管理費用</td>
            <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">60,872,841</td>
            <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">3</td>
            <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">53,524,898</td>
            <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">2</td>
          </tr>
          <tr>
            <td className="border border-[#dee2e6] p-[10px] text-[14px]">6300</td>
            <td className="border border-[#dee2e6] p-[10px] text-[14px]">研究發展費用</td>
            <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">182,370,170</td>
            <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">8</td>
            <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">163,262,208</td>
            <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">7</td>
          </tr>
          <tr>
            <td className="border border-[#dee2e6] p-[10px] text-[14px]">6000</td>
            <td className="border border-[#dee2e6] p-[10px] text-[14px]">營業費用合計</td>
            <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">253,833,716</td>
            <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">11</td>
            <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">226,707,552</td>
            <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">10</td>
          </tr>
          <tr>
            <td colSpan={6} className="border border-[#dee2e6] p-[10px] text-[14px]">
              其他收益及費損淨額
            </td>
          </tr>
          <tr>
            <td className="border border-[#dee2e6] p-[10px] text-[14px]">6500</td>
            <td className="border border-[#dee2e6] p-[10px] text-[14px]">其他收益及費損淨額</td>
            <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">188,694</td>
            <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">-</td>
            <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">(368,403)</td>
            <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">-</td>
          </tr>
          <tr>
            <td className="border border-[#dee2e6] p-[10px] text-[14px]">6900</td>
            <td className="border border-[#dee2e6] p-[10px] text-[14px]">營業利益（損失）</td>
            <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">921,465,606</td>
            <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">43</td>
            <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">1,121,278,851</td>
            <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">50</td>
          </tr>
          <tr>
            <td colSpan={6} className="border border-[#dee2e6] p-[10px] text-[14px]">
              營業外收入及支出
            </td>
          </tr>
        </tbody>
      </table>
    </section>
    <footer className="mt-[40px] flex items-center justify-between border-t-2 border-[#e0e0e0] bg-surface-brand-secondary p-[10px]">
      <p className="m-0 text-[12px] text-white">4</p>
      <div className="text-[16px] font-bold text-surface-brand-secondary">
        <img src="/logo/white_isunfa_logo_light.svg" alt="iSunFA Logo" />
      </div>
    </footer>
  </div>
);
const page5 = (
  <div>
    <header className="flex justify-between text-white">
      <div className="mt-[29px] flex w-[28%]">
        <div className="h-[10px] w-[82.5%] bg-surface-brand-secondary"></div>
        <div className="h-[10px] w-[17.5%] bg-surface-brand-primary"></div>
      </div>
      <div className="flex flex-col">
        <div className="h-1 bg-surface-brand-secondary"></div>
        <div className="mt-1 h-1 bg-surface-brand-primary"></div>
      </div>
      <div className="w-35% text-right">
        <h2 className="relative border-b-[10px] border-b-surface-brand-primary pr-5 pt-6 text-h6 font-bold text-surface-brand-secondary-soft">
          Income Statement
          <span className="absolute bottom-[-20px] right-0 h-[5px] w-[75%] bg-surface-brand-secondary"></span>
        </h2>
      </div>
    </header>
    <section className="text-text-neutral-secondary">
      <div className="mb-[16px] mt-[32px] flex justify-between font-semibold text-surface-brand-secondary">
        <p>二、細項分類格式</p>
        <p>單位：新台幣仟元 每股盈餘單位：新台幣元</p>
      </div>
      <table className="w-full border-collapse bg-white">
        <thead>
          <tr>
            <th className="border border-[#c1c9d5] bg-[#ffd892] p-[10px] text-left text-[14px] font-semibold">
              代號
            </th>
            <th className="border border-[#c1c9d5] bg-[#ffd892] p-[10px] text-left text-[14px] font-semibold">
              會計項目
            </th>
            <th
              className="border border-[#c1c9d5] bg-[#ffd892] p-[10px] text-end text-[14px] font-semibold"
              style={{ whiteSpace: 'nowrap' }}
            >
              2023-1-1 至 2023-12-31
            </th>
            <th className="border border-[#c1c9d5] bg-[#ffd892] p-[10px] text-center text-[14px] font-semibold">
              %
            </th>
            <th
              className="border border-[#c1c9d5] bg-[#ffd892] p-[10px] text-end text-[14px] font-semibold"
              style={{ whiteSpace: 'nowrap' }}
            >
              2022-1-1 至 2022-12-31
            </th>
            <th className="border border-[#c1c9d5] bg-[#ffd892] p-[10px] text-center text-[14px] font-semibold">
              %
            </th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="border border-[#dee2e6] p-[10px] text-[14px]">7101</td>
            <td className="border border-[#dee2e6] p-[10px] text-[14px]">銀行存款利息</td>
            <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">49,740,006</td>
            <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">3</td>
            <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">17,831,257</td>
            <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">1</td>
          </tr>
          <tr>
            <td className="border border-[#dee2e6] p-[10px] text-[14px]">7102</td>
            <td className="border border-[#dee2e6] p-[10px] text-[14px]">
              按攤銷後成本衡量之金融資產利息收入
            </td>
            <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">6,363,684</td>
            <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">-</td>
            <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">2,008,611</td>
            <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">-</td>
          </tr>
          <tr>
            <td className="border border-[#dee2e6] p-[10px] text-[14px]">7106</td>
            <td className="border border-[#dee2e6] p-[10px] text-[14px]">
              透過其他綜合損益按公允價值衡量之金融資產利息收入
            </td>
            <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">4,190,211</td>
            <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">-</td>
            <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">2,582,341</td>
            <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">-</td>
          </tr>
          <tr>
            <td className="border border-[#dee2e6] p-[10px] text-[14px]">7100</td>
            <td className="border border-[#dee2e6] p-[10px] text-[14px]">利息收入合計</td>
            <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">60,293,901</td>
            <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">3</td>
            <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">22,422,209</td>
            <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">1</td>
          </tr>
          <tr>
            <td className="border border-[#dee2e6] p-[10px] text-[14px]">7190</td>
            <td className="border border-[#dee2e6] p-[10px] text-[14px]">其他收入－其他</td>
            <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">479,984</td>
            <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">-</td>
            <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">947,697</td>
            <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">-</td>
          </tr>
          <tr>
            <td className="border border-[#dee2e6] p-[10px] text-[14px]">7010</td>
            <td className="border border-[#dee2e6] p-[10px] text-[14px]">其他收入合計</td>
            <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">479,984</td>
            <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">-</td>
            <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">947,697</td>
            <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">-</td>
          </tr>
          <tr>
            <td className="border border-[#dee2e6] p-[10px] text-[14px]">7020</td>
            <td className="border border-[#dee2e6] p-[10px] text-[14px]">其他利益及損失淨額</td>
            <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">4,276,095</td>
            <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">-</td>
            <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">3,493,586</td>
            <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">-</td>
          </tr>
          <tr>
            <td className="border border-[#dee2e6] p-[10px] text-[14px]">7050</td>
            <td className="border border-[#dee2e6] p-[10px] text-[14px]">財務成本淨額</td>
            <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">11,999,360</td>
            <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">(1)</td>
            <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">11,749,984</td>
            <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">(1)</td>
          </tr>
          <tr>
            <td colSpan={6} className="border border-[#dee2e6] p-[10px] text-[14px]">
              採用權益法認列之關聯企業及合資損益之份額
            </td>
          </tr>
        </tbody>
      </table>
    </section>
    <footer className="mt-[40px] flex items-center justify-between border-t-2 border-[#e0e0e0] bg-surface-brand-secondary p-[10px]">
      <p className="m-0 text-[12px] text-white">5</p>
      <div className="text-[16px] font-bold text-surface-brand-secondary">
        <img src="/logo/white_isunfa_logo_light.svg" alt="iSunFA Logo" />
      </div>
    </footer>
  </div>
);
const page6 = (
  <div>
    <header className="flex justify-between text-white">
      <div className="mt-[29px] flex w-[28%]">
        <div className="h-[10px] w-[82.5%] bg-surface-brand-secondary"></div>
        <div className="h-[10px] w-[17.5%] bg-surface-brand-primary"></div>
      </div>
      <div className="flex flex-col">
        <div className="h-1 bg-surface-brand-secondary"></div>
        <div className="mt-1 h-1 bg-surface-brand-primary"></div>
      </div>
      <div className="w-35% text-right">
        <h2 className="relative border-b-[10px] border-b-surface-brand-primary pr-5 pt-6 text-h6 font-bold text-surface-brand-secondary-soft">
          Income Statement
          <span className="absolute bottom-[-20px] right-0 h-[5px] w-[75%] bg-surface-brand-secondary"></span>
        </h2>
      </div>
    </header>
    <section className="text-text-neutral-secondary">
      <div className="mb-[16px] mt-[32px] flex justify-between font-semibold text-surface-brand-secondary">
        <p>二、細項分類格式</p>
        <p>單位：新台幣仟元 每股盈餘單位：新台幣元</p>
      </div>
      <table className="w-full border-collapse bg-white">
        <thead>
          <tr>
            <th className="border border-[#c1c9d5] bg-[#ffd892] p-[10px] text-left text-[14px] font-semibold">
              代號
            </th>
            <th className="border border-[#c1c9d5] bg-[#ffd892] p-[10px] text-left text-[14px] font-semibold">
              會計項目
            </th>
            <th
              className="border border-[#c1c9d5] bg-[#ffd892] p-[10px] text-end text-[14px] font-semibold"
              style={{ whiteSpace: 'nowrap' }}
            >
              2023-1-1 至 2023-12-31
            </th>
            <th className="border border-[#c1c9d5] bg-[#ffd892] p-[10px] text-center text-[14px] font-semibold">
              %
            </th>
            <th
              className="border border-[#c1c9d5] bg-[#ffd892] p-[10px] text-end text-[14px] font-semibold"
              style={{ whiteSpace: 'nowrap' }}
            >
              2022-1-1 至 2022-12-31
            </th>
            <th className="border border-[#c1c9d5] bg-[#ffd892] p-[10px] text-center text-[14px] font-semibold">
              %
            </th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="border border-[#dee2e6] p-[10px] text-[14px]">7060</td>
            <td className="border border-[#dee2e6] p-[10px] text-[14px]">
              採用權益法認列之關聯企業及合資損益之份額
            </td>
            <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">4,655,098</td>
            <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">-</td>
            <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">7,798,359</td>
            <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">-</td>
          </tr>
          <tr>
            <td className="border border-[#dee2e6] p-[10px] text-[14px]">7000</td>
            <td className="border border-[#dee2e6] p-[10px] text-[14px]">營業外收入及支出合計</td>
            <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">57,705,718</td>
            <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">2</td>
            <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">47,936,568</td>
            <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">1</td>
          </tr>
          <tr>
            <td className="border border-[#dee2e6] p-[10px] text-[14px]">7900</td>
            <td className="border border-[#dee2e6] p-[10px] text-[14px]">
              繼續營業單位稅前淨利（淨損）
            </td>
            <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">979,171,324</td>
            <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">45</td>
            <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">1,144,190,718</td>
            <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">51</td>
          </tr>
          <tr>
            <td colSpan={6} className="border border-[#dee2e6] p-[10px] text-[14px]">
              所得稅費用（利益）
            </td>
          </tr>
          <tr>
            <td className="border border-[#dee2e6] p-[10px] text-[14px]">7950</td>
            <td className="border border-[#dee2e6] p-[10px] text-[14px]">所得稅費用（利益）合計</td>
            <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">141,403,807</td>
            <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">6</td>
            <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">127,290,203</td>
            <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">6</td>
          </tr>
          <tr>
            <td className="border border-[#dee2e6] p-[10px] text-[14px]">8000</td>
            <td className="border border-[#dee2e6] p-[10px] text-[14px]">
              繼續營業單位本期淨利（淨損）
            </td>
            <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">837,767,517</td>
            <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">39</td>
            <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">1,016,900,515</td>
            <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">45</td>
          </tr>
          <tr>
            <td className="border border-[#dee2e6] p-[10px] text-[14px]">8200</td>
            <td className="border border-[#dee2e6] p-[10px] text-[14px]">本期淨利（淨損）</td>
            <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">837,767,517</td>
            <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">39</td>
            <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">1,016,900,515</td>
            <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">45</td>
          </tr>
          <tr>
            <td colSpan={6} className="border border-[#dee2e6] p-[10px] text-[14px]">
              其他綜合損益（淨額）
            </td>
          </tr>
          <tr>
            <td colSpan={6} className="border border-[#dee2e6] p-[10px] text-[14px]">
              不重分類至損益之項目
            </td>
          </tr>
          <tr>
            <td className="border border-[#dee2e6] p-[10px] text-[14px]">8311</td>
            <td className="border border-[#dee2e6] p-[10px] text-[14px]">確定福利計畫之再衡量數</td>
            <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">-623,356</td>
            <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">-</td>
            <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">-823,060</td>
            <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">-</td>
          </tr>
          <tr>
            <td className="border border-[#dee2e6] p-[10px] text-[14px]">8316</td>
            <td className="border border-[#dee2e6] p-[10px] text-[14px]">
              透過其他綜合損益按公允價值衡量之權益工具投資未實現評價損益
            </td>
            <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">1,954,653</td>
            <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">-</td>
            <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">-263,749</td>
            <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">-</td>
          </tr>
        </tbody>
      </table>
    </section>
    <footer className="mt-[40px] flex items-center justify-between border-t-2 border-[#e0e0e0] bg-surface-brand-secondary p-[10px]">
      <p className="m-0 text-[12px] text-white">6</p>
      <div className="text-[16px] font-bold text-surface-brand-secondary">
        <img src="/logo/white_isunfa_logo_light.svg" alt="iSunFA Logo" />
      </div>
    </footer>
  </div>
);
const page7 = (
  <div>
    <header className="flex justify-between text-white">
      <div className="mt-[29px] flex w-[28%]">
        <div className="h-[10px] w-[82.5%] bg-surface-brand-secondary"></div>
        <div className="h-[10px] w-[17.5%] bg-surface-brand-primary"></div>
      </div>
      <div className="flex flex-col">
        <div className="h-1 bg-surface-brand-secondary"></div>
        <div className="mt-1 h-1 bg-surface-brand-primary"></div>
      </div>
      <div className="w-35% text-right">
        <h2 className="relative border-b-[10px] border-b-surface-brand-primary pr-5 pt-6 text-h6 font-bold text-surface-brand-secondary-soft">
          Income Statement
          <span className="absolute bottom-[-20px] right-0 h-[5px] w-[75%] bg-surface-brand-secondary"></span>
        </h2>
      </div>
    </header>
    <section className="text-text-neutral-secondary">
      <div className="mb-[16px] mt-[32px] flex justify-between font-semibold text-surface-brand-secondary">
        <p>二、細項分類格式</p>
        <p>單位：新台幣仟元 每股盈餘單位：新台幣元</p>
      </div>
      <table className="w-full border-collapse bg-white">
        <thead>
          <tr>
            <th className="border border-[#c1c9d5] bg-[#ffd892] p-[10px] text-left text-[14px] font-semibold">
              代號
            </th>
            <th className="border border-[#c1c9d5] bg-[#ffd892] p-[10px] text-left text-[14px] font-semibold">
              會計項目
            </th>
            <th
              className="border border-[#c1c9d5] bg-[#ffd892] p-[10px] text-end text-[14px] font-semibold"
              style={{ whiteSpace: 'nowrap' }}
            >
              2023-1-1 至 2023-12-31
            </th>
            <th className="border border-[#c1c9d5] bg-[#ffd892] p-[10px] text-center text-[14px] font-semibold">
              %
            </th>
            <th
              className="border border-[#c1c9d5] bg-[#ffd892] p-[10px] text-end text-[14px] font-semibold"
              style={{ whiteSpace: 'nowrap' }}
            >
              2022-1-1 至 2022-12-31
            </th>
            <th className="border border-[#c1c9d5] bg-[#ffd892] p-[10px] text-center text-[14px] font-semibold">
              %
            </th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="border border-[#dee2e6] p-[10px] text-[14px]">8317</td>
            <td className="border border-[#dee2e6] p-[10px] text-[14px]">
              避險工具之損益－不重分類至損益
            </td>
            <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">39,898</td>
            <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">-</td>
            <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">-</td>
            <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">-</td>
          </tr>
          <tr>
            <td className="border border-[#dee2e6] p-[10px] text-[14px]">8320</td>
            <td className="border border-[#dee2e6] p-[10px] text-[14px]">
              採用權益法認列之關聯企業及合資之其他權益合計損益之份額－不重分類至損益之項目
            </td>
            <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">42,554</td>
            <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">-</td>
            <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">154,457</td>
            <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">-</td>
          </tr>
          <tr>
            <td className="border border-[#dee2e6] p-[10px] text-[14px]">8349</td>
            <td className="border border-[#dee2e6] p-[10px] text-[14px]">
              與不重分類之項目相關之所得稅
            </td>
            <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">-124,646</td>
            <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">-</td>
            <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">-733,965</td>
            <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">-</td>
          </tr>
          <tr>
            <td className="border border-[#dee2e6] p-[10px] text-[14px]">8310</td>
            <td className="border border-[#dee2e6] p-[10px] text-[14px]">
              不重分類至損益之項目總額
            </td>
            <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">1,538,305</td>
            <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">-</td>
            <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">-198,396</td>
            <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">-</td>
          </tr>
          <tr>
            <td colSpan={6} className="border border-[#dee2e6] p-[10px] text-[14px]">
              後續可能重分類至損益之項目
            </td>
          </tr>
          <tr>
            <td className="border border-[#dee2e6] p-[10px] text-[14px]">8361</td>
            <td className="border border-[#dee2e6] p-[10px] text-[14px]">
              國外營運機構財務報表換算之兌換差額
            </td>
            <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">-14,464,353</td>
            <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">-1</td>
            <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">50,845,614</td>
            <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">2</td>
          </tr>
          <tr>
            <td className="border border-[#dee2e6] p-[10px] text-[14px]">8367</td>
            <td className="border border-[#dee2e6] p-[10px] text-[14px]">
              透過其他綜合損益按公允價值衡量之債務工具投資未實現評價損益
            </td>
            <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">4,123,001</td>
            <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">-</td>
            <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">-10,102,658</td>
            <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">-</td>
          </tr>
          <tr>
            <td className="border border-[#dee2e6] p-[10px] text-[14px]">8368</td>
            <td className="border border-[#dee2e6] p-[10px] text-[14px]">避險工具之損益</td>
            <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">-74,735</td>
            <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">-</td>
            <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">1,329,231</td>
            <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">-</td>
          </tr>
          <tr>
            <td className="border border-[#dee2e6] p-[10px] text-[14px]">8370</td>
            <td className="border border-[#dee2e6] p-[10px] text-[14px]">
              採用權益法認列之關聯企業及合資之其他權益合計損益之份額－可能重分類至損益之項目
            </td>
            <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">63,938</td>
            <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">-</td>
            <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">550,338</td>
            <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">-</td>
          </tr>
          <tr>
            <td className="border border-[#dee2e6] p-[10px] text-[14px]">8399</td>
            <td className="border border-[#dee2e6] p-[10px] text-[14px]">
              與可能重分類之項目相關之所得稅
            </td>
            <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">0</td>
            <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">-</td>
            <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">-6,036</td>
            <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">-</td>
          </tr>
        </tbody>
      </table>
    </section>
    <footer className="mt-[40px] flex items-center justify-between border-t-2 border-[#e0e0e0] bg-surface-brand-secondary p-[10px]">
      <p className="m-0 text-[12px] text-white">7</p>
      <div className="text-[16px] font-bold text-surface-brand-secondary">
        <img src="/logo/white_isunfa_logo_light.svg" alt="iSunFA Logo" />
      </div>
    </footer>
  </div>
);
const page8 = (
  <div>
    <header className="flex justify-between text-white">
      <div className="mt-[29px] flex w-[28%]">
        <div className="h-[10px] w-[82.5%] bg-surface-brand-secondary"></div>
        <div className="h-[10px] w-[17.5%] bg-surface-brand-primary"></div>
      </div>
      <div className="flex flex-col">
        <div className="h-1 bg-surface-brand-secondary"></div>
        <div className="mt-1 h-1 bg-surface-brand-primary"></div>
      </div>
      <div className="w-35% text-right">
        <h2 className="relative border-b-[10px] border-b-surface-brand-primary pr-5 pt-6 text-h6 font-bold text-surface-brand-secondary-soft">
          Income Statement
          <span className="absolute bottom-[-20px] right-0 h-[5px] w-[75%] bg-surface-brand-secondary"></span>
        </h2>
      </div>
    </header>
    <section className="relative text-text-neutral-secondary">
      <div className="mb-[16px] mt-[32px] flex justify-between font-semibold text-surface-brand-secondary">
        <p>二、細項分類格式</p>
        <p>單位：新台幣仟元 每股盈餘單位：新台幣元</p>
      </div>
      <table className="relative z-10 w-full border-collapse bg-white">
        <thead>
          <tr>
            <th className="border border-[#c1c9d5] bg-[#ffd892] p-[10px] text-left text-[14px] font-semibold">
              代號
            </th>
            <th className="border border-[#c1c9d5] bg-[#ffd892] p-[10px] text-left text-[14px] font-semibold">
              會計項目
            </th>
            <th
              className="border border-[#c1c9d5] bg-[#ffd892] p-[10px] text-end text-[14px] font-semibold"
              style={{ whiteSpace: 'nowrap' }}
            >
              2023-1-1 至 2023-12-31
            </th>
            <th className="border border-[#c1c9d5] bg-[#ffd892] p-[10px] text-center text-[14px] font-semibold">
              %
            </th>
            <th
              className="border border-[#c1c9d5] bg-[#ffd892] p-[10px] text-end text-[14px] font-semibold"
              style={{ whiteSpace: 'nowrap' }}
            >
              2022-1-1 至 2022-12-31
            </th>
            <th className="border border-[#c1c9d5] bg-[#ffd892] p-[10px] text-center text-[14px] font-semibold">
              %
            </th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="border border-[#dee2e6] p-[10px] text-[14px]">8360</td>
            <td className="border border-[#dee2e6] p-[10px] text-[14px]">
              後續可能重分類至損益之項目總額
            </td>
            <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">-10,351,949</td>
            <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">-1</td>
            <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">42,628,561</td>
            <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">2</td>
          </tr>
          <tr>
            <td className="border border-[#dee2e6] p-[10px] text-[14px]">8300</td>
            <td className="border border-[#dee2e6] p-[10px] text-[14px]">其他綜合損益（淨額）</td>
            <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">-8,813,644</td>
            <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">-1</td>
            <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">42,430,165</td>
            <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">2</td>
          </tr>
          <tr>
            <td className="border border-[#dee2e6] p-[10px] text-[14px]">8500</td>
            <td className="border border-[#dee2e6] p-[10px] text-[14px]">本期綜合損益總額</td>
            <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">828,953,873</td>
            <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">38</td>
            <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">1,059,330,680</td>
            <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">47</td>
          </tr>
          <tr>
            <td colSpan={6} className="border border-[#dee2e6] p-[10px] text-[14px]">
              淨利（損）歸屬於：
            </td>
          </tr>
          <tr>
            <td className="border border-[#dee2e6] p-[10px] text-[14px]">8610</td>
            <td className="border border-[#dee2e6] p-[10px] text-[14px]">母公司業主（淨利/損）</td>
            <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">838,497,664</td>
            <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">39</td>
            <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">1,016,530,249</td>
            <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">45</td>
          </tr>
          <tr>
            <td className="border border-[#dee2e6] p-[10px] text-[14px]">8620</td>
            <td className="border border-[#dee2e6] p-[10px] text-[14px]">非控制權益（淨利/損）</td>
            <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">-730,147</td>
            <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">-</td>
            <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">370,266</td>
            <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">-</td>
          </tr>
          <tr>
            <td colSpan={6} className="border border-[#dee2e6] p-[10px] text-[14px]">
              綜合損益總額歸屬於：
            </td>
          </tr>
          <tr>
            <td className="border border-[#dee2e6] p-[10px] text-[14px]">8710</td>
            <td className="border border-[#dee2e6] p-[10px] text-[14px]">母公司業主（綜合損益）</td>
            <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">830,509,542</td>
            <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">38</td>
            <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">1,059,124,890</td>
            <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">47</td>
          </tr>
          <tr>
            <td className="border border-[#dee2e6] p-[10px] text-[14px]">8720</td>
            <td className="border border-[#dee2e6] p-[10px] text-[14px]">非控制權益（綜合損益）</td>
            <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">-1,555,669</td>
            <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">-</td>
            <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">205,790</td>
            <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">-</td>
          </tr>
          <tr className="font-semibold">
            <td className="border border-[#dee2e6] p-[10px] text-[14px]"></td>
            <td className="eps border border-[#dee2e6] p-[10px] text-[14px]">基本每股盈餘</td>
            <td className="eps border border-[#dee2e6] p-[10px] text-[14px]"></td>
            <td className="eps border border-[#dee2e6] p-[10px] text-[14px]"></td>
            <td className="eps border border-[#dee2e6] p-[10px] text-[14px]"></td>
            <td className="eps border border-[#dee2e6] p-[10px] text-[14px]"></td>
          </tr>
          <tr className="font-semibold">
            <td className="eps border border-[#dee2e6] p-[10px] text-[14px]">9750</td>
            <td className="eps border border-[#dee2e6] p-[10px] text-[14px]">基本每股盈餘合計</td>
            <td className="eps border border-[#dee2e6] p-[10px] text-end text-[14px]">32.34</td>
            <td className="eps border border-[#dee2e6] p-[10px] text-[14px]"></td>
            <td className="eps border border-[#dee2e6] p-[10px] text-end text-[14px]">39.2</td>
            <td className="eps border border-[#dee2e6] p-[10px] text-[14px]"></td>
          </tr>
          <tr className="font-semibold">
            <td className="border border-[#dee2e6] p-[10px] text-[14px]"></td>
            <td className="eps border border-[#dee2e6] p-[10px] text-[14px]">稀釋每股盈餘</td>
            <td className="eps border border-[#dee2e6] p-[10px] text-[14px]"></td>
            <td className="eps border border-[#dee2e6] p-[10px] text-[14px]"></td>
            <td className="eps border border-[#dee2e6] p-[10px] text-[14px]"></td>
            <td className="eps border border-[#dee2e6] p-[10px] text-[14px]"></td>
          </tr>
          <tr className="font-semibold">
            <td className="eps border border-[#dee2e6] p-[10px] text-[14px]">9850</td>
            <td className="eps border border-[#dee2e6] p-[10px] text-[14px]">稀釋每股盈餘合計</td>
            <td className="eps border border-[#dee2e6] p-[10px] text-end text-[14px]">32.34</td>
            <td className="eps border border-[#dee2e6] p-[10px] text-[14px]"></td>
            <td className="eps border border-[#dee2e6] p-[10px] text-end text-[14px]">39.2</td>
            <td className="eps border border-[#dee2e6] p-[10px] text-[14px]"></td>
          </tr>
        </tbody>
      </table>
      {/* Info: watermark logo (20240724 - Anna) */}
      <div className="relative right-0 -z-10" style={{ top: '-280px' }}>
        <Image
          className="absolute right-0"
          src="/logo/watermark_logo.svg"
          alt="isunfa logo"
          width={450}
          height={300}
        />
      </div>
    </section>
    <footer className="mt-[40px] flex items-center justify-between border-t-2 border-[#e0e0e0] bg-surface-brand-secondary p-[10px]">
      <p className="m-0 text-[12px] text-white">8</p>
      <div className="text-[16px] font-bold text-surface-brand-secondary">
        <img src="/logo/white_isunfa_logo_light.svg" alt="iSunFA Logo" />
      </div>
    </footer>
  </div>
);
const page9 = (
  <div>
    <header className="flex justify-between text-white">
      <div className="mt-[29px] flex w-[28%]">
        <div className="h-[10px] w-[82.5%] bg-surface-brand-secondary"></div>
        <div className="h-[10px] w-[17.5%] bg-surface-brand-primary"></div>
      </div>
      <div className="flex flex-col">
        <div className="h-1 bg-surface-brand-secondary"></div>
        <div className="mt-1 h-1 bg-surface-brand-primary"></div>
      </div>
      <div className="w-35% text-right">
        <h2 className="relative border-b-[10px] border-b-surface-brand-primary pr-5 pt-6 text-h6 font-bold text-surface-brand-secondary-soft">
          Income Statement
          <span className="absolute bottom-[-20px] right-0 h-[5px] w-[75%] bg-surface-brand-secondary"></span>
        </h2>
      </div>
    </header>
    <section className="relative text-text-neutral-secondary">
      <div className="mb-[16px] mt-[32px] flex justify-between font-semibold text-surface-brand-secondary">
        <p>三、投入費用和成本，與收入的倍數關係</p>
        <p>單位：新台幣仟元</p>
      </div>
      <table className="relative z-10 w-full border-collapse bg-white">
        <thead>
          <tr>
            <th className="border border-[#c1c9d5] bg-[#ffd892] p-[10px] text-left text-[14px] font-semibold">
              代號
            </th>
            <th className="border border-[#c1c9d5] bg-[#ffd892] p-[10px] text-left text-[14px] font-semibold">
              會計項目
            </th>
            <th
              className="border border-[#c1c9d5] bg-[#ffd892] p-[10px] text-end text-[14px] font-semibold"
              style={{ whiteSpace: 'nowrap' }}
            >
              2023-1-1 至 2023-12-31
            </th>
            <th
              className="border border-[#c1c9d5] bg-[#ffd892] p-[10px] text-end text-[14px] font-semibold"
              style={{ whiteSpace: 'nowrap' }}
            >
              2022-1-1 至 2022-12-31
            </th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="border border-[#dee2e6] p-[10px] text-[14px]">4000</td>
            <td className="border border-[#dee2e6] p-[10px] text-[14px]">營業收入合計</td>
            <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">2,161,735,841</td>
            <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">2,263,891,292</td>
          </tr>
          <tr>
            <td className="border border-[#dee2e6] p-[10px] text-[14px]">5000</td>
            <td className="border border-[#dee2e6] p-[10px] text-[14px]">營業成本合計</td>
            <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">986,625,213</td>
            <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">915,536,486</td>
          </tr>
          <tr>
            <td className="border border-[#dee2e6] p-[10px] text-[14px]">6100</td>
            <td className="border border-[#dee2e6] p-[10px] text-[14px]">推銷費用</td>
            <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">10,590,705</td>
            <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">9,920,446</td>
          </tr>
          <tr>
            <td className="border border-[#dee2e6] p-[10px] text-[14px]">6200</td>
            <td className="border border-[#dee2e6] p-[10px] text-[14px]">管理費用</td>
            <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">60,872,841</td>
            <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">53,524,898</td>
          </tr>
          <tr className="font-semibold">
            <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]"></td>
            <td className="border border-[#dee2e6] p-[10px] text-start text-[14px]">
              投入費用和成本合計
            </td>
            <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">1,058,088,759</td>
            <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">978,981,830</td>
          </tr>
        </tbody>
      </table>
      <p className="mt-4">2023年度營業收入，為當年度投入費用和成本的2.04倍</p>
      <p className="mb-10 mt-4">2022年度營業收入，為當年度投入費用和成本的2.31倍</p>
      <div className="mb-4 mt-[32px] flex justify-between font-semibold text-surface-brand-secondary">
        <p>四、收入提撥至研發費用比例</p>
        <p>單位：新台幣仟元</p>
      </div>
      <table className="relative z-10 w-full border-collapse bg-white mb-[75px]">
        <thead>
          <tr>
            <th className="border border-[#c1c9d5] bg-[#ffd892] p-[10px] text-left text-[14px] font-semibold">
              代號
            </th>
            <th className="border border-[#c1c9d5] bg-[#ffd892] p-[10px] text-left text-[14px] font-semibold">
              會計項目
            </th>
            <th
              className="border border-[#c1c9d5] bg-[#ffd892] p-[10px] text-end text-[14px] font-semibold"
              style={{ whiteSpace: 'nowrap' }}
            >
              2023-1-1 至 2023-12-31
            </th>
            <th
              className="border border-[#c1c9d5] bg-[#ffd892] p-[10px] text-end text-[14px] font-semibold"
              style={{ whiteSpace: 'nowrap' }}
            >
              2022-1-1 至 2022-12-31
            </th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="border border-[#dee2e6] p-[10px] text-[14px]">4000</td>
            <td className="border border-[#dee2e6] p-[10px] text-[14px]">營業收入合計</td>
            <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">2,161,735,841</td>
            <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">2,263,891,292</td>
          </tr>
          <tr>
            <td className="border border-[#dee2e6] p-[10px] text-[14px]">6300</td>
            <td className="border border-[#dee2e6] p-[10px] text-[14px]">研究發展費用</td>
            <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">182,370,170</td>
            <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">163,262,283</td>
          </tr>
          <tr className="font-semibold">
            <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]"></td>
            <td className="border border-[#dee2e6] p-[10px] text-start text-[14px]">
              收入提撥至研發費用比例
            </td>
            <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">8.44%</td>
            <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">7.21%</td>
          </tr>
        </tbody>
      </table>
      {/* Info: watermark logo (20240724 - Anna) */}
      <div className="relative right-0 -z-10" style={{ top: '-350px' }}>
        <Image
          className="absolute right-0"
          src="/logo/watermark_logo.svg"
          alt="isunfa logo"
          width={450}
          height={300}
        />
      </div>
    </section>
    <footer className="mt-[40px] flex items-center justify-between border-t-2 border-[#e0e0e0] bg-surface-brand-secondary p-[10px]">
      <p className="m-0 text-[12px] text-white">9</p>
      <div className="text-[16px] font-bold text-surface-brand-secondary">
        <img src="/logo/white_isunfa_logo_light.svg" alt="iSunFA Logo" />
      </div>
    </footer>
  </div>
);

  return (
    <div className="mx-auto w-a4-width">
      {page1}
      {page2}
      {page3}
      {page4}
      {page5}
      {page6}
      {page7}
      {page8}
      {page9}
    </div>
  );
};

export default IncomeStatementReportBodyAll;
