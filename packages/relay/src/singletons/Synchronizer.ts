import { Synchronizer } from "@unirep/core";
import { Prover } from "@unirep/circuits";
import { ethers } from "ethers";
import { TransactionDB, DB } from "anondb";

type EventHandlerArgs = {
  event: ethers.Event;
  decodedData: { [key: string]: any };
  db: TransactionDB;
};

export default class AppSynchronizer extends Synchronizer {
  appContracts: ethers.Contract[] = [];

  constructor(
    db: DB,
    provider,
    unirepAddress: string,
    prover: Prover,
    appContracts: ethers.Contract[]
  ) {
    super({ db, provider, unirepAddress, prover });
    this.appContracts = appContracts;
  }

  /* override */
  get contracts() {
    let ret = { ...super.contracts };
    if (this.appContracts) {
      this.appContracts.map((c) => {
        ret = {
          ...ret,
          [c.address]: {
            contract: c,
            eventNames: ["SubmitDataProof"],
          },
        };
      });
    }
    return ret;
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
