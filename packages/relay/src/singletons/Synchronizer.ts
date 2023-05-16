import { ethers } from "ethers";
import { TransactionDB, DB } from "anondb";
import { Synchronizer } from "@unirep/core";
import { Prover } from "@unirep/circuits";
import UNIREP_APP_ABI from "@unirep-app/contracts/abi/UnirepApp.json";
import { provider, TWITTER_ADDRESS, GITHUB_ADDRESS } from "../config";

type EventHandlerArgs = {
  event: ethers.Event;
  decodedData: { [key: string]: any };
  db: TransactionDB;
};

// contracts
const twitterContract = new ethers.Contract(
  TWITTER_ADDRESS,
  UNIREP_APP_ABI,
  provider
);
const githubContract = new ethers.Contract(
  GITHUB_ADDRESS,
  UNIREP_APP_ABI,
  provider
);

export default class AppSynchronizer extends Synchronizer {
  appContracts: ethers.Contract[] = [];

  constructor(db: DB, provider, unirepAddress: string, prover: Prover) {
    super({ db, provider, unirepAddress, prover });
  }

  /* override */
  // if add github contract, it will show that Error: duplicate event name registered "SubmitDataProof" --> how to solve this?
  get contracts() {
    return {
      ...super.contracts,
      [TWITTER_ADDRESS]: {
        contract: twitterContract,
        eventNames: ["SubmitDataProof"],
      },
      [GITHUB_ADDRESS]: {
        contract: githubContract,
        eventNames: ["SubmitDataProof"],
      },
    };
  }

  /*
  /* event handlers 
   */
  async handleSubmitDataProof({ event, db, decodedData }: EventHandlerArgs) {
    /* need to store the data with epoch key to db */
    const transactionHash = event.transactionHash;
    console.log(event);
    console.log(transactionHash);
  }
}
