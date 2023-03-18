import { Component } from '@angular/core';
import { BigNumber, Contract, ethers, utils } from 'ethers';
import { ExternalProvider } from "@ethersproject/providers";
import lotteryJson from "../assets/Lottery.json";
import tokenJson from "../assets/LotteryToken.json";

const LOTTERY_ADDRESS = '0x21cdb3376F8a76EEa8bcB4E210Ca0c8e0916244f';
const TOKEN_ADDRESS = '0x177B4B42D37ae2e0691965f57669347f4F0A50d4';

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
  tokenRatio: number | undefined;
  betPrice: number | undefined;
  betFee: number | undefined;
  possibleBets: number | undefined;
  betsClosingTime: Date | undefined;
  
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
    this.getTokenContract();
    this.getLottoContract();
  }
  
  getTokenContract() {
    if (!this.tokenContractAddress) return;
    this.tokenContract = new Contract(
      this.tokenContractAddress,
      tokenJson.abi,
      this.signer ?? this.provider
    );
  }

  getLottoContract() {
    if (!this.lotteryContractAddress) return;
    this.lotteryContract = new Contract(
      this.lotteryContractAddress,
      lotteryJson.abi,
      this.signer ?? this.provider
    );
    this.getBettingInfo();
  }

  clearBlock() {
    this.blockNumber = undefined;
  }

  connectWallet() {
    // Request the signer to connect
    this.provider.send("eth_requestAccounts", []).then(() => {
      this.signer = this.provider.getSigner();
      this.getUserEthBalance();
      // get the signer address
      this.signer.getAddress().then((address) => {
        this.userAddress = address;
        // query LTO balance
        this.getUserTokenBalance(); 
      });
    });
  }

  getUserEthBalance() {
    if(!this.signer) return;
    this.signer.getBalance().then((balanceBN) => {
      const balanceStr = utils.formatEther(balanceBN);
      this.userBalance = parseFloat(balanceStr);
    });
  }

  getUserTokenBalance() {
    this.tokenContract?.['balanceOf'](this.userAddress).then((tokenBalanceBN: BigNumber) => {
      const tokenBalaceStr = utils.formatEther(tokenBalanceBN);
      this.userTokenBalance = parseFloat(tokenBalaceStr);
    });
  }

  getBettingInfo() {
    this.lotteryContract?.['purchaseRatio']().then((tokenRatioBN: BigNumber) => {
      const tokenRatioStr = tokenRatioBN.toString();
      this.tokenRatio = parseFloat(tokenRatioStr);
      this.calcPossibleBets();
    });
    this.lotteryContract?.['betPrice']().then((betPriceBN: BigNumber) => {
      const betPriceStr = utils.formatEther(betPriceBN);
      this.betPrice = parseFloat(betPriceStr);
      this.calcPossibleBets();
    });
    this.lotteryContract?.['betFee']().then((betFeeBN: BigNumber) => {
      const betFeeStr = utils.formatEther(betFeeBN);
      this.betFee = parseFloat(betFeeStr);
      this.calcPossibleBets();
    });
    this.lotteryContract?.['betsClosingTime']().then((betsClosingTimeBN: BigNumber) => {
      this.betsClosingTime = new Date(betsClosingTimeBN.toNumber() * 1000);
      this.calcPossibleBets();
    });
  }

  calcPossibleBets() {
    if(!this.userTokenBalance || !this.betFee || ! this.betPrice) return;
    this.possibleBets = Math.floor(this.userTokenBalance / (this.betPrice + this.betFee));
  }

  purchaseTokens(amount: string) {
    const tokens = parseFloat(amount);
    if(Number.isNaN(tokens) || tokens <= 0 || !this.signer || !this.tokenRatio) return;
    this.lotteryContract?.connect(this.signer)['purchaseTokens']({
      value: ethers.utils.parseEther(amount).div(this.tokenRatio),
    }).then((tx: ethers.ContractTransaction) => {
      tx.wait().then((receipt: ethers.ContractReceipt) => {
        this.getUserEthBalance();
        this.getUserTokenBalance();
        this.getBettingInfo();
      });
    });
  }

  returnTokens(amount: string) {
    const tokens = parseFloat(amount);
    if(Number.isNaN(tokens) || tokens <= 0 || !this.signer) return;
    this.tokenContract?.connect(this.signer)['approve'](this.lotteryContractAddress, ethers.utils.parseEther(amount))
      .then((approveTx: ethers.ContractTransaction) => {
        approveTx.wait().then((receipt: ethers.ContractReceipt) => {
          if(!this.signer) return;  
          this.lotteryContract?.connect(this.signer)['returnTokens'](ethers.utils.parseEther(amount))
            .then((returnTx: ethers.ContractTransaction) => {
              returnTx.wait().then((receipt: ethers.ContractReceipt) => {
                this.getUserEthBalance();
                this.getUserTokenBalance();
                this.getBettingInfo();
              });
            });
        });
      });  
  }

  bet() {
    if(!this.signer || !this.betFee || !this.betPrice) return;
    const price = ethers.utils.parseEther(this.betPrice.toString());
    const fee = ethers.utils.parseEther(this.betFee.toString());
    const cost = price.add(fee);
    // Unsure why using the "cost" variable as the amount in the approve transaction results in an insufficient balance
    this.tokenContract?.connect(this.signer)['approve'](this.lotteryContractAddress, ethers.constants.MaxUint256)
      .then((approveTx: ethers.ContractTransaction) => {
        approveTx.wait().then((receipt: ethers.ContractReceipt) => {
          if(!this.signer) return;
          this.lotteryContract?.connect(this.signer)['bet']()
            .then((betTx: ethers.ContractTransaction) => {
              betTx.wait().then((receipt: ethers.ContractReceipt) => {
                this.getUserEthBalance();
                this.getUserTokenBalance();
                this.getBettingInfo();
              });
            });
        });
      });
  }

}
