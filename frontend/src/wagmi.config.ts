import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { http } from "viem";
import { hardhat, sepolia } from "wagmi/chains";

const sepoliaRpc =
  import.meta.env.VITE_SEPOLIA_RPC_URL ||
  "https://rpc.sepolia.org";

export const wagmiConfig = getDefaultConfig({
  appName: "DeFi Dashboard",
  projectId: import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || "demo",
  chains: [sepolia, hardhat],
  transports: {
    [sepolia.id]: http(sepoliaRpc),
    [hardhat.id]: http(),
  },
});

