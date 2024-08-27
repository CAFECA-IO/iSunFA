import crypto from 'crypto';
/* Info: (20240826 - Murky)
 * This file implement Shamir's Secret Sharing algorithm.
 * Original source code:
 * This code is copied and modified from [amper5and/secrets.js]
 * Source: https://github.com/amper5and/secrets.js/blob/master/secrets.js#L229
 * Original license: MIT License
 */

export default class SSSSecret {
  private bits: number = 8; // Info: (20240826 - Murky) default number of bits

  private radix: number = 16; // Info: (20240826 - Murky) work with HEX by default

  private minBits: number = 3;

  private maxBits: number = 20; // Info: (20240826 - Murky) this permits 1,048,575 shares, though going this high is NOT recommended in JS!

  private bytesPerChar: number = 2;

  private maxBytesPerChar: number = 6; // Info: (20240826 - Murky) Math.pow(256,7) > Math.pow(2,53)

  /* Info: (20240826 - Murky)
   * Primitive polynomials (in decimal form) for Galois Fields GF(2^n), for 2 <= n <= 30
   * The index of each term in the array corresponds to the n for that polynomial
   * i.e. to get the polynomial for n=16, use primitivePolynomials[16]
   */
  private primitivePolynomials: (number | null)[] = [
    null,
    null,
    1,
    3,
    3,
    5,
    3,
    3,
    29,
    17,
    9,
    5,
    83,
    27,
    43,
    3,
    45,
    9,
    39,
    39,
    9,
    5,
    3,
    33,
    27,
    9,
    71,
    39,
    9,
    5,
    83,
  ];

  private size: number;

  private max: number;

  private exp: number[] = [];

  private log: number[] = [];

  constructor(bits?: number) {
    if (
      bits &&
      (typeof bits !== 'number' || bits % 1 !== 0 || bits < this.minBits || bits > this.maxBits)
    ) {
      throw new Error(
        `Number of bits must be an integer between ${this.minBits} and ${this.maxBits}, inclusive.`
      );
    }
    this.bits = bits || this.bits;
    this.size = 2 ** this.bits;
    this.max = this.size - 1;
    this.constructExpAndLogArray();
  }

  private static getRNG(bits: number) {
    const bytes = Math.ceil(bits / 8);
    let str: string | null = null;
    while (str === null) {
      const randomBytes = crypto.randomBytes(bytes).toString('hex');
      str = SSSSecret.constructRNG(bytes, randomBytes, 16, 4);
    }
    return str;
  }

  private static constructRNG(bits: number, arr: string, radix: number, size: number) {
    let str = '';
    let i = 0;
    const len = arr.length - 1;

    while (i < len || str.length < bits) {
      str += SSSSecret.padLeft(parseInt(arr[i], radix).toString(2), size);
      i += 1;
    }
    str = str.substring(str.length - bits);
    if ((str.match(/0/g) || []).length === str.length) {
      // all zeros?
      return null;
    }
    return str;
  }

  private static padLeft(str: string, bits?: number): string {
    const newBits = bits || 8;
    const missing = str.length % newBits;
    return (missing ? '0'.repeat(newBits - missing) : '') + str;
  }

  public static bin2hex(str: string) {
    let hex = '';
    let num: number;
    const newStr = SSSSecret.padLeft(str, 4);
    for (let i = newStr.length; i >= 4; i -= 4) {
      num = parseInt(str.slice(i - 4, i), 2);
      if (Number.isNaN(num)) {
        throw new Error('Invalid binary character.');
      }
      hex = num.toString(16) + hex;
    }
    return hex;
  }

  public static hex2bin(str: string) {
    let bin = '';
    let num;
    for (let i = str.length - 1; i >= 0; i -= 1) {
      num = parseInt(str[i], 16);
      if (Number.isNaN(num)) {
        throw new Error('Invalid hex character.');
      }
      bin = SSSSecret.padLeft(num.toString(2), 4) + bin;
    }
    return bin;
  }

  public static random(bits: number) {
    const rng = SSSSecret.getRNG(bits);
    const hex = SSSSecret.bin2hex(rng);
    return hex;
  }

  private static inArray(arr: number[], val: number) {
    for (let i = 0, len = arr.length; i < len; i += 1) {
      if (arr[i] === val) {
        return true;
      }
    }
    return false;
  }

  private static base64UrlToBase64(base64Url: string) {
    return (
      base64Url.replace(/-/g, '+').replace(/_/g, '/') +
      '=='.slice(0, (4 - (base64Url.length % 4)) % 4)
    );
  }

  private static base64ToBase64Url(base64: string) {
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }

  public static base64ToHex(baseString: string) {
    const base64 = SSSSecret.base64UrlToBase64(baseString);
    return Buffer.from(base64, 'base64').toString('hex');
  }

  public static hexToBase64Url(hexString: string) {
    const base64 = Buffer.from(hexString, 'hex').toString('base64');
    return SSSSecret.base64ToBase64Url(base64);
  }

  /* Info: (20240826 - Murky)
   * 查找Galois Fields值，並算出多項式的每一個次方式否存在 例如 this.primitivePolynomials[3] => 看成 2^ 3 = 0b1000 = 8, 也就是 x^3 + 1
   */
  private constructExpAndLogArray() {
    if (this.bits >= this.primitivePolynomials.length) {
      throw new Error('bits too large');
    }

    if (this.bits < 2) {
      throw new Error('bits too small');
    }

    let x = 1;
    const primitive = this.primitivePolynomials[this.bits];

    for (let i = 0; i < this.size; i += 1) {
      this.exp[i] = x;
      this.log[x] = i;

      // Info: (20240826 - Murky) 必須使用bitwise操作
      // eslint-disable-next-line no-bitwise
      x <<= 1;

      if (x >= this.size) {
        // Info: (20240826 - Murky)  檢查 x 是否超出了Galois Fields的最大值
        // Info: (20240826 - Murky) 必須使用bitwise操作
        // eslint-disable-next-line no-bitwise
        x ^= primitive!; // Info: (20240826 - Murky) 如果超出了最大值，使用原始多项式 primitive 進行xor操作，這相當於多項式除法中的取餘，確保結果仍然在Galois Fields。

        // Info: (20240826 - Murky) 必須使用bitwise操作
        // eslint-disable-next-line no-bitwise
        x &= this.max;
      }
    }
  }

  private horner(x: number, coefficients: number[]) {
    const logX = this.log[x];
    let fX = 0;
    for (let i = coefficients.length - 1; i >= 0; i -= 1) {
      if (fX === 0) {
        fX = coefficients[i];
        // Info: (20240826 - Murky) continue is needed here
        // eslint-disable-next-line no-continue
        continue;
      }

      // Info: (20240826 - Murky) 必須使用bitwise操作
      // eslint-disable-next-line no-bitwise
      fX = this.exp[(logX + this.log[fX]) % this.max] ^ coefficients[i];
    }

    return fX;
  }

  private getShares(
    secret: number, // Info: (20240827 - Murky) Error in here, secret might be undefined
    numShares: number,
    threshold: number
  ): { x: number; y: number }[] {
    const shares: { x: number; y: number }[] = [];
    const coefficients: number[] = [secret];

    // 生成多项式的系数
    for (let i = 1; i < threshold; i += 1) {
      const rng = SSSSecret.getRNG(this.bits);
      coefficients[i] = parseInt(rng, 2);
    }

    // 计算每个share的x和y值
    for (let i = 1, len = numShares + 1; i < len; i += 1) {
      shares[i - 1] = {
        x: i,
        y: this.horner(i, coefficients),
      };
    }
    return shares;
  }

  /* Info: (20240826 - Murky)
   * Splits a number string `bits`-length segments, after first
   * optionally zero-padding it to a length that is a multiple of `padLength.
   * Returns array of integers (each less than 2^bits-1), with each element
   * representing a `bits`-length segment of the input string from right to left,
   * i.e. parts[0] represents the right-most `bits`-length segment of the input string.
   */
  private split(str: string, padLength?: number) {
    let newStr = str;
    if (padLength) {
      newStr = SSSSecret.padLeft(str, padLength);
    }
    const parts = [];

    let i = newStr.length;
    while (i > this.bits) {
      parts.push(parseInt(newStr.slice(i - this.bits, i), 2));
      i -= this.bits;
    }
    parts.push(parseInt(newStr.slice(0, i), 2));
    return parts;
  }

  /* Info: (20240826 - Murky)
   * Evaluates the Lagrange interpolation polynomial at x = `at`
   * using x and y Arrays that are of the same length, with
   * corresponding elements constituting points on the polynomial.
   */
  private lagrange(at: number, x: number[], y: number[]) {
    let sum = 0;
    let product;

    for (let i = 0, len = x.length; i < len; i += 1) {
      if (!y[i]) {
        // Info: (20240826 - Murky) I need to use continue here
        // eslint-disable-next-line no-continue
        continue;
      }

      product = this.log[y[i]];
      for (let j = 0; j < len; j += 1) {
        if (i === j) {
          // Info: (20240826 - Murky) I need to use continue here
          // eslint-disable-next-line no-continue
          continue;
        }
        if (at === x[j]) {
          // Info: (20240826 - Murky) happens when computing a share that is in the list of shares used to compute it
          product = -1; // Info: (20240826 - Murky) fix for a zero product term, after which the sum should be sum^0 = sum, not sum^1
          break;
        }

        product =
          // Info: (20240826 - Murky) 必須使用bitwise操作
          // eslint-disable-next-line no-bitwise
          (product + this.log[at ^ x[j]] - this.log[x[i] ^ x[j]] + this.max) % this.max; // Info: (20240826 - Murky) to make sure it's not negative */) % config.max;
      }

      // Info: (20240826 - Murky) 必須使用bitwise操作
      // eslint-disable-next-line no-bitwise
      sum = product === -1 ? sum : sum ^ this.exp[product]; // Info: (20240826 - Murky) though exps[-1]= undefined and undefined ^ anything = anything in chrome, this behavior may not hold everywhere, so do the check
    }
    return sum;
  }

  private processShare(share: string) {
    const bits = parseInt(share[0], 36);
    if (
      bits &&
      (typeof bits !== 'number' || bits % 1 !== 0 || bits < this.minBits || bits > this.maxBits)
    ) {
      throw new Error(
        `Number of bits must be an integer between ${this.minBits} and ${this.maxBits}, inclusive.`
      );
    }

    const max = 2 ** bits - 1;
    const idLength = max.toString(this.radix).length + 1;

    const id = parseInt(share.substring(1, idLength), this.radix);
    if (typeof id !== 'number' || id % 1 !== 0 || id < 1 || id > max) {
      throw new Error(`Share id must be an integer between 1 and ${this.max}, inclusive.`);
    }
    const newShare = share.substring(idLength + 1);
    if (!newShare.length) {
      throw new Error('Invalid share: zero-length share.');
    }
    return {
      bits,
      id,
      value: newShare,
    };
  }

  public share(
    secret: string,
    numShares: number,
    threshold: number,
    padLength: number = 0,
    withoutPrefix: boolean = false
  ) {
    if (numShares % 1 !== 0 || numShares < 2) {
      throw new Error(
        `Number of shares must be an integer between 2 and 2^bits-1 (${this.max}), inclusive.`
      );
    }

    if (numShares > this.max) {
      const neededBits = Math.ceil(Math.log(numShares + 1) / Math.LN2);
      throw new Error(
        `Number of shares must be an integer between 2 and 2^bits-1 (${
          this.max
        }), inclusive. To create ${numShares} shares, use at least ${neededBits} bits.`
      );
    }

    if (threshold % 1 !== 0 || threshold < 2) {
      throw new Error(
        `Threshold number of shares must be an integer between 2 and 2^bits-1 (${
          this.max
        }), inclusive.`
      );
    }

    if (threshold > this.max) {
      const neededBits = Math.ceil(Math.log(threshold + 1) / Math.LN2);
      throw new Error(
        `Threshold number of shares must be an integer between 2 and 2^bits-1 (${
          this.max
        }), inclusive.  To use a threshold of ${threshold}, use at least ${neededBits} bits.`
      );
    }
    if (padLength % 1 !== 0) {
      throw new Error('Zero-pad length must be an integer greater than 1.');
    }

    // Info: (20240827 - Murky) Secret 的長度必須是8的倍數, 不足的地方要用padding 補足
    let adjustPadLength = padLength;
    if (padLength === 0 && secret.length % 8 !== 0) {
      adjustPadLength = 8 - (secret.length % 8);
    }

    const newSecret = `1${SSSSecret.hex2bin(secret)}`; // append a 1 so that we can preserve the correct number of leading zeros in our secret
    const splitSecret = this.split(newSecret, adjustPadLength);
    const x = new Array(numShares);
    const y = new Array(numShares);
    for (let i = 0, len = splitSecret.length; i < len; i += 1) {
      const subShares = this.getShares(splitSecret[i], numShares, threshold);
      for (let j = 0; j < numShares; j += 1) {
        x[j] = x[j] || subShares[j].x.toString(this.radix);
        y[j] = SSSSecret.padLeft(subShares[j].y.toString(2)) + (y[j] ? y[j] : '');
      }
    }
    const padding = this.max.toString(this.radix).length;
    if (withoutPrefix) {
      for (let i = 0; i < numShares; i += 1) {
        x[i] = SSSSecret.bin2hex(y[i]);
      }
    } else {
      for (let i = 0; i < numShares; i += 1) {
        x[i] =
          this.bits.toString(36).toUpperCase() +
          SSSSecret.padLeft(x[i], padding) +
          SSSSecret.bin2hex(y[i]);
      }
    }

    return x;
  }

  public combine(shares: string[]) {
    const at = 0; // Info: (20240827 - Murky) 0 is a special case, meaning "combine all shares"
    let setBits;
    let share;
    const x: number[] = [];
    const y: number[][] = [];
    let result = '';
    let index: number;

    for (let i = 0, len = shares.length; i < len; i += 1) {
      share = this.processShare(shares[i]);
      if (typeof setBits === 'undefined') {
        setBits = share.bits;
      } else if (share.bits !== setBits) {
        throw new Error('Mismatched shares: Different bit settings.');
      }

      if (SSSSecret.inArray(x, share.id)) {
        // Info: (20240827 - Murky) repeated x value
        // Info: (20240827 - Murky) I need to use continue here
        // eslint-disable-next-line no-continue
        continue;
      }

      index = x.push(share.id) - 1;
      share = this.split(SSSSecret.hex2bin(share.value));
      for (let j = 0, len2 = share.length; j < len2; j += 1) {
        y[j] = y[j] || [];
        y[j][index] = share[j];
      }
    }

    for (let i = 0, len = y.length; i < len; i += 1) {
      result = SSSSecret.padLeft(this.lagrange(at, x, y[i]).toString(2)) + result;
    }

    if (at === 0) {
      // reconstructing the secret
      const idx = result.indexOf('1'); // find the first 1
      return SSSSecret.bin2hex(result.slice(idx + 1));
    } // generating a new share
    return SSSSecret.bin2hex(result);
  }

  public base64Share(
    base64Secret: string,
    numShares: number,
    threshold: number,
    padLength: number = 0,
    withoutPrefix: boolean = false
  ) {
    const secret = SSSSecret.base64ToHex(base64Secret);
    return this.share(secret, numShares, threshold, padLength, withoutPrefix);
  }

  public base64Combine(base64Shares: string[]) {
    const combinedInHex = this.combine(base64Shares);
    return SSSSecret.hexToBase64Url(combinedInHex);
  }

  public getConfig() {
    const config = {
      bits: this.bits,
      radix: this.radix,
      size: this.size,
      max: this.max,
    };

    return config;
  }
}
