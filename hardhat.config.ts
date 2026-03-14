import "@nomicfoundation/hardhat-toolbox-viem";
import "@nomicfoundation/hardhat-ethers";
import type { HardhatUserConfig } from "hardhat/config";
import "dotenv/config";

const config: HardhatUserConfig = {
  solidity: {
    compilers: [
      {
        version: '0.8.28',
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
          evmVersion: 'paris',
        },
      },
      {
        version: '0.8.17',
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
    ],
  },
  paths: {
    sources: './contracts',
    tests: './test',
    cache: './cache',
    artifacts: './artifacts',
  },
  networks: {
    isuncoin_mainnet: {
      type: 'http',
      chainType: 'l1',
      url: process.env.NEXT_PUBLIC_RPC_URL || 'https://mainnet.isuncoin.com',
      accounts: process.env.ISUNCOIN_PRIVATE_KEY ? [process.env.ISUNCOIN_PRIVATE_KEY] : [],
    },
    localhost: {
      type: 'http',
      url: 'http://127.0.0.1:8545',
    },
  },
};

export default config;
