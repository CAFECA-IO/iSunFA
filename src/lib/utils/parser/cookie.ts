/* Info: (20250111 - Luphia) parse cookie string to JSON object
 * cookie sample: _ga=GA1.1.634426978.1736154571; next-auth.csrf-token=dae0824507039fce3ecd0673efa2a879f3c5b079411e84a0a429c0385db94851%7C9435488670c34b14d64856775494482e12724dd5d64c089bb0707e0e6470efc3; next-auth.callback-url=http%3A%2F%2F127.0.0.1%3A3000%2Fusers%2Flogin; next-auth.session-token=eyJhbGciOiJkaXIiLCJlbmMiOiJBMjU2R0NNIn0..Abdyi3ukQI0WXxsJ.yMBzWg82hzF1FgUjLlPJXyJmKY-vAeyIYLbJv4ggEwv8P9uRkUxctohEh-F5P-DGnZ1qU4tLUYEwmX7uIA0M-5EpakdGr1g1ApyyLdZMPbPv2Ym1hUOlSVQDXOy4ZHJnRJoptg1Vcqbh1sTFwIJtKdrfOSlAghF8hJ0DcLFWFmcjQHjCGTDjMZENv1F7kQp7_cmDIYXKVDUiG0vDLOBy18vK6xd2s8HDBPHnCc8d0TqOMVn3EXSV0sEZNflOlIZ_9cYRoZTREcZrTW4zpoVcWy-adnBFOCm-BNNnPkQWTJisXT_sNPmozUXik2KFuDedTGjXfstAN-L1hbphmGsBLn86sZpl_hEFMCRHwf8JPDxHN8dU.anfXgQBENgF4b0YvTZUKlw; _ga_ZNVVW7JP0N=GS1.1.1736587190.15.1.1736588372.0.0.0
 */
export const parseCookie = (cookie: string | object | undefined) => {
  let result = {};
  if (typeof cookie === 'string') {
    const data = cookie.split(';');
    data.forEach((item) => {
      const [key, value] = item.split('=');
      result = { ...result, [key.trim()]: value.trim() };
    });
  } else if (typeof cookie === 'object') {
    result = { ...cookie };
  }
  return result;
};
