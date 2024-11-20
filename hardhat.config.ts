import dotenv from 'dotenv'
dotenv.config()

export default {
  networks: {
    hardhat: {
      allowUnlimitedContractSize: false,
      chainId: 8453,
      forking: {
        url: `${process.env.FORK_URL}`,
        blockNumber: 2059124, // factory creation on Base
      },
    },
  },
}
