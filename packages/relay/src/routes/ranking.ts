import { Express } from "express";
import { ethers } from "ethers";
import { DB } from "anondb/node";
import { Synchronizer } from "@unirep/core";
import { DataProof } from "@unirep-app/circuits";
import { UNIREP_ADDRESS, provider } from "../config";
import TransactionManager from "../singletons/TransactionManager";

import UNIREP_ABI from "@unirep/contracts/artifacts/contracts/Unirep.sol/Unirep.json";
import UNIREPAPP_ABI from "@unirep-app/contracts/artifacts/contracts/UnirepApp.sol/UnirepApp.json";

export default (app: Express, db: DB, synchronizer: Synchronizer) => {
  // get my ranking
  app.get("/api/ranking", async (req, res) => {
    const { epochKeys } = req.query;
    try {
      // query recrods in the database --> sort --> return ranking
    } catch (error: any) {
      console.log("get ranking of", epochKeys, "error:", error);
      res.status(500).json({ error });
    }
  });

  // get top5 of certain platform
  app.get("/api/ranking/:attesterId", async (req, res) => {
    const attesterId = req.params.attesterId;
    try {
    } catch (error: any) {
      console.log("get", attesterId, "ranking error", error);
      res.status(500).json({ error });
    }
  });

  // upload data proof and publicSignals
  app.post("/api/ranking", async (req, res) => {
    try {
      const { publicSignals, proof, attesterId } = req.body;
      console.log("upload ranking data:", publicSignals);

      // make data proof
      const dataProof: DataProof = new DataProof(publicSignals, proof);

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
      const appContract = new ethers.Contract(attesterId, UNIREPAPP_ABI.abi);
      let calldata = appContract.interface.encodeFunctionData(
        "submitDataProof",
        [dataProof.publicSignals, dataProof.proof]
      );
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
