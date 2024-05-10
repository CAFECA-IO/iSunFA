export enum ToastType {
  SUCCESS = 'success',
  ERROR = 'error',
  WARNING = 'warning',
  INFO = 'info',
}

export enum ToastPosition {
  TOP_CENTER = 'top-center',
  TOP_RIGHT = 'top-right',
  TOP_LEFT = 'top-left',
  BOTTOM_CENTER = 'bottom-center',
  BOTTOM_RIGHT = 'bottom-right',
  BOTTOM_LEFT = 'bottom-left',
}

export interface IToastify {
  type: ToastType;
  content: JSX.Element | string;
  position?: ToastPosition;
  autoClose?: false | number;
  closeOnClick?: boolean;
  draggable?: boolean;
}
