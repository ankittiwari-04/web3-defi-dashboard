import { hardhat, sepolia } from "wagmi/chains";

export type AppAddresses = {
  token: `0x${string}`;
  stakingPool: `0x${string}`;
};

function envAddress(key: string): `0x${string}` | undefined {
  const v = (import.meta as any).env?.[key] as string | undefined;
  if (!v) return undefined;
  if (!/^0x[a-fA-F0-9]{40}$/.test(v)) return undefined;
  return v as `0x${string}`;
}

/**
 * Resolve contract addresses for the active chain using env vars only.
 * - Sepolia: prefers VITE_SEPOLIA_* then legacy VITE_TOKEN_ADDRESS / VITE_STAKING_POOL_ADDRESS.
 * - Hardhat: only VITE_HARDHAT_* (shared legacy vars are not applied here so Sepolia addresses
 *   are never used accidentally on a local node).
 */
export function resolveAddressesFromEnv(chainId: number): AppAddresses | null {
  if (chainId === sepolia.id) {
    const token =
      envAddress("VITE_SEPOLIA_TOKEN_ADDRESS") ?? envAddress("VITE_TOKEN_ADDRESS");
    const stakingPool =
      envAddress("VITE_SEPOLIA_STAKING_POOL_ADDRESS") ??
      envAddress("VITE_STAKING_POOL_ADDRESS");
    if (!token || !stakingPool) return null;
    return { token, stakingPool };
  }

  if (chainId === hardhat.id) {
    const token = envAddress("VITE_HARDHAT_TOKEN_ADDRESS");
    const stakingPool = envAddress("VITE_HARDHAT_STAKING_POOL_ADDRESS");
    if (!token || !stakingPool) return null;
    return { token, stakingPool };
  }

  return null;
}
