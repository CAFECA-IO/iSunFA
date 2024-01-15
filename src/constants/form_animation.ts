export type IFormAnimation = 'loading' | 'success' | 'error';

export type IFormAnimationConstant = {
  LOADING: IFormAnimation;
  SUCCESS: IFormAnimation;
  ERROR: IFormAnimation;
};

export const FormAnimation: IFormAnimationConstant = {
  LOADING: 'loading',
  SUCCESS: 'success',
  ERROR: 'error',
};
