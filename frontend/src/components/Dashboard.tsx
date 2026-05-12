import { formatUnits } from "viem";
import { useAccount, useReadContract } from "wagmi";

import tokenAbi from "../abi/DeFiToken.json";
import poolAbi from "../abi/StakingPool.json";
import { useAppAddresses } from "../useAppAddresses";
import { TokenBalance } from "./TokenBalance";

function format2(v: bigint | undefined, decimals: number) {
  if (v === undefined) return "0.00";
  const n = Number(formatUnits(v, decimals));
  if (!Number.isFinite(n)) return "0.00";
  return n.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function Dashboard() {
  const { address, isConnected } = useAccount();
  const { addresses } = useAppAddresses();

  const enabled = Boolean(isConnected && address && addresses);

  const balance = useReadContract({
    abi: tokenAbi as any,
    address: addresses?.token,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: {
      enabled,
      refetchInterval: 10_000,
    },
  });

  const staked = useReadContract({
    abi: poolAbi as any,
    address: addresses?.stakingPool,
    functionName: "getStakedAmount",
    args: address ? [address] : undefined,
    query: {
      enabled,
      refetchInterval: 10_000,
    },
  });

  const pending = useReadContract({
    abi: poolAbi as any,
    address: addresses?.stakingPool,
    functionName: "getPendingRewards",
    args: address ? [address] : undefined,
    query: {
      enabled,
      refetchInterval: 10_000,
    },
  });

  const anyLoading =
    balance.isFetching || staked.isFetching || pending.isFetching;

  return (
    <div className="grid">
      <TokenBalance
        label="Wallet Balance"
        value={enabled ? format2(balance.data as bigint | undefined, 18) : "—"}
        unit="DFT"
        isLoading={enabled ? anyLoading && balance.data === undefined : false}
      />
      <TokenBalance
        label="Staked Amount"
        value={enabled ? format2(staked.data as bigint | undefined, 18) : "—"}
        unit="DFT"
        isLoading={enabled ? anyLoading && staked.data === undefined : false}
      />
      <TokenBalance
        label="Pending Rewards"
        value={enabled ? format2(pending.data as bigint | undefined, 18) : "—"}
        unit="DFT"
        isLoading={enabled ? anyLoading && pending.data === undefined : false}
      />
    </div>
  );
}

