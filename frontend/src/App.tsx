import { WalletButton } from "./components/WalletButton";
import { Dashboard } from "./components/Dashboard";
import { StakePanel } from "./components/StakePanel";

export function App() {
  return (
    <>
      <div className="container">
        <header className="navbar">
          <div className="brand">
            <h1>DeFi Dashboard</h1>
            <span className="badge">Sepolia / Hardhat</span>
          </div>
          <WalletButton />
        </header>

        <Dashboard />

        <div className="panel card">
          <div className="panel-header">
            <p className="panel-title">Stake / Unstake / Claim</p>
            <span className="badge">DFT</span>
          </div>
          <div className="panel-body">
            <StakePanel />
          </div>
        </div>
      </div>
    </>
  );
}

