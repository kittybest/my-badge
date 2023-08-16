import { Express } from "express";
import { DB } from "anondb/node";
import { Synchronizer } from "@unirep/core";
import { UserStateTransitionProof, Prover } from "@unirep/circuits";
import TransactionManager from "../singletons/TransactionManager";

export default (
  app: Express,
  db: DB,
  synchronizer: Synchronizer,
  prover: Prover
) => {
  app.post("/api/transition", async (req, res) => {
    try {
      const { publicSignals, proof, attesterId } = req.body;
      const transitionProof = new UserStateTransitionProof(
        publicSignals,
        proof,
        prover
      );
      const valid = await transitionProof.verify();
      if (!valid) {
        res.status(400).json({ error: "Invalid proof" });
        return;
      }

      const calldata = synchronizer.unirepContract.interface.encodeFunctionData(
        "userStateTransition",
        [transitionProof.publicSignals, transitionProof.proof]
      );
      const hash = await TransactionManager.queueTransaction(
        synchronizer.unirepContract.address,
        calldata
      );
      res.json({ hash });
    } catch (error) {
      res.status(500).json({ error });
    }
  });
};
