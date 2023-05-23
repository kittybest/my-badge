import { Express } from "express";
import { ethers } from "ethers";
import { DB } from "anondb/node";
import { Synchronizer } from "@unirep/core";
import { DataProof } from "@unirep-app/circuits";
import {
  UNIREP_ADDRESS,
  provider,
  TWITTER_ADDRESS,
  GITHUB_ADDRESS,
} from "../config";
import TransactionManager from "../singletons/TransactionManager";

import UNIREP_ABI from "@unirep/contracts/artifacts/contracts/Unirep.sol/Unirep.json";
import UNIREP_TWITTER_ABI from "@unirep-app/contracts/abi/UnirepTwitter.json";
import UNIREP_GITHUB_ABI from "@unirep-app/contracts/abi/UnirepGithub.json";

export default (app: Express, db: DB, synchronizer: Synchronizer) => {
  // get my ranking
  app.get("/api/ranking", async (req, res) => {
    const { epochKeys } = req.query;
    if (!epochKeys) {
      res.status(400).json({ error: "You have not pass any epochKeys." });
      return;
    }
    if (typeof epochKeys !== "string") {
      res.status(400).json({
        error:
          "The epochKeys should be passed under the format [epochKey1]_[epochKey2]_[...]_[epochKeyN]",
      });
      return;
    }

    const _epochKeys = epochKeys.split("_");
    try {
      const rankings = await getRankingsByEpochKeys(_epochKeys, db);
      res.json({ rankings });
    } catch (error: any) {
      console.log("get ranking of", epochKeys, "error:", error);
      res.status(500).json({ error });
    }
  });

  // get top5 of certain platform
  app.get("/api/ranking/:title", async (req, res) => {
    const title = req.params.title;
    try {
      const rankings = await getRankingsByTitle(title, db);
      res.json({ rankings });
    } catch (error: any) {
      console.log("get", title, "ranking error", error);
      res.status(500).json({ error });
    }
  });

  // upload data proof and publicSignals
  app.post("/api/ranking", async (req, res) => {
    try {
      const { publicSignals, proof, attesterId, epochKey } = req.body;

      // make data proof
      const dataProof: DataProof = new DataProof(
        publicSignals,
        proof,
        synchronizer.prover
      );

      // check attesterId
      if (dataProof.attesterId.toString() !== BigInt(attesterId).toString()) {
        res.status(400).json({ error: "Attester Id does not match." });
        return;
      }

      // verify data proof
      const valid = await dataProof.verify();
      if (!valid) {
        res.status(400).json({ error: "Invalid proof" });
        return;
      }

      // check epoch matches or not
      const unirepContract = new ethers.Contract(
        UNIREP_ADDRESS,
        UNIREP_ABI.abi,
        provider
      );
      const epoch = Number(
        await unirepContract.attesterCurrentEpoch(attesterId)
      );

      if (Number(dataProof.epoch) !== epoch) {
        res.status(400).json({
          error: `Wrong epoch: should be ${epoch}, but it is ${Number(
            dataProof.epoch
          )} in the proof.`,
        });
        return;
      }

      // send data on chain
      let appContract: any;
      if (attesterId === TWITTER_ADDRESS)
        appContract = new ethers.Contract(attesterId, UNIREP_TWITTER_ABI);
      else if (attesterId === GITHUB_ADDRESS)
        appContract = new ethers.Contract(attesterId, UNIREP_GITHUB_ABI);

      const calldata = appContract.interface.encodeFunctionData(
        "submitDataProof",
        [dataProof.publicSignals, dataProof.proof]
      );

      if (!calldata) {
        res.status(500).json({ error: "attesterId does not match" });
        return;
      }

      const hash = await TransactionManager.queueTransaction(
        attesterId,
        calldata
      );

      res.json({ hash });
    } catch (error: any) {
      console.log("post ranking data error:", error);
      res.status(500).json({ error });
    }
  });
};

async function getRankingsByEpochKeys(epochKeys: string[], db: DB) {
  const twitterRankings = await getRankingsByTitle("twitter", db);
  const githubStarsRankings = await getRankingsByTitle("github_stars", db);
  const githubFollowersRankings = await getRankingsByTitle(
    "github_followers",
    db
  );
  let ret: number[] = [0, 0, 0];

  for (let i = 0; i < twitterRankings.length; i++) {
    if (epochKeys.includes(twitterRankings[i].epochKey)) {
      ret[0] = i + 1;
      break;
    }
  }
  for (let i = 0; i < githubStarsRankings.length; i++) {
    if (epochKeys.includes(githubStarsRankings[i].epochKey)) {
      ret[1] = i + 1;
      break;
    }
  }
  for (let i = 0; i < githubFollowersRankings.length; i++) {
    if (epochKeys.includes(githubFollowersRankings[i].epochKey)) {
      ret[2] = i + 1;
      break;
    }
  }
  return ret;
}

async function getRankingsByTitle(title: string, db: DB) {
  const data = await db.findMany("RankingData", {
    where: { title },
    orderBy: { createdAt: "asc", data: "desc" },
  });
  console.log("get rankings by", title, ", the data are", data);
  return data;
}
