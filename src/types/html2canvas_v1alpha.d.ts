// Info: (20250326 - Anna) 為了使用 html2canvas@1.0.0-alpha.12（避免新版文字偏移），定義 alias 'html2canvas_v1alpha' 的 type 宣告
declare module 'html2canvas_v1alpha' {
  import html2canvas from 'html2canvas';

  export default html2canvas;
}
