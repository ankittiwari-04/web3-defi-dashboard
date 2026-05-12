// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title DeFiToken
 * @notice ERC-20 token for the DeFi Dashboard demo (Sepolia / local Hardhat).
 */
contract DeFiToken is ERC20, Ownable {
    /// @notice Emitted when `amount` tokens are minted to `to`.
    event TokensMinted(address indexed to, uint256 amount);

    /// @notice Emitted when `amount` tokens are burned by `from`.
    event TokensBurned(address indexed from, uint256 amount);

    /**
     * @notice Deploy the token and mint initial supply to the deployer.
     * @dev Initial supply is 1,000,000 DFT with 18 decimals.
     */
    constructor() ERC20("DeFi Token", "DFT") Ownable(msg.sender) {
        uint256 initialSupply = 1_000_000 * 10 ** decimals();
        _mint(msg.sender, initialSupply);
        emit TokensMinted(msg.sender, initialSupply);
    }

    /**
     * @notice Mint `amount` tokens to `to`.
     * @dev Only callable by the owner (typically the deployer or governance).
     * @param to Recipient of the minted tokens.
     * @param amount Amount of tokens to mint (in the smallest unit).
     */
    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
        emit TokensMinted(to, amount);
    }

    /**
     * @notice Burn `amount` tokens from the caller.
     * @param amount Amount of tokens to burn (in the smallest unit).
     */
    function burn(uint256 amount) external {
        _burn(msg.sender, amount);
        emit TokensBurned(msg.sender, amount);
    }
}

