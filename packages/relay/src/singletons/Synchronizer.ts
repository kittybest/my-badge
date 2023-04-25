import { Synchronizer } from "@unirep/core";
import { ethers } from "ethers";
import { TransactionDB } from "anondb";
import { TWITTER_ADDRESS, GITHUB_ADDRESS } from "../config";
import UNIREP_APP_ABI from "@unirep-app/contracts/abi/UnirepApp.json";

type EventHandlerArgs = {
  event: ethers.Event;
  decodedData: { [key: string]: any };
  db: TransactionDB;
};

export default class AppSynchronizer extends Synchronizer {
  twitterContract: ethers.Contract;
  githubContract: ethers.Contract;

  constructor({ db, provider, unirepAddress, prover }) {
    super({ db, provider, unirepAddress, prover });

    this.twitterContract = new ethers.Contract(
      TWITTER_ADDRESS,
      UNIREP_APP_ABI,
      provider
    );
    this.githubContract = new ethers.Contract(
      GITHUB_ADDRESS,
      UNIREP_APP_ABI,
      provider
    );
  }

  get contracts() {
    return {
      ...super.contracts,
      [this.twitterContract.address]: {
        contract: this.twitterContract,
        eventNames: ["SubmitDataProof"],
      },
      [this.githubContract.address]: {
        contract: this.githubContract,
        eventNames: ["SubmitDataProof"],
      },
    };
  }

  async handleDataProofSubmitted({ event, db, decodedData }: EventHandlerArgs) {
    const transactionHash = event.transactionHash;
    console.log(event);
    console.log(transactionHash);
  }
}
