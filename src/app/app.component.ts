import { Component } from '@angular/core';
import { BigNumber, Contract, ethers, utils } from 'ethers';
import { ExternalProvider } from "@ethersproject/providers";
//import contractJson from "../assets/MyToken.json";

const LOTTERY_ADDRESS = '0xAF61e280930221c6584F23bFf29E1ea8e98a94e6';
const TOKEN_ADDRESS = '0xE4d7972Ac450948F1a6DCB29DCf3281232C718b3';

// Metamask will inject the ethereum object to DOM
declare global {
  interface Window {
    ethereum: ExternalProvider;
  }
}

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  provider: ethers.providers.Web3Provider
  blockNumber: number | string | undefined;
  signer: ethers.providers.JsonRpcSigner | undefined;
  userAddress: string | undefined;
  userBalance: number | undefined;
  userTokenBalance: number | undefined;
  tokenContractAddress: string | undefined;
  tokenContract: Contract | undefined;
  lotteryContractAddress: string | undefined;
  lotteryContract: Contract | undefined;
  
  constructor() {
    this.provider = new ethers.providers.Web3Provider(window.ethereum, 'goerli');
    this.tokenContractAddress = TOKEN_ADDRESS;
    this.lotteryContractAddress = LOTTERY_ADDRESS;
  }

  syncBlock() {
    this.blockNumber = 'Loading...';
    this.provider.getBlock('latest').then((block) => {
      this.blockNumber = block.number;
    });
    this.getTokenInfo();
  }
  
  getTokenInfo() {
    // if (!this.tokenContractAddress) return;
    // this.tokenContract = new Contract(
    //   this.tokenContractAddress,
    //   tokenJson.abi,
    //   this.signer ?? this.provider
    // )
    // this.tokenContract['totalSupply']().then((tokenSupplyBN: BigNumber) => {
    //   const tokenSupplyStr = utils.formatEther(tokenSupplyBN);
    // });
  }

  clearBlock() {
    this.blockNumber = undefined;
  }

  connectWallet() {
    // Request the signer to connect
    this.provider.send("eth_requestAccounts", []).then(() => {
      this.signer = this.provider.getSigner();
      // query account balance
      this.signer.getBalance().then((balanceBN) => {
        const balanceStr = utils.formatEther(balanceBN);
        this.userBalance = parseFloat(balanceStr);
      });
      // get the signer address
      this.signer.getAddress().then((address) => {
        this.userAddress = address;
        // query LTO balance 
        // this.tokenContract?.['balanceOf'](this.userAddress).then((tokenBalanceBN: BigNumber) => {
        //   const tokenBalaceStr = utils.formatEther(tokenBalanceBN);
        //   this.userTokenBalance = parseFloat(tokenBalaceStr);
        // });
      });
    });
  }
  
}
