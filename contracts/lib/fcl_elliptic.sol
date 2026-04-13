//********************************************************************************************/
//  ___           _       ___               _         _    _ _
// | __| _ ___ __| |_    / __|_ _ _  _ _ __| |_ ___  | |  (_) |__
// | _| '_/ -_|_-< ' \  | (__| '_| || | '_ \  _/ _ \ | |__| | '_ \
// |_||_| \___/__/_||_|  \___|_|  \_, | .__/\__\___/ |____|_|_.__/
//                                |__/|_|
///* Copyright (C) 2022 - Renaud Dubois - This file is part of FCL (Fresh CryptoLib) project
///* License: This software is licensed under MIT License
///* This Code may be reused including license and copyright notice.
///* See LICENSE file at the root folder of the project.
///* FILE: FCL_elliptic.sol
///*
///*
///* DESCRIPTION: modified XYZZ system coordinates for EVM elliptic point multiplication
///*  optimization
///*
//**************************************************************************************/
//* WARNING: this code SHALL not be used for non prime order curves for security reasons.
// Code is optimized for a=-3 only curves with prime order, constant like -1, -2 shall be replaced
// if ever used for other curve than sec256R1
// SPDX-License-Identifier: MIT
pragma solidity >=0.8.19 <0.9.0;

library FCL_Elliptic_ZZ {
    // Info: (20260412 - Luphia) Set parameters for curve sec256r1.

    // Info: (20260412 - Luphia) address of the ModExp precompiled contract (Arbitrary-precision exponentiation under modulo)
    address constant MODEXP_PRECOMPILE =
        0x0000000000000000000000000000000000000005;
    // Info: (20260412 - Luphia) curve prime field modulus
    uint256 constant p =
        0xFFFFFFFF00000001000000000000000000000000FFFFFFFFFFFFFFFFFFFFFFFF;
    // Info: (20260412 - Luphia) short weierstrass first coefficient
    uint256 constant a =
        0xFFFFFFFF00000001000000000000000000000000FFFFFFFFFFFFFFFFFFFFFFFC;
    // Info: (20260412 - Luphia) short weierstrass second coefficient
    uint256 constant b =
        0x5AC635D8AA3A93E7B3EBBD55769886BC651D06B0CC53B0F63BCE3C3E27D2604B;
    // Info: (20260412 - Luphia) generating point affine coordinates
    uint256 constant gx =
        0x6B17D1F2E12C4247F8BCE6E563A440F277037D812DEB33A0F4A13945D898C296;
    uint256 constant gy =
        0x4FE342E2FE1A7F9B8EE7EB4A7C0F9E162BCE33576B315ECECBB6406837BF51F5;
    // Info: (20260412 - Luphia) curve order (number of points)
    uint256 constant n =
        0xFFFFFFFF00000000FFFFFFFFFFFFFFFFBCE6FAADA7179E84F3B9CAC2FC632551;
    /* Info: (20260412 - Luphia) -2 mod p constant, used to speed up inversion and doubling (avoid negation)*/
    uint256 constant minus_2 =
        0xFFFFFFFF00000001000000000000000000000000FFFFFFFFFFFFFFFFFFFFFFFD;
    /* Info: (20260412 - Luphia) -2 mod n constant, used to speed up inversion*/
    uint256 constant minus_2modn =
        0xFFFFFFFF00000000FFFFFFFFFFFFFFFFBCE6FAADA7179E84F3B9CAC2FC63254F;

    uint256 constant minus_1 =
        0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF;
    // Info: (20260412 - Luphia) P+1 div 4
    uint256 constant pp1div4 =
        0x3fffffffc0000000400000000000000000000000400000000000000000000000;
    // Info: (20260412 - Luphia) arbitrary constant to express no quadratic residuosity
    uint256 constant _NOTSQUARE =
        0xFFFFFFFF00000002000000000000000000000000FFFFFFFFFFFFFFFFFFFFFFFF;
    // Info: (20260412 - Luphia) arbitrary constant to express no point on curve
    uint256 constant _NOTONCURVE =
        0xFFFFFFFF00000003000000000000000000000000FFFFFFFFFFFFFFFFFFFFFFFF;

    // Info: (20260412 - Luphia) inversion mod n via a^(n-2), use of precompiled using little Fermat theorem
    function FCL_nModInv(uint256 u) internal view returns (uint256 result) {
        assembly {
            let pointer := mload(0x40)
            // Info: (20260412 - Luphia) Define length of base, exponent and modulus. 0x20 == 32 bytes
            mstore(pointer, 0x20)
            mstore(add(pointer, 0x20), 0x20)
            mstore(add(pointer, 0x40), 0x20)
            // Info: (20260412 - Luphia) Define variables base, exponent and modulus
            mstore(add(pointer, 0x60), u)
            mstore(add(pointer, 0x80), minus_2modn)
            mstore(add(pointer, 0xa0), n)

            // Info: (20260412 - Luphia) Call the precompiled contract 0x05 = ModExp
            if iszero(staticcall(not(0), 0x05, pointer, 0xc0, pointer, 0x20)) {
                revert(0, 0)
            }
            result := mload(pointer)
        }
    }
    // Info: (20260412 - Luphia) inversion mod nusing little Fermat theorem via a^(n-2), use of precompiled
    function FCL_pModInv(uint256 u) internal view returns (uint256 result) {
        assembly {
            let pointer := mload(0x40)
            // Info: (20260412 - Luphia) Define length of base, exponent and modulus. 0x20 == 32 bytes
            mstore(pointer, 0x20)
            mstore(add(pointer, 0x20), 0x20)
            mstore(add(pointer, 0x40), 0x20)
            // Info: (20260412 - Luphia) Define variables base, exponent and modulus
            mstore(add(pointer, 0x60), u)
            mstore(add(pointer, 0x80), minus_2)
            mstore(add(pointer, 0xa0), p)

            // Info: (20260412 - Luphia) Call the precompiled contract 0x05 = ModExp
            if iszero(staticcall(not(0), 0x05, pointer, 0xc0, pointer, 0x20)) {
                revert(0, 0)
            }
            result := mload(pointer)
        }
    }

    // Info: (20260412 - Luphia) Coron projective shuffling, take as input alpha as blinding factor
    function ecZZ_Coronize(
        uint256 alpha,
        uint256 x,
        uint256 y,
        uint256 zz,
        uint256 zzz
    )
        internal
        pure
        returns (uint256 x3, uint256 y3, uint256 zz3, uint256 zzz3)
    {
        uint256 alpha2 = mulmod(alpha, alpha, p);

        x3 = mulmod(alpha2, x, p); // Info: (20260412 - Luphia) alpha^-2.x
        y3 = mulmod(mulmod(alpha, alpha2, p), y, p); // Info: (20260412 - Luphia) alpha^-3.y

        zz3 = mulmod(zz, alpha2, p); // Info: (20260412 - Luphia) alpha^2 zz
        zzz3 = mulmod(zzz, mulmod(alpha, alpha2, p), p); // Info: (20260412 - Luphia) alpha^3 zzz

        return (x3, y3, zz3, zzz3);
    }

    function ecZZ_Add(
        uint256 x1,
        uint256 y1,
        uint256 zz1,
        uint256 zzz1,
        uint256 x2,
        uint256 y2,
        uint256 zz2,
        uint256 zzz2
    )
        internal
        pure
        returns (uint256 x3, uint256 y3, uint256 zz3, uint256 zzz3)
    {
        uint256 u1 = mulmod(x1, zz2, p); // Info: (20260412 - Luphia) U1 = X1*ZZ2
        uint256 u2 = mulmod(x2, zz1, p); // Info: (20260412 - Luphia) U2 = X2*ZZ1
        u2 = addmod(u2, p - u1, p); // Info: (20260412 - Luphia) P = U2-U1
        x1 = mulmod(u2, u2, p); // Info: (20260412 - Luphia) PP
        x2 = mulmod(x1, u2, p); // Info: (20260412 - Luphia) PPP

        zz3 = mulmod(x1, mulmod(zz1, zz2, p), p); // Info: (20260412 - Luphia) ZZ3 = ZZ1*ZZ2*PP
        zzz3 = mulmod(zzz1, mulmod(zzz2, x2, p), p); // Info: (20260412 - Luphia) ZZZ3 = ZZZ1*ZZZ2*PPP

        zz1 = mulmod(y1, zzz2, p); // Info: (20260412 - Luphia) S1 = Y1*ZZZ2
        zz2 = mulmod(y2, zzz1, p); // Info: (20260412 - Luphia) S2 = Y2*ZZZ1
        zz2 = addmod(zz2, p - zz1, p); // Info: (20260412 - Luphia) R = S2-S1
        zzz1 = mulmod(u1, x1, p); // Info: (20260412 - Luphia) Q = U1*PP
        x3 = addmod(
            addmod(mulmod(zz2, zz2, p), p - x2, p),
            mulmod(minus_2, zzz1, p),
            p
        ); // Info: (20260412 - Luphia) X3 = R2-PPP-2*Q
        y3 = addmod(
            mulmod(zz2, addmod(zzz1, p - x3, p), p),
            p - mulmod(zz1, x2, p),
            p
        ); // Info: (20260412 - Luphia) R*(Q-X3)-S1*PPP

        return (x3, y3, zz3, zzz3);
    }

    /**
     * Info: (20260412 - Luphia)
     * @notice Calculate one modular square root of a given integer. Assume that p=3 mod 4.
     * @dev Uses the ModExp precompiled contract at address 0x05 for fast computation using little Fermat theorem
     * @param self The integer of which to find the modular inverse
     * @return result The modular inverse of the input integer. If the modular inverse doesn't exist, it revert the tx
     */
    function SqrtMod(uint256 self) internal view returns (uint256 result) {
        assembly ("memory-safe") {
            // Info: (20260412 - Luphia) load the free memory pointer value
            let pointer := mload(0x40)

            // Info: (20260412 - Luphia) Define length of base (Bsize)
            mstore(pointer, 0x20)
            // Info: (20260412 - Luphia) Define the exponent size (Esize)
            mstore(add(pointer, 0x20), 0x20)
            // Info: (20260412 - Luphia) Define the modulus size (Msize)
            mstore(add(pointer, 0x40), 0x20)
            // Info: (20260412 - Luphia) Define variables base (B)
            mstore(add(pointer, 0x60), self)
            // Info: (20260412 - Luphia) Define the exponent (E)
            mstore(add(pointer, 0x80), pp1div4)
            /**
             * Info: (20260412 - Luphia) We save the point of the last argument,
             * it will be override by the result of the precompile call in order to avoid paying for the memory expansion properly
             */
            let _result := add(pointer, 0xa0)
            // Info: (20260412 - Luphia) Define the modulus (M)
            mstore(_result, p)

            // Info: (20260412 - Luphia) Call the precompiled ModExp (0x05) https://www.evm.codes/precompiled#0x05
            if iszero(
                staticcall(
                    not(0), // Info: (20260412 - Luphia) amount of gas to send
                    MODEXP_PRECOMPILE, // Info: (20260412 - Luphia) target
                    pointer, // Info: (20260412 - Luphia) argsOffset
                    0xc0, // Info: (20260412 - Luphia) argsSize (6 * 32 bytes)
                    _result, // Info: (20260412 - Luphia) retOffset (we override M to avoid paying for the memory expansion)
                    0x20 // Info: (20260412 - Luphia) retSize (32 bytes)
                )
            ) {
                revert(0, 0)
            }

            result := mload(_result)
        }
        // Info: (20260412 - Luphia) result :=addmod(result,0,p)
        if (mulmod(result, result, p) != self) {
            result = _NOTSQUARE;
        }

        return result;
    }
    /**
     * Info: (20260412 - Luphia)
     * @dev Convert from affine rep to XYZZ rep
     */
    function ecAff_SetZZ(
        uint256 x0,
        uint256 y0
    ) internal pure returns (uint256[4] memory P) {
        unchecked {
            P[2] = 1; // Info: (20260412 - Luphia) ZZ
            P[3] = 1; // Info: (20260412 - Luphia) ZZZ
            P[0] = x0; // Info: (20260412 - Luphia) X
            P[1] = y0; // Info: (20260412 - Luphia) Y
        }
    }

    function ec_Decompress(
        uint256 x,
        uint256 parity
    ) internal view returns (uint256 y) {
        uint256 y2 = mulmod(x, mulmod(x, x, p), p); // Info: (20260412 - Luphia) x3
        y2 = addmod(b, addmod(y2, mulmod(x, a, p), p), p); // Info: (20260412 - Luphia) x3+ax+b

        y = SqrtMod(y2);
        if (y == _NOTSQUARE) {
            return _NOTONCURVE;
        }
        if ((y & 1) != (parity & 1)) {
            y = p - y;
        }
    }

    /**
     * Info: (20260412 - Luphia)
     * @dev Convert from XYZZ rep to affine rep
     * https://hyperelliptic.org/EFD/g1p/auto-shortw-xyzz-3.html#addition-add-2008-s
     */
    function ecZZ_SetAff(
        uint256 x,
        uint256 y,
        uint256 zz,
        uint256 zzz
    ) internal view returns (uint256 x1, uint256 y1) {
        uint256 zzzInv = FCL_pModInv(zzz); // Info: (20260412 - Luphia) 1/zzz
        y1 = mulmod(y, zzzInv, p); // Info: (20260412 - Luphia) Y/zzz
        uint256 _b = mulmod(zz, zzzInv, p); // Info: (20260412 - Luphia) 1/z
        zzzInv = mulmod(_b, _b, p); // Info: (20260412 - Luphia) 1/zz
        x1 = mulmod(x, zzzInv, p); // Info: (20260412 - Luphia) X/zz
    }

    /**
     * Info: (20260412 - Luphia)
     * @dev Sutherland2008 doubling
     * The "dbl-2008-s-1" doubling formulas
     */
    function ecZZ_Dbl(
        uint256 x,
        uint256 y,
        uint256 zz,
        uint256 zzz
    ) internal pure returns (uint256 P0, uint256 P1, uint256 P2, uint256 P3) {
        unchecked {
            assembly {
                P0 := mulmod(2, y, p) // Info: (20260412 - Luphia) U = 2*Y1
                P2 := mulmod(P0, P0, p) // Info: (20260412 - Luphia) V=U^2
                P3 := mulmod(x, P2, p) // Info: (20260412 - Luphia) S = X1*V
                P1 := mulmod(P0, P2, p) // Info: (20260412 - Luphia) W=UV
                P2 := mulmod(P2, zz, p) // Info: (20260412 - Luphia) zz3=V*ZZ1
                zz := mulmod(
                    3,
                    mulmod(addmod(x, sub(p, zz), p), addmod(x, zz, p), p),
                    p
                ) // Info: (20260412 - Luphia) M=3*(X1-ZZ1)*(X1+ZZ1)
                P0 := addmod(mulmod(zz, zz, p), mulmod(minus_2, P3, p), p) // Info: (20260412 - Luphia) X3=M^2-2S
                x := mulmod(zz, addmod(P3, sub(p, P0), p), p) // Info: (20260412 - Luphia) M(S-X3)
                P3 := mulmod(P1, zzz, p) // Info: (20260412 - Luphia) zzz3=W*zzz1
                P1 := addmod(x, sub(p, mulmod(P1, y, p)), p) // Info: (20260412 - Luphia) Y3= M(S-X3)-W*Y1
            }
        }
        return (P0, P1, P2, P3);
    }

    /**
     * Info: (20260412 - Luphia)
     * @dev Sutherland2008 add a ZZ point with a normalized point and greedy formulae
     * warning: assume that P1(x1,y1)!=P2(x2,y2), true in multiplication loop with prime order (cofactor 1)
     */
    function ecZZ_AddN(
        uint256 x1,
        uint256 y1,
        uint256 zz1,
        uint256 zzz1,
        uint256 x2,
        uint256 y2
    ) internal pure returns (uint256 P0, uint256 P1, uint256 P2, uint256 P3) {
        unchecked {
            if (y1 == 0) {
                return (x2, y2, 1, 1);
            }

            assembly {
                y1 := sub(p, y1)
                y2 := addmod(mulmod(y2, zzz1, p), y1, p)
                x2 := addmod(mulmod(x2, zz1, p), sub(p, x1), p)
                P0 := mulmod(x2, x2, p) // Info: (20260412 - Luphia) PP = P^2
                P1 := mulmod(P0, x2, p) // Info: (20260412 - Luphia) PPP = P*PP
                P2 := mulmod(zz1, P0, p) // Info: (20260412 - Luphia) ZZ3 = ZZ1*PP
                P3 := mulmod(zzz1, P1, p) // Info: (20260412 - Luphia) ZZZ3 = ZZZ1*PPP
                zz1 := mulmod(x1, P0, p) // Info: (20260412 - Luphia) Q = X1*PP
                P0 := addmod(
                    addmod(mulmod(y2, y2, p), sub(p, P1), p),
                    mulmod(minus_2, zz1, p),
                    p
                ) // Info: (20260412 - Luphia) R^2-PPP-2*Q
                P1 := addmod(
                    mulmod(addmod(zz1, sub(p, P0), p), y2, p),
                    mulmod(y1, P1, p),
                    p
                ) // Info: (20260412 - Luphia) R*(Q-X3)
            }
            // Info: (20260412 - Luphia) end assembly
        } // Info: (20260412 - Luphia) end unchecked
        return (P0, P1, P2, P3);
    }

    /**
     * Info: (20260412 - Luphia)
     * @dev Return the zero curve in XYZZ coordinates.
     */
    function ecZZ_SetZero()
        internal
        pure
        returns (uint256 x, uint256 y, uint256 zz, uint256 zzz)
    {
        return (0, 0, 0, 0);
    }
    /**
     * Info: (20260412 - Luphia)
     * @dev Check if point is the neutral of the curve
     */
    function ecZZ_IsZero(
        uint256,
        uint256 y0,
        uint256,
        uint256
    ) internal pure returns (bool) {
        return y0 == 0;
    }
    /**
     * Info: (20260412 - Luphia)
     * @dev Return the zero curve in affine coordinates. Compatible with the double formulae (no special case)
     */
    function ecAff_SetZero() internal pure returns (uint256 x, uint256 y) {
        return (0, 0);
    }

    /**
     * Info: (20260412 - Luphia)
     * @dev Check if the curve is the zero curve in affine rep.
     */
    function ecAff_IsZero(
        uint256,
        uint256 y
    ) internal pure returns (bool flag) {
        return (y == 0);
    }

    /**
     * Info: (20260412 - Luphia)
     * @dev Check if a point in affine coordinates is on the curve (reject Neutral that is indeed on the curve).
     */
    function ecAff_isOnCurve(
        uint256 x,
        uint256 y
    ) internal pure returns (bool) {
        if (x >= p || y >= p || ((x == 0) && (y == 0))) {
            return false;
        }
        unchecked {
            uint256 LHS = mulmod(y, y, p); // Info: (20260412 - Luphia) y^2
            uint256 RHS = addmod(
                mulmod(mulmod(x, x, p), x, p),
                mulmod(x, a, p),
                p
            ); // Info: (20260412 - Luphia) x^3+ax
            RHS = addmod(RHS, b, p); // Info: (20260412 - Luphia) x^3 + a*x + b

            return LHS == RHS;
        }
    }

    /**
     * Info: (20260412 - Luphia)
     * @dev Add two elliptic curve points in affine coordinates. Deal with P=Q
     */
    function ecAff_add(
        uint256 x0,
        uint256 y0,
        uint256 x1,
        uint256 y1
    ) internal view returns (uint256, uint256) {
        uint256 zz0;
        uint256 zzz0;

        if (ecAff_IsZero(x0, y0)) return (x1, y1);
        if (ecAff_IsZero(x1, y1)) return (x0, y0);
        if ((x0 == x1) && (y0 == y1)) {
            (x0, y0, zz0, zzz0) = ecZZ_Dbl(x0, y0, 1, 1);
        } else {
            (x0, y0, zz0, zzz0) = ecZZ_AddN(x0, y0, 1, 1, x1, y1);
        }

        return ecZZ_SetAff(x0, y0, zz0, zzz0);
    }

    /**
     * Info: (20260412 - Luphia)
     * @dev Computation of uG+vQ using Strauss-Shamir's trick, G basepoint, Q public key
     * Returns only x for ECDSA use
     */
    function ecZZ_mulmuladd_S_asm(
        uint256 Q0,
        uint256 Q1, // Info: (20260412 - Luphia) affine rep for input point Q
        uint256 scalar_u,
        uint256 scalar_v
    ) internal view returns (uint256 X) {
        uint256 zz;
        uint256 zzz;
        uint256 Y;
        uint256 index = 255;
        uint256 H0;
        uint256 H1;

        unchecked {
            if (scalar_u == 0 && scalar_v == 0) return 0;

            (H0, H1) = ecAff_add(gx, gy, Q0, Q1);
            if ((H0 == 0) && (H1 == 0)) {
                // Info: (20260412 - Luphia) handling Q=-G
                scalar_u = addmod(scalar_u, n - scalar_v, n);
                scalar_v = 0;
                if (scalar_u == 0 && scalar_v == 0) return 0;
            }
            assembly {
                for {
                    let T4 := add(
                        shl(1, and(shr(index, scalar_v), 1)),
                        and(shr(index, scalar_u), 1)
                    )
                } eq(T4, 0) {
                    index := sub(index, 1)
                    T4 := add(
                        shl(1, and(shr(index, scalar_v), 1)),
                        and(shr(index, scalar_u), 1)
                    )
                } {}
                zz := add(
                    shl(1, and(shr(index, scalar_v), 1)),
                    and(shr(index, scalar_u), 1)
                )

                if eq(zz, 1) {
                    X := gx
                    Y := gy
                }
                if eq(zz, 2) {
                    X := Q0
                    Y := Q1
                }
                if eq(zz, 3) {
                    X := H0
                    Y := H1
                }

                index := sub(index, 1)
                zz := 1
                zzz := 1

                for {} gt(minus_1, index) {
                    index := sub(index, 1)
                } {
                    // Info: (20260412 - Luphia) inlined EcZZ_Dbl
                    let T1 := mulmod(2, Y, p) // Info: (20260412 - Luphia) U = 2*Y1, y free
                    let T2 := mulmod(T1, T1, p) // Info: (20260412 - Luphia) V=U^2
                    let T3 := mulmod(X, T2, p) // Info: (20260412 - Luphia) S = X1*V
                    T1 := mulmod(T1, T2, p) // Info: (20260412 - Luphia) W=UV
                    let T4 := mulmod(
                        3,
                        mulmod(addmod(X, sub(p, zz), p), addmod(X, zz, p), p),
                        p
                    ) // Info: (20260412 - Luphia) M=3*(X1-ZZ1)*(X1+ZZ1)
                    zzz := mulmod(T1, zzz, p) // Info: (20260412 - Luphia) zzz3=W*zzz1
                    zz := mulmod(T2, zz, p) // Info: (20260412 - Luphia) zz3=V*ZZ1, V free

                    X := addmod(mulmod(T4, T4, p), mulmod(minus_2, T3, p), p) // Info: (20260412 - Luphia) X3=M^2-2S
                    T2 := mulmod(T4, addmod(X, sub(p, T3), p), p) // Info: (20260412 - Luphia) -M(S-X3)=M(X3-S)
                    Y := addmod(mulmod(T1, Y, p), T2, p) // Info: (20260412 - Luphia) -Y3= W*Y1-M(S-X3), we replace Y by -Y to avoid a sub in ecAdd

                    {
                        // Info: (20260412 - Luphia) value of dibit
                        T4 := add(
                            shl(1, and(shr(index, scalar_v), 1)),
                            and(shr(index, scalar_u), 1)
                        )

                        if iszero(T4) {
                            Y := sub(p, Y) // Info: (20260412 - Luphia) restore the -Y inversion
                            continue
                        } // Info: (20260412 - Luphia) if T4!=0

                        if eq(T4, 1) {
                            T1 := gx
                            T2 := gy
                        }
                        if eq(T4, 2) {
                            T1 := Q0
                            T2 := Q1
                        }
                        if eq(T4, 3) {
                            T1 := H0
                            T2 := H1
                        }
                        if iszero(zz) {
                            X := T1
                            Y := T2
                            zz := 1
                            zzz := 1
                            continue
                        }
                        // Info: (20260412 - Luphia) inlined EcZZ_AddN

                        // Info: (20260412 - Luphia) T3:=sub(p, Y)
                        // Info: (20260412 - Luphia) T3:=Y
                        let y2 := addmod(mulmod(T2, zzz, p), Y, p) // Info: (20260412 - Luphia) R
                        T2 := addmod(mulmod(T1, zz, p), sub(p, X), p) // Info: (20260412 - Luphia) P

                        // Info: (20260412 - Luphia) special extremely rare case accumulator where EcAdd is replaced by EcDbl, no need to optimize this
                        // ToDo: (20260412 - Luphia) construct edge vector case
                        if iszero(y2) {
                            if iszero(T2) {
                                T1 := mulmod(minus_2, Y, p) // Info: (20260412 - Luphia) U = 2*Y1, y free
                                T2 := mulmod(T1, T1, p) // Info: (20260412 - Luphia) V=U^2
                                T3 := mulmod(X, T2, p) // Info: (20260412 - Luphia) S = X1*V

                                T1 := mulmod(T1, T2, p) // Info: (20260412 - Luphia) W=UV
                                y2 := mulmod(
                                    addmod(X, zz, p),
                                    addmod(X, sub(p, zz), p),
                                    p
                                ) // Info: (20260412 - Luphia) (X-ZZ)(X+ZZ)
                                T4 := mulmod(3, y2, p) // Info: (20260412 - Luphia) M=3*(X-ZZ)(X+ZZ)

                                zzz := mulmod(T1, zzz, p) // Info: (20260412 - Luphia) zzz3=W*zzz1
                                zz := mulmod(T2, zz, p) // Info: (20260412 - Luphia) zz3=V*ZZ1, V free

                                X := addmod(
                                    mulmod(T4, T4, p),
                                    mulmod(minus_2, T3, p),
                                    p
                                ) // Info: (20260412 - Luphia) X3=M^2-2S
                                T2 := mulmod(T4, addmod(T3, sub(p, X), p), p) // Info: (20260412 - Luphia) M(S-X3)

                                Y := addmod(T2, mulmod(T1, Y, p), p) // Info: (20260412 - Luphia) Y3= M(S-X3)-W*Y1

                                continue
                            }
                        }

                        T4 := mulmod(T2, T2, p) // Info: (20260412 - Luphia) PP
                        let TT1 := mulmod(T4, T2, p) // Info: (20260412 - Luphia) PPP, this one could be spared, but adding this register spare gas
                        zz := mulmod(zz, T4, p)
                        zzz := mulmod(zzz, TT1, p) // Info: (20260412 - Luphia) zz3=V*ZZ1
                        let TT2 := mulmod(X, T4, p)
                        T4 := addmod(
                            addmod(mulmod(y2, y2, p), sub(p, TT1), p),
                            mulmod(minus_2, TT2, p),
                            p
                        )
                        Y := addmod(
                            mulmod(addmod(TT2, sub(p, T4), p), y2, p),
                            mulmod(Y, TT1, p),
                            p
                        )

                        X := T4
                    }
                }
                let T := mload(0x40)
                mstore(add(T, 0x60), zz)
                // Info: (20260412 - Luphia) (X,Y)=ecZZ_SetAff(X,Y,zz, zzz);
                // Info: (20260412 - Luphia) T[0] = inverseModp_Hard(T[0], p); //1/zzz, inline modular inversion using precompile:
                // Info: (20260412 - Luphia) Define length of base, exponent and modulus. 0x20 == 32 bytes
                mstore(T, 0x20)
                mstore(add(T, 0x20), 0x20)
                mstore(add(T, 0x40), 0x20)
                // Info: (20260412 - Luphia) Define variables base, exponent and modulus
                // Info: (20260412 - Luphia) mstore(add(pointer, 0x60), u)
                mstore(add(T, 0x80), minus_2)
                mstore(add(T, 0xa0), p)

                // Info: (20260412 - Luphia) Call the precompiled contract 0x05 = ModExp
                if iszero(staticcall(not(0), 0x05, T, 0xc0, T, 0x20)) {
                    revert(0, 0)
                }

                // Info: (20260412 - Luphia) Y:=mulmod(Y,zzz,p)//Y/zzz
                // Info: (20260412 - Luphia) zz :=mulmod(zz, mload(T),p) //1/z
                // Info: (20260412 - Luphia) zz:= mulmod(zz,zz,p) //1/zz
                X := mulmod(X, mload(T), p) // Info: (20260412 - Luphia) X/zz
            }
        }
        return X;
    }

    /**
     * Info: (20260412 - Luphia)
     * @dev Computation of uG+vQ using Strauss-Shamir's trick, G basepoint, Q public key
     *      Returns affine representation of point (normalized)
     */
    function ecZZ_mulmuladd(
        uint256 Q0,
        uint256 Q1, // Info: (20260412 - Luphia) affine rep for input point Q
        uint256 scalar_u,
        uint256 scalar_v
    ) internal view returns (uint256 X, uint256 Y) {
        uint256 zz;
        uint256 zzz;
        uint256 index = 255;
        uint256[6] memory T;
        uint256[2] memory H;

        unchecked {
            if (scalar_u == 0 && scalar_v == 0) return (0, 0);

            (H[0], H[1]) = ecAff_add(gx, gy, Q0, Q1); // Info: (20260412 - Luphia) will not work if Q=P, obvious forbidden private key

            assembly {
                for {
                    let T4 := add(
                        shl(1, and(shr(index, scalar_v), 1)),
                        and(shr(index, scalar_u), 1)
                    )
                } eq(T4, 0) {
                    index := sub(index, 1)
                    T4 := add(
                        shl(1, and(shr(index, scalar_v), 1)),
                        and(shr(index, scalar_u), 1)
                    )
                } {}
                zz := add(
                    shl(1, and(shr(index, scalar_v), 1)),
                    and(shr(index, scalar_u), 1)
                )

                if eq(zz, 1) {
                    X := gx
                    Y := gy
                }
                if eq(zz, 2) {
                    X := Q0
                    Y := Q1
                }
                if eq(zz, 3) {
                    Y := mload(add(H, 32))
                    X := mload(H)
                }

                index := sub(index, 1)
                zz := 1
                zzz := 1

                for {} gt(minus_1, index) {
                    index := sub(index, 1)
                } {
                    // Info: (20260412 - Luphia) inlined EcZZ_Dbl
                    let T1 := mulmod(2, Y, p) // Info: (20260412 - Luphia) U = 2*Y1, y free
                    let T2 := mulmod(T1, T1, p) // Info: (20260412 - Luphia) V=U^2
                    let T3 := mulmod(X, T2, p) // Info: (20260412 - Luphia) S = X1*V
                    T1 := mulmod(T1, T2, p) // Info: (20260412 - Luphia) W=UV
                    let T4 := mulmod(
                        3,
                        mulmod(addmod(X, sub(p, zz), p), addmod(X, zz, p), p),
                        p
                    ) // Info: (20260412 - Luphia) M=3*(X1-ZZ1)*(X1+ZZ1)
                    zzz := mulmod(T1, zzz, p) // Info: (20260412 - Luphia) zzz3=W*zzz1
                    zz := mulmod(T2, zz, p) // Info: (20260412 - Luphia) zz3=V*ZZ1, V free

                    X := addmod(mulmod(T4, T4, p), mulmod(minus_2, T3, p), p) // Info: (20260412 - Luphia) X3=M^2-2S
                    T2 := mulmod(T4, addmod(X, sub(p, T3), p), p) // Info: (20260412 - Luphia) -M(S-X3)=M(X3-S)
                    Y := addmod(mulmod(T1, Y, p), T2, p) // Info: (20260412 - Luphia) -Y3= W*Y1-M(S-X3), we replace Y by -Y to avoid a sub in ecAdd

                    {
                        // Info: (20260412 - Luphia) value of dibit
                        T4 := add(
                            shl(1, and(shr(index, scalar_v), 1)),
                            and(shr(index, scalar_u), 1)
                        )

                        if iszero(T4) {
                            Y := sub(p, Y) // Info: (20260412 - Luphia) restore the -Y inversion
                            continue
                        } // Info: (20260412 - Luphia) if T4!=0

                        if eq(T4, 1) {
                            T1 := gx
                            T2 := gy
                        }
                        if eq(T4, 2) {
                            T1 := Q0
                            T2 := Q1
                        }
                        if eq(T4, 3) {
                            T1 := mload(H)
                            T2 := mload(add(H, 32))
                        }
                        if iszero(zz) {
                            X := T1
                            Y := T2
                            zz := 1
                            zzz := 1
                            continue
                        }
                        // Info: (20260412 - Luphia) inlined EcZZ_AddN

                        // Info: (20260412 - Luphia) T3:=sub(p, Y)
                        // Info: (20260412 - Luphia) T3:=Y
                        let y2 := addmod(mulmod(T2, zzz, p), Y, p) // Info: (20260412 - Luphia) R
                        T2 := addmod(mulmod(T1, zz, p), sub(p, X), p) // Info: (20260412 - Luphia) P

                        // Info: (20260412 - Luphia) special extremely rare case accumulator where EcAdd is replaced by EcDbl, no need to optimize this
                        // Info: (20260412 - Luphia) todo : construct edge vector case
                        if iszero(y2) {
                            if iszero(T2) {
                                T1 := mulmod(minus_2, Y, p) // Info: (20260412 - Luphia) U = 2*Y1, y free
                                T2 := mulmod(T1, T1, p) // Info: (20260412 - Luphia) V=U^2
                                T3 := mulmod(X, T2, p) // Info: (20260412 - Luphia) S = X1*V

                                T1 := mulmod(T1, T2, p) // Info: (20260412 - Luphia) W=UV
                                y2 := mulmod(
                                    addmod(X, zz, p),
                                    addmod(X, sub(p, zz), p),
                                    p
                                ) // Info: (20260412 - Luphia) (X-ZZ)(X+ZZ)
                                T4 := mulmod(3, y2, p) // Info: (20260412 - Luphia) M=3*(X-ZZ)(X+ZZ)

                                zzz := mulmod(T1, zzz, p) // Info: (20260412 - Luphia) zzz3=W*zzz1
                                zz := mulmod(T2, zz, p) // Info: (20260412 - Luphia) zz3=V*ZZ1, V free

                                X := addmod(
                                    mulmod(T4, T4, p),
                                    mulmod(minus_2, T3, p),
                                    p
                                ) // Info: (20260412 - Luphia) X3=M^2-2S
                                T2 := mulmod(T4, addmod(T3, sub(p, X), p), p) // Info: (20260412 - Luphia) M(S-X3)

                                Y := addmod(T2, mulmod(T1, Y, p), p) // Info: (20260412 - Luphia) Y3= M(S-X3)-W*Y1

                                continue
                            }
                        }

                        T4 := mulmod(T2, T2, p) // Info: (20260412 - Luphia) PP
                        let TT1 := mulmod(T4, T2, p) // Info: (20260412 - Luphia) PPP, this one could be spared, but adding this register spare gas
                        zz := mulmod(zz, T4, p) // Info: (20260412 - Luphia) zz3=V*ZZ1
                        zzz := mulmod(zzz, TT1, p) // Info: (20260412 - Luphia) zzz3=V*ZZ1
                        let TT2 := mulmod(X, T4, p)
                        T4 := addmod(
                            addmod(mulmod(y2, y2, p), sub(p, TT1), p),
                            mulmod(minus_2, TT2, p),
                            p
                        )
                        Y := addmod(
                            mulmod(addmod(TT2, sub(p, T4), p), y2, p),
                            mulmod(Y, TT1, p),
                            p
                        )

                        X := T4
                    }
                }
                mstore(add(T, 0x60), zzz)
                // Info: (20260412 - Luphia) (X,Y)=ecZZ_SetAff(X,Y,zz, zzz);
                // Info: (20260412 - Luphia) T[0] = inverseModp_Hard(T[0], p); //1/zzz, inline modular inversion using precompile:
                // Info: (20260412 - Luphia) Define length of base, exponent and modulus. 0x20 == 32 bytes
                mstore(T, 0x20)
                mstore(add(T, 0x20), 0x20)
                mstore(add(T, 0x40), 0x20)
                // Info: (20260412 - Luphia) Define variables base, exponent and modulus
                // Info: (20260412 - Luphia) mstore(add(pointer, 0x60), u)
                mstore(add(T, 0x80), minus_2)
                mstore(add(T, 0xa0), p)

                // Info: (20260412 - Luphia) Call the precompiled contract 0x05 = ModExp
                if iszero(staticcall(not(0), 0x05, T, 0xc0, T, 0x20)) {
                    revert(0, 0)
                }

                Y := mulmod(Y, mload(T), p) // Info: (20260412 - Luphia) Y/zzz
                zz := mulmod(zz, mload(T), p) // Info: (20260412 - Luphia) 1/z
                zz := mulmod(zz, zz, p) // Info: (20260412 - Luphia) 1/zz
                X := mulmod(X, zz, p) // Info: (20260412 - Luphia) X/zz
            }
        }
        return (X, Y);
    }

    /**
     * Info: (20260412 - Luphia) 8 dimensions Shamir's trick, using precomputations stored in Shamir8,  stored as Bytecode of an external
     * contract at given address dataPointer
     * the external tool to generate tables from public key is in the /sage directory
     */
    function ecZZ_mulmuladd_S8_extcode(
        uint256 scalar_u,
        uint256 scalar_v,
        address dataPointer
    ) internal view returns (uint256 X /*, uint Y*/) {
        unchecked {
            uint256 zz; // Info: (20260412 - Luphia) third and  coordinates of the point

            uint256[6] memory T;
            zz = 256; // Info: (20260412 - Luphia) start index

            while (T[0] == 0) {
                zz = zz - 1;
                // Info: (20260412 - Luphia) tbd case of msb octobit is null
                T[0] =
                    64 *
                    (128 *
                        ((scalar_v >> zz) & 1) +
                        64 *
                        ((scalar_v >> (zz - 64)) & 1) +
                        32 *
                        ((scalar_v >> (zz - 128)) & 1) +
                        16 *
                        ((scalar_v >> (zz - 192)) & 1) +
                        8 *
                        ((scalar_u >> zz) & 1) +
                        4 *
                        ((scalar_u >> (zz - 64)) & 1) +
                        2 *
                        ((scalar_u >> (zz - 128)) & 1) +
                        ((scalar_u >> (zz - 192)) & 1));
            }
            assembly {
                extcodecopy(dataPointer, T, mload(T), 64)
                let index := sub(zz, 1)
                X := mload(T)
                let Y := mload(add(T, 32))
                let zzz := 1
                zz := 1

                // Info: (20260412 - Luphia) loop over 1/4 of scalars thx to Shamir's trick over 8 points
                for {} gt(index, 191) {
                    index := add(index, 191)
                } {
                    // Info: (20260412 - Luphia) inline Double
                    {
                        let TT1 := mulmod(2, Y, p) // Info: (20260412 - Luphia) U = 2*Y1, y free
                        let T2 := mulmod(TT1, TT1, p) // Info: (20260412 - Luphia) V=U^2
                        let T3 := mulmod(X, T2, p) // Info: (20260412 - Luphia) S = X1*V
                        let T1 := mulmod(TT1, T2, p) // Info: (20260412 - Luphia) W=UV
                        let T4 := mulmod(
                            3,
                            mulmod(
                                addmod(X, sub(p, zz), p),
                                addmod(X, zz, p),
                                p
                            ),
                            p
                        ) // Info: (20260412 - Luphia) M=3*(X1-ZZ1)*(X1+ZZ1)
                        zzz := mulmod(T1, zzz, p) // Info: (20260412 - Luphia) zzz3=W*zzz1
                        zz := mulmod(T2, zz, p) // Info: (20260412 - Luphia) zz3=V*ZZ1, V free

                        X := addmod(
                            mulmod(T4, T4, p),
                            mulmod(minus_2, T3, p),
                            p
                        ) // Info: (20260412 - Luphia) X3=M^2-2S
                        // Info: (20260412 - Luphia) T2:=mulmod(T4,addmod(T3, sub(p, X),p),p)//M(S-X3)
                        let T5 := mulmod(T4, addmod(X, sub(p, T3), p), p) // Info: (20260412 - Luphia) -M(S-X3)=M(X3-S)

                        // Info: (20260412 - Luphia) Y:= addmod(T2, sub(p, mulmod(T1, Y ,p)),p  )//Y3= M(S-X3)-W*Y1
                        Y := addmod(mulmod(T1, Y, p), T5, p) // Info: (20260412 - Luphia) -Y3= W*Y1-M(S-X3), we replace Y by -Y to avoid a sub in ecAdd
                    }

                    // Info: (20260412 - Luphia) compute element to access in precomputed table
                    {
                        let T4 := add(
                            shl(13, and(shr(index, scalar_v), 1)),
                            shl(9, and(shr(index, scalar_u), 1))
                        )
                        let index2 := sub(index, 64)
                        let T3 := add(
                            T4,
                            add(
                                shl(12, and(shr(index2, scalar_v), 1)),
                                shl(8, and(shr(index2, scalar_u), 1))
                            )
                        )
                        let index3 := sub(index2, 64)
                        let T2 := add(
                            T3,
                            add(
                                shl(11, and(shr(index3, scalar_v), 1)),
                                shl(7, and(shr(index3, scalar_u), 1))
                            )
                        )
                        index := sub(index3, 64)
                        let T1 := add(
                            T2,
                            add(
                                shl(10, and(shr(index, scalar_v), 1)),
                                shl(6, and(shr(index, scalar_u), 1))
                            )
                        )

                        // Info: (20260412 - Luphia) tbd: check validity of formulae with (0,1) to remove conditional jump
                        if iszero(T1) {
                            Y := sub(p, Y)

                            continue
                        }
                        extcodecopy(dataPointer, T, T1, 64)
                    }

                    {
                        // Info: (20260412 - Luphia) Access to precomputed table using extcodecopy hack

                        // Info: (20260412 - Luphia) inlined EcZZ_AddN
                        if iszero(zz) {
                            X := mload(T)
                            Y := mload(add(T, 32))
                            zz := 1
                            zzz := 1

                            continue
                        }

                        let y2 := addmod(
                            mulmod(mload(add(T, 32)), zzz, p),
                            Y,
                            p
                        )
                        let T2 := addmod(mulmod(mload(T), zz, p), sub(p, X), p)

                        // Info: (20260412 - Luphia) special case ecAdd(P,P)=EcDbl
                        if iszero(y2) {
                            if iszero(T2) {
                                let T1 := mulmod(minus_2, Y, p) // Info: (20260412 - Luphia) U = 2*Y1, y free
                                T2 := mulmod(T1, T1, p) // Info: (20260412 - Luphia) V=U^2
                                let T3 := mulmod(X, T2, p) // Info: (20260412 - Luphia) S = X1*V

                                T1 := mulmod(T1, T2, p) // Info: (20260412 - Luphia) W=UV
                                y2 := mulmod(
                                    addmod(X, zz, p),
                                    addmod(X, sub(p, zz), p),
                                    p
                                ) // Info: (20260412 - Luphia) (X-ZZ)(X+ZZ)
                                let T4 := mulmod(3, y2, p) // Info: (20260412 - Luphia) M=3*(X-ZZ)(X+ZZ)

                                zzz := mulmod(T1, zzz, p) // Info: (20260412 - Luphia) zzz3=W*zzz1
                                zz := mulmod(T2, zz, p) // Info: (20260412 - Luphia) zz3=V*ZZ1, V free

                                X := addmod(
                                    mulmod(T4, T4, p),
                                    mulmod(minus_2, T3, p),
                                    p
                                ) // Info: (20260412 - Luphia) X3=M^2-2S
                                T2 := mulmod(T4, addmod(T3, sub(p, X), p), p) // Info: (20260412 - Luphia) M(S-X3)

                                Y := addmod(T2, mulmod(T1, Y, p), p) // Info: (20260412 - Luphia) Y3= M(S-X3)-W*Y1

                                continue
                            }
                        }

                        let T4 := mulmod(T2, T2, p)
                        let T1 := mulmod(T4, T2, p)
                        zz := mulmod(zz, T4, p)
                        // Info: (20260412 - Luphia) zzz3=V*ZZ1
                        zzz := mulmod(zzz, T1, p) // Info: (20260412 - Luphia) W=UV/
                        let zz1 := mulmod(X, T4, p)
                        X := addmod(
                            addmod(mulmod(y2, y2, p), sub(p, T1), p),
                            mulmod(minus_2, zz1, p),
                            p
                        )
                        Y := addmod(
                            mulmod(addmod(zz1, sub(p, X), p), y2, p),
                            mulmod(Y, T1, p),
                            p
                        )
                    }
                } // Info: (20260412 - Luphia) end loop
                mstore(add(T, 0x60), zz)

                // Info: (20260412 - Luphia) (X,Y)=ecZZ_SetAff(X,Y,zz, zzz);
                // Info: (20260412 - Luphia) T[0] = inverseModp_Hard(T[0], p); //1/zzz, inline modular inversion using precompile:
                // Info: (20260412 - Luphia) Define length of base, exponent and modulus. 0x20 == 32 bytes
                mstore(T, 0x20)
                mstore(add(T, 0x20), 0x20)
                mstore(add(T, 0x40), 0x20)
                // Info: (20260412 - Luphia) Define variables base, exponent and modulus
                // Info: (20260412 - Luphia) mstore(add(pointer, 0x60), u)
                mstore(add(T, 0x80), minus_2)
                mstore(add(T, 0xa0), p)

                // Info: (20260412 - Luphia) Call the precompiled contract 0x05 = ModExp
                if iszero(staticcall(not(0), 0x05, T, 0xc0, T, 0x20)) {
                    revert(0, 0)
                }

                zz := mload(T)
                X := mulmod(X, zz, p) // Info: (20260412 - Luphia) X/zz
            }
        } // Info: (20260412 - Luphia) end unchecked
    }

    // Info: (20260412 - Luphia) improving the extcodecopy trick : append array at end of contract
    function ecZZ_mulmuladd_S8_hackmem(
        uint256 scalar_u,
        uint256 scalar_v,
        uint256 dataPointer
    ) internal view returns (uint256 X /*, uint Y*/) {
        uint256 zz; // Info: (20260412 - Luphia) third and  coordinates of the point

        uint256[6] memory T;
        zz = 256; // Info: (20260412 - Luphia) start index

        unchecked {
            while (T[0] == 0) {
                zz = zz - 1;
                // Info: (20260412 - Luphia) tbd case of msb octobit is null
                T[0] =
                    64 *
                    (128 *
                        ((scalar_v >> zz) & 1) +
                        64 *
                        ((scalar_v >> (zz - 64)) & 1) +
                        32 *
                        ((scalar_v >> (zz - 128)) & 1) +
                        16 *
                        ((scalar_v >> (zz - 192)) & 1) +
                        8 *
                        ((scalar_u >> zz) & 1) +
                        4 *
                        ((scalar_u >> (zz - 64)) & 1) +
                        2 *
                        ((scalar_u >> (zz - 128)) & 1) +
                        ((scalar_u >> (zz - 192)) & 1));
            }
            assembly {
                codecopy(T, add(mload(T), dataPointer), 64)
                X := mload(T)
                let Y := mload(add(T, 32))
                let zzz := 1
                zz := 1

                // Info: (20260412 - Luphia) loop over 1/4 of scalars thx to Shamir's trick over 8 points
                for {
                    let index := 254
                } gt(index, 191) {
                    index := add(index, 191)
                } {
                    let T1 := mulmod(2, Y, p) // Info: (20260412 - Luphia) U = 2*Y1, y free
                    let T2 := mulmod(T1, T1, p) // Info: (20260412 - Luphia) V=U^2
                    let T3 := mulmod(X, T2, p) // Info: (20260412 - Luphia) S = X1*V
                    T1 := mulmod(T1, T2, p) // Info: (20260412 - Luphia) W=UV
                    let T4 := mulmod(
                        3,
                        mulmod(addmod(X, sub(p, zz), p), addmod(X, zz, p), p),
                        p
                    ) // Info: (20260412 - Luphia) M=3*(X1-ZZ1)*(X1+ZZ1)
                    zzz := mulmod(T1, zzz, p) // Info: (20260412 - Luphia) zzz3=W*zzz1
                    zz := mulmod(T2, zz, p) // Info: (20260412 - Luphia) zz3=V*ZZ1, V free

                    X := addmod(mulmod(T4, T4, p), mulmod(minus_2, T3, p), p) // Info: (20260412 - Luphia) X3=M^2-2S
                    // Info: (20260412 - Luphia) T2:=mulmod(T4,addmod(T3, sub(p, X),p),p)//M(S-X3)
                    T2 := mulmod(T4, addmod(X, sub(p, T3), p), p) // Info: (20260412 - Luphia) -M(S-X3)=M(X3-S)

                    // Info: (20260412 - Luphia) Y:= addmod(T2, sub(p, mulmod(T1, Y ,p)),p  )//Y3= M(S-X3)-W*Y1
                    Y := addmod(mulmod(T1, Y, p), T2, p) // Info: (20260412 - Luphia) -Y3= W*Y1-M(S-X3), we replace Y by -Y to avoid a sub in ecAdd

                    // Info: (20260412 - Luphia) compute element to access in precomputed table
                    T4 := add(
                        shl(13, and(shr(index, scalar_v), 1)),
                        shl(9, and(shr(index, scalar_u), 1))
                    )
                    index := sub(index, 64)
                    T4 := add(
                        T4,
                        add(
                            shl(12, and(shr(index, scalar_v), 1)),
                            shl(8, and(shr(index, scalar_u), 1))
                        )
                    )
                    index := sub(index, 64)
                    T4 := add(
                        T4,
                        add(
                            shl(11, and(shr(index, scalar_v), 1)),
                            shl(7, and(shr(index, scalar_u), 1))
                        )
                    )
                    index := sub(index, 64)
                    T4 := add(
                        T4,
                        add(
                            shl(10, and(shr(index, scalar_v), 1)),
                            shl(6, and(shr(index, scalar_u), 1))
                        )
                    )
                    // Info: (20260412 - Luphia) index:=add(index,192), restore index, interleaved with loop

                    // Info: (20260412 - Luphia) tbd: check validity of formulae with (0,1) to remove conditional jump
                    if iszero(T4) {
                        Y := sub(p, Y)

                        continue
                    }
                    {
                        // Info: (20260412 - Luphia) Access to precomputed table using extcodecopy hack
                        codecopy(T, add(T4, dataPointer), 64)

                        // Info: (20260412 - Luphia) inlined EcZZ_AddN

                        let y2 := addmod(
                            mulmod(mload(add(T, 32)), zzz, p),
                            Y,
                            p
                        )
                        T2 := addmod(mulmod(mload(T), zz, p), sub(p, X), p)
                        T4 := mulmod(T2, T2, p)
                        T1 := mulmod(T4, T2, p)
                        T2 := mulmod(zz, T4, p) // Info: (20260412 - Luphia) W=UV
                        zzz := mulmod(zzz, T1, p) // Info: (20260412 - Luphia) zz3=V*ZZ1
                        let zz1 := mulmod(X, T4, p)
                        T4 := addmod(
                            addmod(mulmod(y2, y2, p), sub(p, T1), p),
                            mulmod(minus_2, zz1, p),
                            p
                        )
                        Y := addmod(
                            mulmod(addmod(zz1, sub(p, T4), p), y2, p),
                            mulmod(Y, T1, p),
                            p
                        )
                        zz := T2
                        X := T4
                    }
                } // Info: (20260412 - Luphia) end loop
                mstore(add(T, 0x60), zz)

                // Info: (20260412 - Luphia) (X,Y)=ecZZ_SetAff(X,Y,zz, zzz);
                // Info: (20260412 - Luphia) T[0] = inverseModp_Hard(T[0], p); //1/zzz, inline modular inversion using precompile:
                // Info: (20260412 - Luphia) Define length of base, exponent and modulus. 0x20 == 32 bytes
                mstore(T, 0x20)
                mstore(add(T, 0x20), 0x20)
                mstore(add(T, 0x40), 0x20)
                // Info: (20260412 - Luphia) Define variables base, exponent and modulus
                // Info: (20260412 - Luphia) mstore(add(pointer, 0x60), u)
                mstore(add(T, 0x80), minus_2)
                mstore(add(T, 0xa0), p)

                // Info: (20260412 - Luphia) Call the precompiled contract 0x05 = ModExp
                if iszero(staticcall(not(0), 0x05, T, 0xc0, T, 0x20)) {
                    revert(0, 0)
                }

                zz := mload(T)
                X := mulmod(X, zz, p) // Info: (20260412 - Luphia) X/zz
            }
        }
    }

    /**
     * Info: (20260412 - Luphia)
     * @dev ECDSA verification using a precomputed table of multiples of P and Q appended at end of contract at address endcontract
     *     generation of contract bytecode for precomputations is done using sagemath code
     *     (see sage directory, WebAuthn_precompute.sage)
     */
    function ecdsa_precomputed_hackmem(
        bytes32 message,
        uint256[2] calldata rs,
        uint256 endcontract
    ) internal view returns (bool) {
        uint256 r = rs[0];
        uint256 s = rs[1];
        if (r == 0 || r >= n || s == 0 || s >= n) {
            return false;
        }
        /* Info: (20260412 - Luphia) Q is pushed via bytecode assumed to be correct
        if (!isOnCurve(Q[0], Q[1])) {
            return false;
        }
        */

        uint256 sInv = FCL_nModInv(s);
        uint256 X;

        // Info: (20260412 - Luphia) Shamir 8 dimensions
        X = ecZZ_mulmuladd_S8_hackmem(
            mulmod(uint256(message), sInv, n),
            mulmod(r, sInv, n),
            endcontract
        );

        assembly {
            X := addmod(X, sub(n, r), n)
        }
        return X == 0;
    }
}
