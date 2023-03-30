import { SignupProof } from "@unirep/circuits";
import { ethers } from "ethers";
import { Express } from "express";
import { DB } from "anondb/node";
import { Synchronizer } from "@unirep/core";
import TransactionManager from "../singletons/TransactionManager";
import { UNIREP_ADDRESS, provider } from "../config";
import UNIREP_ABI from "@unirep/contracts/artifacts/contracts/Unirep.sol/Unirep.json";
import UNIREPAPP_ABI from "@unirep-app/contracts/artifacts/contracts/UnirepApp.sol/UnirepApp.json";

export default (app: Express, db: DB, synchronizer: Synchronizer) => {
  app.post("/api/signup", async (req, res) => {
    try {
      const { publicSignals, proof, attesterId } = req.body;
      const signupProof: SignupProof = new SignupProof(
        publicSignals,
        proof,
        synchronizer.prover
      );
      if (signupProof.attesterId.toString() !== BigInt(attesterId).toString()) {
        res.status(400).json({ error: "Attester ID does not match." });
        return;
      }
      const valid = await signupProof.verify();
      if (!valid) {
        res.status(400).json({ error: "Invalid proof" });
        return;
      }
      const unirepContract = new ethers.Contract(
        UNIREP_ADDRESS,
        UNIREP_ABI.abi,
        provider
      );
      const currentEpoch = Number(
        await unirepContract.attesterCurrentEpoch(attesterId)
      );

      if (currentEpoch !== Number(signupProof.epoch)) {
        res.status(400).json({
          error: `Wrong epoch: current epoch should be ${currentEpoch}, but the epoch in your proof is ${Number(
            signupProof.epoch
          )}`,
        });
        return;
      }
      // make a transaction lil bish
      const appContract = new ethers.Contract(attesterId, UNIREPAPP_ABI.abi);
      const calldata = appContract.interface.encodeFunctionData("userSignUp", [
        signupProof.publicSignals,
        signupProof.proof,
      ]);
      const hash = await TransactionManager.queueTransaction(
        attesterId,
        calldata
      );
      res.json({ hash });
    } catch (error) {
      res.status(500).json({ error });
    }
  });
};
