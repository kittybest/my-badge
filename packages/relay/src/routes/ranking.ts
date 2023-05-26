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
import { Title } from "../types";

import UNIREP_ABI from "@unirep/contracts/artifacts/contracts/Unirep.sol/Unirep.json";
import UNIREP_TWITTER_ABI from "@unirep-app/contracts/abi/UnirepTwitter.json";
import UNIREP_GITHUB_ABI from "@unirep-app/contracts/abi/UnirepGithub.json";

export default (app: Express, db: DB, synchronizer: Synchronizer) => {
  app.get("/api/ranking/:title", async (req, res) => {
    const title = req.params.title;

    let _epochKeys: string[] = [];
    const { epochKeys } = req.query;
    if (epochKeys && typeof epochKeys === "string") {
      _epochKeys = epochKeys.split("_");
    }

    try {
      const rankings = await getRankingsByTitle(db, title);

      if (_epochKeys.length == 0) res.json({ rankings });
      else {
        let flag: boolean = false;
        for (let i = 0; i < rankings.length; i++) {
          if (_epochKeys.includes(rankings[i].epochKey)) {
            res.json({ ranking: i + 1 });
            flag = true;
            break;
          }
        }
        if (!flag) res.status(400).json({ error: "No related ranking." });
      }
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

async function getRankingsByTitle(db: DB, title: string | Title) {
  const data = await db.findMany("RankingData", {
    where: { title },
    orderBy: { createdAt: "asc", data: "desc" },
  });
  return data;
}
