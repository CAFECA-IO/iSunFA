import React from 'react';
// import './reset.css';
// import './balance_sheet_display.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
// import Image from 'next/image';
import Script from 'next/script';

const CashFlowDisplay = () => {
  return (
    <div className="container">
      <header>
        <div>
          <div>
            <h1>
              2330 <br />
              台灣積體電路製造股份有限公司
            </h1>
            <p>
              2023年第四季 <br />
              合併財務報告 - 現金流量表
            </p>
          </div>
        </div>
        <div>
          <h2>Cash Flow Statement</h2>
        </div>
      </header>
      <section>
        <div>
          <p>一、項目彙總格式</p>
          <p>單位：新台幣仟元</p>
        </div>
        <table>
          <thead>
            <tr>
              <th>代號</th>
              <th>會計項目</th>
              <th className="text-end">2023-1-1 至 2023-12-31</th>
              <th className="text-end">2022-1-1 至 2022-12-31</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colSpan={4}>營業活動之現金流量 - 直接法</td>
            </tr>
            <tr>
              <td>A00010</td>
              <td>繼續營業單位稅前淨利（淨損）</td>
              <td className="text-end">979,171,324</td>
              <td className="text-end">1,144,190,718</td>
            </tr>
            <tr>
              <td>A10000</td>
              <td>本期稅前淨利（淨損）</td>
              <td className="text-end">979,171,324</td>
              <td className="text-end">1,144,190,718</td>
            </tr>
            <tr>
              <td colSpan={4}>調整項目</td>
            </tr>
            <tr>
              <td>A20010</td>
              <td>收益費損項目合計</td>
              <td className="text-end">479,523,232</td>
              <td className="text-end">430,461,118</td>
            </tr>
            <tr>
              <td>A30000</td>
              <td>與營業活動相關之資產及負債之淨變動合計</td>
              <td className="text-end">(56,852,144)</td>
              <td className="text-end">(82,502,593)</td>
            </tr>
            <tr>
              <td>A20000</td>
              <td>調整項目合計</td>
              <td className="text-end">422,671,088</td>
              <td className="text-end">522,961,716</td>
            </tr>
            <tr>
              <td>A33000</td>
              <td>營運產生之現金流入（流出）</td>
              <td className="text-end">1,401,842,412</td>
              <td className="text-end">1,667,152,434</td>
            </tr>
            <tr>
              <td>A33500</td>
              <td>退還（支付）之所得稅</td>
              <td className="text-end">(159,875,065)</td>
              <td className="text-end">(160,964,247)</td>
            </tr>
            <tr>
              <td>AAAA</td>
              <td>營業活動之淨現金流入（流出）</td>
              <td className="text-end">1,241,967,347</td>
              <td className="text-end">1,506,188,188</td>
            </tr>
          </tbody>
        </table>
      </section>
      <footer className="footer">
        <p>1</p>
      </footer>
      <div>
        <button id="prevPage" type="button">
          <i></i>
        </button>
        <button id="nextPage" type="button">
          <i></i>
        </button>
      </div>
      <Script src="/pagination.js" strategy="lazyOnload" />
    </div>
  );
};

export default CashFlowDisplay;
