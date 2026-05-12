import { useEffect, useMemo, useState } from "react";
import { useChainId } from "wagmi";
import { hardhat } from "wagmi/chains";

import { resolveAddressesFromEnv, type AppAddresses } from "./addresses";

type DeploymentFile = {
  network: string;
  chainId: number;
  blockNumber: number;
  contracts: {
    DeFiToken: string;
    StakingPool: string;
  };
};

function parseDeploymentAddresses(
  data: DeploymentFile | null
): AppAddresses | null {
  if (!data || data.chainId !== hardhat.id) return null;
  const token = data.contracts.DeFiToken;
  const pool = data.contracts.StakingPool;
  if (!/^0x[a-fA-F0-9]{40}$/.test(token)) return null;
  if (!/^0x[a-fA-F0-9]{40}$/.test(pool)) return null;
  return {
    token: token as `0x${string}`,
    stakingPool: pool as `0x${string}`,
  };
}

/**
 * Contract addresses for the wallet’s current chain: env first, then in dev
 * only, `public/deployments.json` (written by `scripts/deploy.ts`) for Hardhat.
 */
export function useAppAddresses(): {
  addresses: AppAddresses | null;
  isLoadingDevDeployments: boolean;
} {
  const chainId = useChainId();
  const fromEnv = useMemo(
    () => resolveAddressesFromEnv(chainId),
    [chainId]
  );

  const [fromDeploymentsFile, setFromDeploymentsFile] =
    useState<AppAddresses | null>(null);
  const [isLoadingDevDeployments, setIsLoadingDevDeployments] = useState(false);

  useEffect(() => {
    if (fromEnv) {
      setFromDeploymentsFile(null);
      setIsLoadingDevDeployments(false);
      return;
    }

    if (!import.meta.env.DEV || chainId !== hardhat.id) {
      setFromDeploymentsFile(null);
      setIsLoadingDevDeployments(false);
      return;
    }

    let cancelled = false;
    setIsLoadingDevDeployments(true);

    fetch("/deployments.json")
      .then((r) => (r.ok ? r.json() : null))
      .then((raw: unknown) => {
        if (cancelled) return;
        const parsed = parseDeploymentAddresses(raw as DeploymentFile | null);
        setFromDeploymentsFile(parsed);
      })
      .catch(() => {
        if (!cancelled) setFromDeploymentsFile(null);
      })
      .finally(() => {
        if (!cancelled) setIsLoadingDevDeployments(false);
      });

    return () => {
      cancelled = true;
    };
  }, [chainId, fromEnv]);

  const addresses = fromEnv ?? fromDeploymentsFile;
  return { addresses, isLoadingDevDeployments };
}
