import { DecimalOperations } from '@/lib/utils/decimal_operations';

describe('DecimalOperations', () => {
  describe('Basic Arithmetic Operations', () => {
    describe('add', () => {
      it('should correctly add positive numbers', () => {
        expect(DecimalOperations.add('1.23', '2.34')).toBe('3.57');
        expect(DecimalOperations.add(1, 2)).toBe('3');
        expect(DecimalOperations.add('0.1', '0.2')).toBe('0.3'); // Critical precision test
      });

      it('should handle negative numbers', () => {
        expect(DecimalOperations.add('-1.5', '2.5')).toBe('1');
        expect(DecimalOperations.add('-1', '-2')).toBe('-3');
        expect(DecimalOperations.add('5', '-3')).toBe('2');
      });

      it('should handle zero', () => {
        expect(DecimalOperations.add('0', '5')).toBe('5');
        expect(DecimalOperations.add('5', '0')).toBe('5');
        expect(DecimalOperations.add('0', '0')).toBe('0');
      });

      it('should handle very large numbers', () => {
        expect(DecimalOperations.add('999999999999.99', '0.01')).toBe('1000000000000');
      });

      it('should handle high precision decimals', () => {
        expect(DecimalOperations.add('0.12345678', '0.87654322')).toBe('1');
        expect(DecimalOperations.add('1.123456789', '2.876543211')).toBe('4');
      });
    });

    describe('subtract', () => {
      it('should correctly subtract numbers', () => {
        expect(DecimalOperations.subtract('5.5', '2.3')).toBe('3.2');
        expect(DecimalOperations.subtract('10', '3')).toBe('7');
      });

      it('should handle negative results', () => {
        expect(DecimalOperations.subtract('3', '5')).toBe('-2');
        expect(DecimalOperations.subtract('-3', '-1')).toBe('-2');
      });

      it('should handle zero', () => {
        expect(DecimalOperations.subtract('5', '0')).toBe('5');
        expect(DecimalOperations.subtract('5', '5')).toBe('0');
      });
    });

    describe('multiply', () => {
      it('should correctly multiply numbers', () => {
        expect(DecimalOperations.multiply('2.5', '4')).toBe('10');
        expect(DecimalOperations.multiply('1.23', '2.34')).toBe('2.8782');
      });

      it('should handle negative numbers', () => {
        expect(DecimalOperations.multiply('-2', '3')).toBe('-6');
        expect(DecimalOperations.multiply('-2', '-3')).toBe('6');
      });

      it('should handle zero', () => {
        expect(DecimalOperations.multiply('5', '0')).toBe('0');
        expect(DecimalOperations.multiply('0', '100')).toBe('0');
      });

      it('should handle decimal precision', () => {
        expect(DecimalOperations.multiply('0.1', '0.1')).toBe('0.01');
        expect(DecimalOperations.multiply('0.333333', '3')).toBe('0.999999');
      });
    });

    describe('divide', () => {
      it('should correctly divide numbers', () => {
        expect(DecimalOperations.divide('10', '2')).toBe('5');
        expect(DecimalOperations.divide('7', '2')).toBe('3.5');
      });

      it('should handle decimal division', () => {
        expect(DecimalOperations.divide('1', '3')).toBe('0.33333333333333333333');
        expect(DecimalOperations.divide('10', '3')).toBe('3.3333333333333333333');
      });

      it('should throw error for division by zero', () => {
        expect(() => DecimalOperations.divide('5', '0')).toThrow('Division by zero is not allowed');
        expect(() => DecimalOperations.divide('0', '0')).toThrow('Division by zero is not allowed');
      });

      it('should handle negative numbers', () => {
        expect(DecimalOperations.divide('-10', '2')).toBe('-5');
        expect(DecimalOperations.divide('10', '-2')).toBe('-5');
        expect(DecimalOperations.divide('-10', '-2')).toBe('5');
      });
    });

    describe('abs', () => {
      it('should return absolute value', () => {
        expect(DecimalOperations.abs('5')).toBe('5');
        expect(DecimalOperations.abs('-5')).toBe('5');
        expect(DecimalOperations.abs('0')).toBe('0');
        expect(DecimalOperations.abs('-0.123')).toBe('0.123');
      });
    });

    describe('negate', () => {
      it('should negate values correctly', () => {
        expect(DecimalOperations.negate('5')).toBe('-5');
        expect(DecimalOperations.negate('-5')).toBe('5');
        expect(DecimalOperations.negate('0')).toBe('0');
      });
    });
  });

  describe('Comparison Operations', () => {
    describe('isEqual', () => {
      it('should correctly compare equal values', () => {
        expect(DecimalOperations.isEqual('5', '5')).toBe(true);
        expect(DecimalOperations.isEqual('5.0', '5')).toBe(true);
        expect(DecimalOperations.isEqual('0.1', '0.10')).toBe(true);
      });

      it('should correctly compare unequal values', () => {
        expect(DecimalOperations.isEqual('5', '6')).toBe(false);
        expect(DecimalOperations.isEqual('5.1', '5.2')).toBe(false);
      });

      it('should handle precision comparison correctly', () => {
        const result = DecimalOperations.add('0.1', '0.2');
        expect(DecimalOperations.isEqual(result, '0.3')).toBe(true);
      });
    });

    describe('isGreaterThan', () => {
      it('should correctly compare values', () => {
        expect(DecimalOperations.isGreaterThan('5', '3')).toBe(true);
        expect(DecimalOperations.isGreaterThan('3', '5')).toBe(false);
        expect(DecimalOperations.isGreaterThan('5', '5')).toBe(false);
      });
    });

    describe('isLessThan', () => {
      it('should correctly compare values', () => {
        expect(DecimalOperations.isLessThan('3', '5')).toBe(true);
        expect(DecimalOperations.isLessThan('5', '3')).toBe(false);
        expect(DecimalOperations.isLessThan('5', '5')).toBe(false);
      });
    });

    describe('isZero', () => {
      it('should identify zero correctly', () => {
        expect(DecimalOperations.isZero('0')).toBe(true);
        expect(DecimalOperations.isZero('0.0')).toBe(true);
        expect(DecimalOperations.isZero('0.00000')).toBe(true);
        expect(DecimalOperations.isZero('1')).toBe(false);
        expect(DecimalOperations.isZero('-1')).toBe(false);
      });
    });

    describe('isPositive', () => {
      it('should identify positive numbers', () => {
        expect(DecimalOperations.isPositive('1')).toBe(true);
        expect(DecimalOperations.isPositive('0.1')).toBe(true);
        expect(DecimalOperations.isPositive('0')).toBe(false);
        expect(DecimalOperations.isPositive('-1')).toBe(false);
      });
    });

    describe('isNegative', () => {
      it('should identify negative numbers', () => {
        expect(DecimalOperations.isNegative('-1')).toBe(true);
        expect(DecimalOperations.isNegative('-0.1')).toBe(true);
        expect(DecimalOperations.isNegative('0')).toBe(false);
        expect(DecimalOperations.isNegative('1')).toBe(false);
      });
    });
  });

  describe('Array Operations', () => {
    describe('sum', () => {
      it('should sum array of values correctly', () => {
        expect(DecimalOperations.sum(['1', '2', '3'])).toBe('6');
        expect(DecimalOperations.sum(['0.1', '0.2', '0.3'])).toBe('0.6');
        expect(DecimalOperations.sum(['5', '-2', '3'])).toBe('6');
      });

      it('should return zero for empty array', () => {
        expect(DecimalOperations.sum([])).toBe('0');
      });

      it('should handle single element', () => {
        expect(DecimalOperations.sum(['5'])).toBe('5');
      });

      it('should handle mixed number types', () => {
        expect(DecimalOperations.sum([1, '2', 3.5])).toBe('6.5');
      });
    });

    describe('min', () => {
      it('should find minimum value', () => {
        expect(DecimalOperations.min(['1', '2', '3'])).toBe('1');
        expect(DecimalOperations.min(['5', '-2', '3'])).toBe('-2');
        expect(DecimalOperations.min(['0.1', '0.01', '0.001'])).toBe('0.001');
      });

      it('should throw error for empty array', () => {
        expect(() => DecimalOperations.min([])).toThrow('Cannot find minimum of empty array');
      });

      it('should handle single element', () => {
        expect(DecimalOperations.min(['5'])).toBe('5');
      });
    });

    describe('max', () => {
      it('should find maximum value', () => {
        expect(DecimalOperations.max(['1', '2', '3'])).toBe('3');
        expect(DecimalOperations.max(['5', '-2', '3'])).toBe('5');
        expect(DecimalOperations.max(['0.1', '0.01', '0.001'])).toBe('0.1');
      });

      it('should throw error for empty array', () => {
        expect(() => DecimalOperations.max([])).toThrow('Cannot find maximum of empty array');
      });
    });

    describe('average', () => {
      it('should calculate average correctly', () => {
        expect(DecimalOperations.average(['1', '2', '3'])).toBe('2');
        expect(DecimalOperations.average(['0', '5', '10'])).toBe('5');
        expect(DecimalOperations.average(['0.1', '0.2', '0.3'])).toBe('0.2');
      });

      it('should throw error for empty array', () => {
        expect(() => DecimalOperations.average([])).toThrow(
          'Cannot calculate average of empty array'
        );
      });
    });
  });

  describe('Utility Methods', () => {
    describe('round', () => {
      it('should round to specified decimal places', () => {
        expect(DecimalOperations.round('1.234567', 2)).toBe('1.23');
        expect(DecimalOperations.round('1.235', 2)).toBe('1.24'); // Round half up
        expect(DecimalOperations.round('1.999', 1)).toBe('2.0');
      });

      it('should use default 2 decimal places', () => {
        expect(DecimalOperations.round('1.234567')).toBe('1.23');
      });
    });

    describe('format', () => {
      it('should format with thousand separators', () => {
        expect(DecimalOperations.format('1000')).toBe('1,000');
        expect(DecimalOperations.format('1000000.50')).toBe('1,000,000.5');
        expect(DecimalOperations.format('123456789.123')).toBe('123,456,789.123');
      });

      it('should format with specified decimal places', () => {
        expect(DecimalOperations.format('1000.123456', 2)).toBe('1,000.12');
        expect(DecimalOperations.format('1000', 2)).toBe('1,000.00');
      });
    });

    describe('isValidDecimal', () => {
      it('should validate valid decimal strings', () => {
        expect(DecimalOperations.isValidDecimal('123')).toBe(true);
        expect(DecimalOperations.isValidDecimal('123.45')).toBe(true);
        expect(DecimalOperations.isValidDecimal('-123.45')).toBe(true);
        expect(DecimalOperations.isValidDecimal('0')).toBe(true);
        expect(DecimalOperations.isValidDecimal('0.0')).toBe(true);
      });

      it('should reject invalid decimal strings', () => {
        expect(DecimalOperations.isValidDecimal('abc')).toBe(false);
        expect(DecimalOperations.isValidDecimal('12.34.56')).toBe(false);
        expect(DecimalOperations.isValidDecimal('')).toBe(false);
        expect(DecimalOperations.isValidDecimal('12a')).toBe(false);
      });
    });

    describe('toExactString', () => {
      it('should convert to exact string without trailing zeros', () => {
        expect(DecimalOperations.toExactString('5.000')).toBe('5');
        expect(DecimalOperations.toExactString('5.10')).toBe('5.1');
        expect(DecimalOperations.toExactString('0.0')).toBe('0');
      });
    });

    describe('isBalanced - Accounting Balance Check', () => {
      it('should validate balanced debits and credits', () => {
        const debits = ['100', '200', '300'];
        const credits = ['150', '450'];
        expect(DecimalOperations.isBalanced(debits, credits)).toBe(true);
      });

      it('should detect unbalanced debits and credits', () => {
        const debits = ['100', '200'];
        const credits = ['150', '200'];
        expect(DecimalOperations.isBalanced(debits, credits)).toBe(false);
      });

      it('should handle empty arrays', () => {
        expect(DecimalOperations.isBalanced([], [])).toBe(true);
      });

      it('should handle precision in balance validation', () => {
        const debits = ['0.1', '0.2'];
        const credits = ['0.3'];
        expect(DecimalOperations.isBalanced(debits, credits)).toBe(true);
      });
    });
  });

  describe('Edge Cases and Boundary Values', () => {
    it('should handle very small numbers', () => {
      expect(DecimalOperations.add('0.0000000001', '0.0000000001')).toBe('0.0000000002');
      expect(DecimalOperations.isEqual('0.00000000000000000001', '1e-20')).toBe(true);
    });

    it('should handle very large numbers', () => {
      expect(DecimalOperations.multiply('999999999999999999', '2')).toBe('1999999999999999998');
    });

    it('should maintain precision across multiple operations', () => {
      let result = '0';
      for (let i = 0; i < 10; i += 1) {
        result = DecimalOperations.add(result, '0.1');
      }
      expect(DecimalOperations.isEqual(result, '1')).toBe(true);
    });

    it('should handle string numbers with leading/trailing whitespace', () => {
      expect(DecimalOperations.add(' 1.5 ', ' 2.5 ')).toBe('4');
    });

    it('should handle scientific notation', () => {
      expect(DecimalOperations.add('1e2', '1e1')).toBe('110');
      expect(DecimalOperations.multiply('1e-2', '1e2')).toBe('1');
    });
  });

  describe('Critical Precision Tests', () => {
    it('should pass the 0.1 + 0.2 = 0.3 test', () => {
      const result = DecimalOperations.add('0.1', '0.2');
      expect(result).toBe('0.3');
      expect(DecimalOperations.isEqual(result, '0.3')).toBe(true);
    });

    it('should maintain 8-digit decimal precision without loss', () => {
      const a = '123.12345678';
      const b = '456.87654322';
      const result = DecimalOperations.add(a, b);
      expect(result).toBe('580');

      const precise = DecimalOperations.add('0.12345678', '0.87654321');
      expect(precise).toBe('0.99999999');
    });

    it('should handle cumulative operations without error accumulation', () => {
      let total = '0';
      const values = ['0.1', '0.1', '0.1', '0.1', '0.1', '0.1', '0.1', '0.1', '0.1', '0.1'];

      // eslint-disable-next-line no-restricted-syntax
      for (const value of values) {
        total = DecimalOperations.add(total, value);
      }

      expect(DecimalOperations.isEqual(total, '1')).toBe(true);
    });
  });
});
