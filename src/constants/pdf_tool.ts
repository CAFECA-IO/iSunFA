export enum PdfToolViewMode {
  EDIT = "edit",
  PREVIEW = "preview",
}

// Info: (20260615 - Julian) 定義 pdf 輸出樣式
export const PDF_PRINT_STYLE = `
  #pdf-content * {
      box-sizing: border-box !important;
  }

  /* ------------------------------------- */
  /* 1. h2 修正：拔掉 Flexbox，直接硬推橘色方塊 */
  /* ------------------------------------- */
  #pdf-content h2 {
      display: block !important; /* 關閉容易算錯的 Flexbox */
      line-height: 1.5 !important;
  }

  #pdf-content h2 span {
      display: inline-block !important;
      position: relative !important;
      /* 橘線目前太高，用 top 正值把它往下推 */
      top: 12px !important;
      margin-right: 8px !important;
  }

  /* ----------------------------------- */
  /* 2. 「系統報告」標籤修正：不對稱內邊距     */
  /* ----------------------------------- */
  #pdf-content .mb-6 .inline-block {
      display: inline-block !important;
      /* 文字看起來掉下去，所以把上方 padding 歸零，下方加厚，讓視覺上文字往上抬 */
      padding-top: 0px !important;
      padding-bottom: 12px !important;
      line-height: 1 !important;
  }

  /* -------------------------------------- */
  /* 3. 修正 li 點點位置                     */
  /* -------------------------------------- */
  #pdf-content ul {
      list-style: none !important;
      padding-left: 0 !important;
  }
  /* 隱藏原本的點點，另外新增一個匯出 pdf 專用的點點 */
  #pdf-content li {
      position: relative !important;
      padding-left: 18px !important;
      display: block !important;
      line-height: 1.5 !important;
  }
  #pdf-content li::before {
      content: "•" !important;
      position: absolute !important;
      left: 0 !important;
      top: 0 !important;
      color: #1e293b !important;
      font-family: inherit !important;
      font-size: 1.2em !important;
  }

  /* -------------------------------------- */
  /* 4. 修正表格截斷與分頁問題                */
  /* -------------------------------------- */
  /* 讓表格寬度固定，並允許內容自動換行 */
  #pdf-content .overflow-x-auto {
      overflow-x: visible !important;
      page-break-inside: avoid !important;
      break-inside: avoid !important;
  }
  #pdf-content table {
      width: 100% !important;
      table-layout: fixed !important;
      word-wrap: break-word !important;
      page-break-inside: avoid !important;
      break-inside: avoid !important;
  }
  #pdf-content th, #pdf-content td {
      white-space: normal !important; /* 覆蓋原本的 whitespace-nowrap */
      overflow-wrap: break-word !important;
      word-wrap: break-word !important;
  }

  /* 用於讓標題與表格保持在同一頁的輔助 class */
  .pdf-avoid-break-after {
      page-break-after: avoid !important;
      break-after: avoid !important;
      margin-bottom: 0 !important;
  }

  /* 隱藏 mermaid 的輔助元件 */
  .mermaid-control-btn, .mermaid-control-hint {
      display:none!important;
  }

  /* 確保匯出 PDF 時，Mermaid 圖表自動回正、清除縮放平移並完全展開 */
  #pdf-content .mermaid-interactive-viewport {
      border: none !important;
      background: transparent !important;
      height: auto !important;
      overflow: visible !important;
      border-radius: 0 !important;
      box-shadow: none !important;
  }
  #pdf-content .mermaid-container {
      transform: none !important;
      transition: none !important;
      width: 100% !important;
      height: auto !important;
      display: block !important;
  }
  #pdf-content .mermaid-container svg {
      max-height: none !important;
      max-width: 100% !important;
      height: auto !important;
      width: 100% !important;
      overflow: visible !important;
  }
`;
