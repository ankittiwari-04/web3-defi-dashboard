import { expect } from "chai";
import { ethers, network } from "hardhat";

describe("DeFi Dashboard Contracts", function () {
  async function deployFixture() {
    const [deployer, user] = await ethers.getSigners();

    const Token = await ethers.getContractFactory("DeFiToken");
    const token = await Token.deploy();
    await token.waitForDeployment();

    const Pool = await ethers.getContractFactory("StakingPool");
    const pool = await Pool.deploy(await token.getAddress());
    await pool.waitForDeployment();

    // Seed pool reward reserve
    await (await token.transfer(await pool.getAddress(), ethers.parseUnits("100000", 18))).wait();

    // Fund user
    await (await token.transfer(user.address, ethers.parseUnits("10000", 18))).wait();

    return { deployer, user, token, pool };
  }

  it("DeFiToken deployment — correct name, symbol, supply, owner", async function () {
    const { deployer, token } = await deployFixture();
    expect(await token.name()).to.equal("DeFi Token");
    expect(await token.symbol()).to.equal("DFT");
    expect(await token.totalSupply()).to.equal(ethers.parseUnits("1000000", 18));
    expect(await token.owner()).to.equal(deployer.address);
  });

  it("Staking — user can stake tokens, StakingPool balance increases", async function () {
    const { user, token, pool } = await deployFixture();

    const stakeAmount = ethers.parseUnits("1000", 18);
    await (await token.connect(user).approve(await pool.getAddress(), stakeAmount)).wait();

    const before = await token.balanceOf(await pool.getAddress());
    await (await pool.connect(user).stake(stakeAmount)).wait();
    const after = await token.balanceOf(await pool.getAddress());

    expect(after - before).to.equal(stakeAmount);
    expect(await pool.getStakedAmount(user.address)).to.equal(stakeAmount);
  });

  it("Rewards — fast-forward time 1 day, pending rewards > 0", async function () {
    const { user, token, pool } = await deployFixture();

    const stakeAmount = ethers.parseUnits("1000", 18);
    await (await token.connect(user).approve(await pool.getAddress(), stakeAmount)).wait();
    await (await pool.connect(user).stake(stakeAmount)).wait();

    // Advance time by 1 day
    await network.provider.send("evm_increaseTime", [24 * 60 * 60]);
    await network.provider.send("evm_mine");

    const pending = await pool.getPendingRewards(user.address);
    expect(pending).to.be.gt(0n);
  });

  it("Unstaking — user gets tokens back, rewards tracked correctly", async function () {
    const { user, token, pool } = await deployFixture();

    const stakeAmount = ethers.parseUnits("500", 18);
    await (await token.connect(user).approve(await pool.getAddress(), stakeAmount)).wait();
    await (await pool.connect(user).stake(stakeAmount)).wait();

    await network.provider.send("evm_increaseTime", [12 * 60 * 60]);
    await network.provider.send("evm_mine");

    const pendingBefore = await pool.getPendingRewards(user.address);
    expect(pendingBefore).to.be.gt(0n);

    const userBalBefore = await token.balanceOf(user.address);
    await (await pool.connect(user).unstake(stakeAmount)).wait();
    const userBalAfter = await token.balanceOf(user.address);

    expect(userBalAfter - userBalBefore).to.equal(stakeAmount);

    // After unstake, rewards may increase slightly due to the unstake tx timestamp,
    // but must stop increasing afterwards since stakedAmount becomes 0.
    const pendingAfter = await pool.getPendingRewards(user.address);
    expect(pendingAfter).to.be.gte(pendingBefore);

    await network.provider.send("evm_increaseTime", [12 * 60 * 60]);
    await network.provider.send("evm_mine");
    const pendingLater = await pool.getPendingRewards(user.address);
    expect(pendingLater).to.equal(pendingAfter);
  });

  it("Claim rewards — user receives DFT reward tokens", async function () {
    const { user, token, pool } = await deployFixture();

    const stakeAmount = ethers.parseUnits("1000", 18);
    await (await token.connect(user).approve(await pool.getAddress(), stakeAmount)).wait();
    await (await pool.connect(user).stake(stakeAmount)).wait();

    await network.provider.send("evm_increaseTime", [24 * 60 * 60]);
    await network.provider.send("evm_mine");

    const pendingAtRead = await pool.getPendingRewards(user.address);
    expect(pendingAtRead).to.be.gt(0n);

    const before = await token.balanceOf(user.address);
    await (await pool.connect(user).claimRewards()).wait();
    const after = await token.balanceOf(user.address);

    expect(after - before).to.be.gte(pendingAtRead);
    expect(await pool.getPendingRewards(user.address)).to.equal(0n);
  });

  it("Edge cases — revert on staking 0, revert on unstaking more than staked", async function () {
    const { user, token, pool } = await deployFixture();

    await expect(pool.connect(user).stake(0)).to.be.revertedWith("Amount is zero");

    const stakeAmount = ethers.parseUnits("10", 18);
    await (await token.connect(user).approve(await pool.getAddress(), stakeAmount)).wait();
    await (await pool.connect(user).stake(stakeAmount)).wait();

    await expect(pool.connect(user).unstake(stakeAmount + 1n)).to.be.revertedWith(
      "Insufficient staked"
    );
  });

  it("Pause — owner can pause, staking reverts when paused", async function () {
    const { deployer, user, token, pool } = await deployFixture();

    await (await pool.connect(deployer).pause()).wait();

    const stakeAmount = ethers.parseUnits("10", 18);
    await (await token.connect(user).approve(await pool.getAddress(), stakeAmount)).wait();

    await expect(pool.connect(user).stake(stakeAmount)).to.be.revertedWithCustomError(
      pool,
      "EnforcedPause"
    );
  });
});

