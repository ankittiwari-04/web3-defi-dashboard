# DeFi Dashboard

## What this project does

This repository is a full-stack DeFi dashboard dApp that includes an ERC-20 token (`DFT`) and a single-token staking pool smart contract. Users can connect a wallet (MetaMask via RainbowKit), view their DFT wallet balance, staked balance, and pending rewards, then stake/unstake DFT and claim rewards.

The backend is a Hardhat project (Solidity 0.8.20 + OpenZeppelin) with a deployment script that deploys both contracts, seeds the staking pool with a reward reserve, writes `deployments.json`, copies deployment metadata to `frontend/public/deployments.json` when chain ID is 31337 (for local Vite dev), and syncs contract ABIs into the React frontend. The frontend is a Vite + React + TypeScript app using Wagmi v2 and RainbowKit, built to run against both a local Hardhat node and the Sepolia testnet.

## Tech stack
- Solidity 0.8.20 + OpenZeppelin
- Hardhat + ethers v6
- React + Vite + Wagmi v2 + RainbowKit
- Sepolia testnet

## Local setup

Clone and install:

```bash
git clone <your-repo-url>
cd defi-dashboard
npm install
cd frontend && npm install
```

Run a local Hardhat node (in terminal 1):

```bash
npx hardhat node
```

Deploy contracts to the local node (in terminal 2):

```bash
npx hardhat compile
npx hardhat run scripts/deploy.ts --network hardhat
```

Start the frontend (in terminal 3):

```bash
cd frontend
cp .env.example .env
# optional: edit .env — see below
npm run dev
```

**Contract addresses (recommended):**

- **Sepolia** — set `VITE_SEPOLIA_TOKEN_ADDRESS` and `VITE_SEPOLIA_STAKING_POOL_ADDRESS` in `frontend/.env`, or use the legacy pair `VITE_TOKEN_ADDRESS` / `VITE_STAKING_POOL_ADDRESS` for Sepolia-only setups.
- **Local Hardhat (chain 31337)** — set `VITE_HARDHAT_TOKEN_ADDRESS` and `VITE_HARDHAT_STAKING_POOL_ADDRESS`, *or* rely on development auto-load: after you deploy to a network with chain ID 31337, `scripts/deploy.ts` writes `frontend/public/deployments.json` (gitignored). In `npm run dev`, the app fetches that file only on Hardhat so Sepolia env vars are never mixed with local contracts.

Also set in `frontend/.env`:

```bash
VITE_SEPOLIA_RPC_URL=https://rpc.sepolia.org
VITE_WALLETCONNECT_PROJECT_ID=<your walletconnect project id>
```

## How to deploy to Sepolia

1) Create a `.env` at the repo root (do not commit it) based on `.env.example`:

```bash
cp .env.example .env
```

2) Fill in:
- `SEPOLIA_RPC_URL`: your Sepolia RPC endpoint (Infura/Alchemy/etc.)
- `PRIVATE_KEY`: your deployer wallet private key
- `ETHERSCAN_API_KEY`: for contract verification (optional)

3) Deploy:

```bash
npx hardhat compile
npx hardhat run scripts/deploy.ts --network sepolia
```

4) Update `frontend/.env` with the deployed contract addresses, for example:
- `VITE_SEPOLIA_TOKEN_ADDRESS`
- `VITE_SEPOLIA_STAKING_POOL_ADDRESS`  
  (or the legacy `VITE_TOKEN_ADDRESS` / `VITE_STAKING_POOL_ADDRESS` for Sepolia only.)

Then run the frontend:

```bash
cd frontend
npm run dev
```

## Contract addresses (update after deploy)
- DeFiToken: TBD
- StakingPool: TBD

