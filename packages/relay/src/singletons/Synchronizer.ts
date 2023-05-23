import { ethers } from "ethers";
import { TransactionDB, DB } from "anondb";
import { Synchronizer } from "@unirep/core";
import { Prover } from "@unirep/circuits";
import UNIREP_TWITTER_ABI from "@unirep-app/contracts/abi/UnirepTwitter.json";
import UNIREP_GITHUB_ABI from "@unirep-app/contracts/abi/UnirepGithub.json";
import { provider, TWITTER_ADDRESS, GITHUB_ADDRESS } from "../config";

type EventHandlerArgs = {
  event: ethers.Event;
  decodedData: { [key: string]: any };
  db: TransactionDB;
};

// contracts
const twitterContract = new ethers.Contract(
  TWITTER_ADDRESS,
  UNIREP_TWITTER_ABI,
  provider
);
const githubContract = new ethers.Contract(
  GITHUB_ADDRESS,
  UNIREP_GITHUB_ABI,
  provider
);

export default class AppSynchronizer extends Synchronizer {
  appContracts: ethers.Contract[] = [];

  constructor(db: DB, provider, unirepAddress: string, prover: Prover) {
    super({ db, provider, unirepAddress, prover });
  }

  /* override */
  get contracts() {
    return {
      ...super.contracts,
      [TWITTER_ADDRESS]: {
        contract: twitterContract,
        eventNames: ["SubmitTwitterDataProof"],
      },
      [GITHUB_ADDRESS]: {
        contract: githubContract,
        eventNames: ["SubmitGithubDataProof"],
      },
    };
  }

  /*
   * event handlers
   */
  async handleSubmitTwitterDataProof({
    event,
    db,
    decodedData,
  }: EventHandlerArgs) {
    /* need to store the data with epoch key to db */
    const transactionHash = event.transactionHash;
    console.log(event);
    console.log(transactionHash);
  }

  async handleSubmitGithubDataProof({
    event,
    db,
    decodedData,
  }: EventHandlerArgs) {
    /* need to store the data with epoch key to db */
    const transactionHash = event.transactionHash;
    console.log(event);
    console.log(transactionHash);
  }
}
