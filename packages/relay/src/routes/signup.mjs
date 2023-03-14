import { SignupProof } from "@unirep/circuits";
import { ethers } from "ethers";
import TransactionManager from "../singletons/TransactionManager.mjs";
import { createRequire } from "module";
import { UNIREP_ADDRESS, provider } from "../config.mjs";
const require = createRequire(import.meta.url);
const UnirepApp = require("@unirep-app/contracts/artifacts/contracts/UnirepApp.sol/UnirepApp.json");
const Unirep = require("@unirep/contracts/artifacts/contracts/Unirep.sol/Unirep.json");

export default ({ app, db, synchronizer }) => {
  app.post("/api/signup", async (req, res) => {
    try {
      const { publicSignals, proof, attesterId } = req.body;
      const signupProof = new SignupProof(
        publicSignals,
        proof,
        synchronizer.prover
      );
      const valid = await signupProof.verify();
      if (!valid) {
        res.status(400).json({ error: "Invalid proof" });
        return;
      }
      const unirepContract = new ethers.Contract(
        UNIREP_ADDRESS,
        Unirep.abi,
        provider
      );
      const currentEpoch = Number(
        await unirepContract.attesterCurrentEpoch(attesterId)
      );

      if (currentEpoch !== Number(BigInt(signupProof.epoch))) {
        res.status(400).json({
          error: `Wrong epoch: current epoch should be ${currentEpoch}, but the epoch in your proof is ${Number(
            BigInt(signupProof.epoch)
          )}`,
        });
        return;
      }
      // make a transaction lil bish
      const appContract = new ethers.Contract(attesterId, UnirepApp.abi);
      // const contract =
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
