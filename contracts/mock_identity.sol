// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

contract MockIdentity {
    function supportsInterface(bytes4) external pure returns (bool) {
        return true;
    }
}
