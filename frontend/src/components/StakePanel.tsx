import React from "react";
import { parseUnits } from "viem";
import {
  useAccount,
  useChainId,
  useReadContract,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";

import tokenAbi from "../abi/DeFiToken.json";
import poolAbi from "../abi/StakingPool.json";
import { hardhat, sepolia } from "wagmi/chains";

import { useAppAddresses } from "../useAppAddresses";
import { useToast } from "./Toast";

function safeParseAmount(input: string) {
  const trimmed = input.trim();
  if (!trimmed) return null;
  try {
    const v = parseUnits(trimmed, 18);
    if (v <= 0n) return null;
    return v;
  } catch {
    return null;
  }
}

export function StakePanel() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { addresses, isLoadingDevDeployments } = useAppAddresses();
  const toast = useToast();

  const [amount, setAmount] = React.useState("");

  const balance = useReadContract({
    abi: tokenAbi as any,
    address: addresses?.token,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: Boolean(isConnected && address && addresses) },
  });

  const { data: hash, isPending, writeContract, reset } = useWriteContract();
  const receipt = useWaitForTransactionReceipt({
    hash,
  });

  const busy = isPending || receipt.isLoading;

  React.useEffect(() => {
    if (!hash) return;
    if (receipt.isSuccess) {
      toast.push({
        kind: "success",
        title: "Transaction confirmed",
        message: `Tx: ${hash.slice(0, 10)}…`,
      });
      reset();
    } else if (receipt.isError) {
      toast.push({
        kind: "error",
        title: "Transaction failed",
        message: receipt.error?.message || "Unknown error",
      });
      reset();
    }
  }, [hash, receipt.isSuccess, receipt.isError, receipt.error, toast, reset]);

  const canAct = Boolean(isConnected && address && addresses);
  const parsed = safeParseAmount(amount);

  const onMax = () => {
    if (balance.data === undefined) return;
    const v = balance.data as bigint;
    const s = (Number(v) / 1e18).toString();
    setAmount(s);
  };

  const doStake = async () => {
    if (!addresses || !parsed) return;
    try {
      toast.push({
        kind: "info",
        title: "Approving…",
        message: "Please confirm in your wallet.",
      });
      writeContract({
        abi: tokenAbi as any,
        address: addresses.token,
        functionName: "approve",
        args: [addresses.stakingPool, parsed],
      });
    } catch (e: any) {
      toast.push({
        kind: "error",
        title: "Approval error",
        message: e?.message || "Unknown error",
      });
      return;
    }
  };

  const doStakeAfterApprove = async () => {
    if (!addresses || !parsed) return;
    try {
      toast.push({
        kind: "info",
        title: "Staking…",
        message: "Please confirm in your wallet.",
      });
      writeContract({
        abi: poolAbi as any,
        address: addresses.stakingPool,
        functionName: "stake",
        args: [parsed],
      });
    } catch (e: any) {
      toast.push({
        kind: "error",
        title: "Stake error",
        message: e?.message || "Unknown error",
      });
    }
  };

  const doUnstake = async () => {
    if (!addresses || !parsed) return;
    try {
      toast.push({
        kind: "info",
        title: "Unstaking…",
        message: "Please confirm in your wallet.",
      });
      writeContract({
        abi: poolAbi as any,
        address: addresses.stakingPool,
        functionName: "unstake",
        args: [parsed],
      });
    } catch (e: any) {
      toast.push({
        kind: "error",
        title: "Unstake error",
        message: e?.message || "Unknown error",
      });
    }
  };

  const doClaim = async () => {
    if (!addresses) return;
    try {
      toast.push({
        kind: "info",
        title: "Claiming…",
        message: "Please confirm in your wallet.",
      });
      writeContract({
        abi: poolAbi as any,
        address: addresses.stakingPool,
        functionName: "claimRewards",
        args: [],
      });
    } catch (e: any) {
      toast.push({
        kind: "error",
        title: "Claim error",
        message: e?.message || "Unknown error",
      });
    }
  };

  // Two-step flow for staking: approve then stake.
  const [stakeStep, setStakeStep] = React.useState<"idle" | "awaitingApprove">(
    "idle"
  );

  React.useEffect(() => {
    if (stakeStep !== "awaitingApprove") return;
    if (!receipt.isSuccess) return;
    setStakeStep("idle");
    doStakeAfterApprove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stakeStep, receipt.isSuccess]);

  const onStakeClick = () => {
    if (!canAct || !parsed || busy) return;
    setStakeStep("awaitingApprove");
    doStake();
  };

  return (
    <>
      <div className="row">
        <div className="input-wrap">
          <input
            inputMode="decimal"
            placeholder="0.0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            disabled={!canAct || busy}
          />
          <button className="ghost" onClick={onMax} disabled={!canAct || busy}>
            Max
          </button>
        </div>
        <div className="badge">
          {balance.data !== undefined
            ? `Bal: ${(Number(balance.data as bigint) / 1e18).toFixed(4)}`
            : canAct
              ? "Bal: …"
              : "Connect wallet"}
        </div>
      </div>

      <div className="actions">
        <button
          className="btn primary"
          onClick={onStakeClick}
          disabled={!canAct || !parsed || busy}
        >
          {busy && stakeStep !== "idle" ? <span className="spinner" /> : null}
          Stake
        </button>
        <button
          className="btn"
          onClick={doUnstake}
          disabled={!canAct || !parsed || busy}
        >
          {busy && stakeStep === "idle" ? <span className="spinner" /> : null}
          Unstake
        </button>
        <button className="btn" onClick={doClaim} disabled={!canAct || busy}>
          {busy ? <span className="spinner" /> : null}
          Claim Rewards
        </button>
      </div>

      {isLoadingDevDeployments ? (
        <p className="stat-label" style={{ margin: "2px 0 0" }}>
          Loading deployment addresses from{" "}
          <span style={{ fontFamily: "var(--mono)" }}>public/deployments.json</span>…
        </p>
      ) : null}

      {!addresses && !isLoadingDevDeployments ? (
        <p className="stat-label" style={{ margin: "2px 0 0" }}>
          {chainId === sepolia.id ? (
            <>
              Set{" "}
              <span style={{ fontFamily: "var(--mono)" }}>
                VITE_SEPOLIA_TOKEN_ADDRESS
              </span>{" "}
              and{" "}
              <span style={{ fontFamily: "var(--mono)" }}>
                VITE_SEPOLIA_STAKING_POOL_ADDRESS
              </span>{" "}
              (or legacy{" "}
              <span style={{ fontFamily: "var(--mono)" }}>VITE_TOKEN_ADDRESS</span>{" "}
              /{" "}
              <span style={{ fontFamily: "var(--mono)" }}>
                VITE_STAKING_POOL_ADDRESS
              </span>
              ) in <span style={{ fontFamily: "var(--mono)" }}>frontend/.env</span>,
              then restart the dev server.
            </>
          ) : chainId === hardhat.id ? (
            <>
              For Hardhat, set{" "}
              <span style={{ fontFamily: "var(--mono)" }}>
                VITE_HARDHAT_TOKEN_ADDRESS
              </span>{" "}
              and{" "}
              <span style={{ fontFamily: "var(--mono)" }}>
                VITE_HARDHAT_STAKING_POOL_ADDRESS
              </span>{" "}
              in <span style={{ fontFamily: "var(--mono)" }}>frontend/.env</span>, or
              run <span style={{ fontFamily: "var(--mono)" }}>deploy.ts</span> against
              this node (writes{" "}
              <span style={{ fontFamily: "var(--mono)" }}>public/deployments.json</span>{" "}
              for dev).
            </>
          ) : (
            <>
              Connect to Sepolia or Hardhat, then configure contract addresses for
              that network in <span style={{ fontFamily: "var(--mono)" }}>frontend/.env</span>.
            </>
          )}
        </p>
      ) : null}
    </>
  );
}

