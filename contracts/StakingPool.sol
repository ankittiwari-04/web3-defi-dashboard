// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title StakingPool
 * @notice Simple single-token staking pool for DFT with linear per-second rewards.
 *
 * @dev Reward model:
 * - "10 DFT per day per 1000 DFT staked"
 * - Implemented as: pending += stakedAmount * rewardRatePerSecond / 1e18
 * - Where rewardRatePerSecond is "reward per token per second" scaled by 1e18.
 */
contract StakingPool is Ownable, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;

    /// @notice Emitted when a user stakes tokens.
    event Staked(address indexed user, uint256 amount);

    /// @notice Emitted when a user unstakes tokens.
    event Unstaked(address indexed user, uint256 amount);

    /// @notice Emitted when a user claims rewards.
    event RewardsClaimed(address indexed user, uint256 amount);

    /// @notice Emitted when the owner updates the reward rate.
    event RewardRateUpdated(uint256 oldRatePerSecond, uint256 newRatePerSecond);

    /// @notice DFT token being staked and rewarded.
    IERC20 public immutable stakingToken;

    /// @notice Per-token reward rate per second, scaled by 1e18.
    uint256 public rewardRatePerSecond;

    /// @notice Amount staked by each user.
    mapping(address => uint256) public stakedAmount;

    /// @notice Accrued-but-unclaimed rewards tracked per user.
    mapping(address => uint256) public rewardDebt;

    /// @notice Last timestamp when rewards were updated for each user.
    mapping(address => uint256) public lastUpdateTime;

    /**
     * @notice Create a new staking pool for `token`.
     * @dev Initializes the default reward rate to match:
     *      10 DFT/day per 1000 DFT staked -> (10/1000)/86400 DFT per DFT per second.
     * @param token Address of the DFT ERC-20 token.
     */
    constructor(address token) Ownable(msg.sender) {
        require(token != address(0), "Token address is zero");
        stakingToken = IERC20(token);

        // Default: (10 DFT per day per 1000 DFT staked)
        // Per-token-per-day = 10/1000 = 0.01 DFT per 1 DFT staked per day.
        // Per-token-per-second = 0.01 / 86400
        // Scaled by 1e18 for precision:
        // rewardRatePerSecond = (0.01 * 1e18) / 86400 = (1e16) / 86400
        uint256 numerator = 10_000_000_000_000_000;
        rewardRatePerSecond = numerator / 86_400;
    }

    /**
     * @notice Pause staking/unstaking/claiming in emergencies.
     * @dev Only callable by the owner.
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @notice Unpause staking/unstaking/claiming.
     * @dev Only callable by the owner.
     */
    function unpause() external onlyOwner {
        _unpause();
    }

    /**
     * @notice Update the reward rate.
     * @dev Only callable by the owner.
     * @param newRewardRatePerSecond New per-token reward rate per second, scaled by 1e18.
     */
    function setRewardRate(uint256 newRewardRatePerSecond) external onlyOwner {
        uint256 old = rewardRatePerSecond;
        rewardRatePerSecond = newRewardRatePerSecond;
        emit RewardRateUpdated(old, newRewardRatePerSecond);
    }

    /**
     * @notice Stake `amount` of DFT into the pool.
     * @dev Requires prior ERC-20 approval. Updates rewards before mutating stake.
     * @param amount Amount of DFT to stake (in the smallest unit).
     */
    function stake(uint256 amount) external nonReentrant whenNotPaused {
        require(amount > 0, "Amount is zero");
        _updateRewards(msg.sender);

        stakedAmount[msg.sender] += amount;
        stakingToken.safeTransferFrom(msg.sender, address(this), amount);

        emit Staked(msg.sender, amount);
    }

    /**
     * @notice Unstake `amount` of DFT from the pool.
     * @dev Updates rewards before mutating stake.
     * @param amount Amount of DFT to unstake (in the smallest unit).
     */
    function unstake(uint256 amount) external nonReentrant whenNotPaused {
        require(amount > 0, "Amount is zero");
        uint256 staked = stakedAmount[msg.sender];
        require(amount <= staked, "Insufficient staked");

        _updateRewards(msg.sender);
        stakedAmount[msg.sender] = staked - amount;

        stakingToken.safeTransfer(msg.sender, amount);

        emit Unstaked(msg.sender, amount);
    }

    /**
     * @notice Claim all pending rewards.
     * @dev Rewards are paid out from the pool's token balance (reward reserve).
     */
    function claimRewards() external nonReentrant whenNotPaused {
        _updateRewards(msg.sender);
        uint256 rewards = rewardDebt[msg.sender];
        require(rewards > 0, "No rewards");

        rewardDebt[msg.sender] = 0;
        stakingToken.safeTransfer(msg.sender, rewards);

        emit RewardsClaimed(msg.sender, rewards);
    }

    /**
     * @notice Get the staked amount for `user`.
     * @param user Address to query.
     * @return Amount staked by the address.
     */
    function getStakedAmount(address user) external view returns (uint256) {
        return stakedAmount[user];
    }

    /**
     * @notice Get the pending rewards for `user` (including unaccounted time since last update).
     * @param user Address to query.
     * @return Pending rewards amount.
     */
    function getPendingRewards(address user) external view returns (uint256) {
        uint256 last = lastUpdateTime[user];
        if (last == 0) return rewardDebt[user];

        uint256 staked = stakedAmount[user];
        if (staked == 0) return rewardDebt[user];

        uint256 dt = block.timestamp - last;
        uint256 accrued = (staked * rewardRatePerSecond * dt) / 1e18;
        return rewardDebt[user] + accrued;
    }

    /**
     * @notice Update a user's rewards accounting up to the current block timestamp.
     * @dev Stores rewards in `rewardDebt` and updates `lastUpdateTime`.
     * @param user Address whose rewards should be updated.
     */
    function _updateRewards(address user) internal {
        uint256 last = lastUpdateTime[user];
        uint256 nowTs = block.timestamp;

        if (last == 0) {
            lastUpdateTime[user] = nowTs;
            return;
        }

        uint256 staked = stakedAmount[user];
        if (staked > 0) {
            uint256 dt = nowTs - last;
            if (dt > 0) {
                uint256 accrued = (staked * rewardRatePerSecond * dt) / 1e18;
                rewardDebt[user] += accrued;
            }
        }

        lastUpdateTime[user] = nowTs;
    }
}

