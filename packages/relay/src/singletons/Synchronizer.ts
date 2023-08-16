import { ethers } from "ethers";
import { TransactionDB, DB } from "anondb";
import { Synchronizer } from "@unirep/core";
import { Prover } from "@unirep/circuits";
import UNIREP_TWITTER_ABI from "@unirep-app/contracts/abi/UnirepTwitter.json";
import UNIREP_GITHUB_ABI from "@unirep-app/contracts/abi/UnirepGithub.json";
import { provider, TWITTER_ADDRESS, GITHUB_ADDRESS } from "../config";
import { Title } from "../types";

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

  constructor(
    db: DB,
    provider: ethers.providers.Provider,
    unirepAddress: string
  ) {
    super({ db, provider, unirepAddress });
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
    const transactionHash = event.transactionHash;
    const epochKey = decodedData.epochKey.toString();
    const data = decodedData.data.map((d) => Number(d));
    const attesterId = event.address;

    console.log("transactionHash:", transactionHash);
    console.log("decodedData.data:", data);
    console.log("decodedData.epochKey:", epochKey);
    console.log("decodedData.attesterId:", attesterId);

    const findRankingData = await this.db.findOne("RankingData", {
      where: {
        epochKey,
        title: Title.twitter,
        attesterId,
      },
    });

    if (findRankingData) {
      db.update("RankingData", {
        where: {
          _id: findRankingData._id,
          epochKey,
          title: Title.twitter,
          attesterId,
        },
        update: {
          data: data[0] - data[1],
          transactionHash,
        },
      });
    } else {
      db.create("RankingData", {
        title: Title.twitter,
        data: data[0] - data[1],
        attesterId,
        transactionHash,
        epochKey,
      });
    }
  }

  async handleSubmitGithubDataProof({
    event,
    db,
    decodedData,
  }: EventHandlerArgs) {
    const transactionHash = event.transactionHash;
    const epochKey = decodedData.epochKey.toString();
    const data = decodedData.data.map((d) => Number(d));
    const attesterId = event.address;

    console.log("transactionHash:", transactionHash);
    console.log("decodedData.data:", data);
    console.log("decodedData.epochKey:", epochKey);
    console.log("decodedData.attesterId:", attesterId);

    const findStarsData = await this.db.findOne("RankingData", {
      where: {
        epochKey,
        title: Title.githubStars,
        attesterId,
      },
    });
    const findFollowersData = await this.db.findOne("RankingData", {
      where: {
        epochKey,
        title: Title.githubFollowers,
        attesterId,
      },
    });

    if (findStarsData) {
      db.update("RankingData", {
        where: {
          _id: findStarsData._id,
          epochKey,
          title: Title.githubStars,
          attesterId,
        },
        update: {
          data: data[2] - data[3],
          transactionHash,
        },
      });
    } else {
      db.create("RankingData", {
        title: Title.githubStars,
        data: data[2] - data[3],
        attesterId,
        transactionHash,
        epochKey,
      });
    }

    if (findFollowersData) {
      db.update("RankingData", {
        where: {
          _id: findFollowersData._id,
          epochKey,
          title: Title.githubFollowers,
          attesterId,
        },
        update: {
          data: data[0] - data[1],
          transactionHash,
        },
      });
    } else {
      db.create("RankingData", {
        title: Title.githubFollowers,
        data: data[0] - data[1],
        attesterId,
        transactionHash,
        epochKey,
      });
    }
  }
}
