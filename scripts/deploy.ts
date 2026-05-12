import { ethers, network } from "hardhat";
import fs from "node:fs";
import path from "node:path";

type DeploymentInfo = {
  network: string;
  chainId: number;
  blockNumber: number;
  contracts: {
    DeFiToken: string;
    StakingPool: string;
  };
};

async function ensureDir(p: string) {
  await fs.promises.mkdir(p, { recursive: true });
}

async function main() {
  const [deployer] = await ethers.getSigners();
  const chainId = Number((await ethers.provider.getNetwork()).chainId);

  console.log(`Deploying with: ${deployer.address}`);
  console.log(`Network: ${network.name} (chainId ${chainId})`);

  const DeFiToken = await ethers.getContractFactory("DeFiToken");
  const token = await DeFiToken.deploy();
  await token.waitForDeployment();
  const tokenAddress = await token.getAddress();

  const StakingPool = await ethers.getContractFactory("StakingPool");
  const pool = await StakingPool.deploy(tokenAddress);
  await pool.waitForDeployment();
  const poolAddress = await pool.getAddress();

  const rewardReserve = ethers.parseUnits("100000", 18);
  const transferTx = await token.transfer(poolAddress, rewardReserve);
  await transferTx.wait();

  console.log(`DeFiToken:   ${tokenAddress}`);
  console.log(`StakingPool: ${poolAddress}`);

  // Copy ABIs to frontend/src/abi
  const abiOutDir = path.join(__dirname, "..", "frontend", "src", "abi");
  await ensureDir(abiOutDir);

  const tokenArtifactPath = path.join(
    __dirname,
    "..",
    "artifacts",
    "contracts",
    "DeFiToken.sol",
    "DeFiToken.json"
  );
  const poolArtifactPath = path.join(
    __dirname,
    "..",
    "artifacts",
    "contracts",
    "StakingPool.sol",
    "StakingPool.json"
  );

  const tokenArtifact = JSON.parse(
    await fs.promises.readFile(tokenArtifactPath, "utf8")
  );
  const poolArtifact = JSON.parse(
    await fs.promises.readFile(poolArtifactPath, "utf8")
  );

  await fs.promises.writeFile(
    path.join(abiOutDir, "DeFiToken.json"),
    JSON.stringify(tokenArtifact.abi, null, 2),
    "utf8"
  );
  await fs.promises.writeFile(
    path.join(abiOutDir, "StakingPool.json"),
    JSON.stringify(poolArtifact.abi, null, 2),
    "utf8"
  );

  // Write deployments.json
  const blockNumber = await ethers.provider.getBlockNumber();
  const deployment: DeploymentInfo = {
    network: network.name,
    chainId,
    blockNumber,
    contracts: {
      DeFiToken: tokenAddress,
      StakingPool: poolAddress,
    },
  };

  const deploymentJson = JSON.stringify(deployment, null, 2);
  await fs.promises.writeFile(
    path.join(__dirname, "..", "deployments.json"),
    deploymentJson,
    "utf8"
  );

  // Local Hardhat only: Vite dev can load /deployments.json without env vars.
  if (chainId === 31_337) {
    const publicDir = path.join(__dirname, "..", "frontend", "public");
    await ensureDir(publicDir);
    await fs.promises.writeFile(
      path.join(publicDir, "deployments.json"),
      deploymentJson,
      "utf8"
    );
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});

