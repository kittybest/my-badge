import { ethers } from "ethers";
import { EpochKeyProof } from "@unirep/circuits";
import { APP_ADDRESS } from "../config.mjs";
import TransactionManager from "../singletons/TransactionManager.mjs";
import { createRequire } from "module";
import fetch from "node-fetch";

const require = createRequire(import.meta.url);
const UnirepApp = require("@unirep-app/contracts/artifacts/contracts/UnirepApp.sol/UnirepApp.json");

async function checkTwitterData(access_token) {
  try {
    const user = await fetch(
      "https://api.twitter.com/2/users/me?user.fields=public_metrics",
      {
        headers: {
          authorization: `Bearer ${access_token}`,
        },
      }
    ).then((r) => r.json());
    return [user.data.public_metrics.followers_count, 0];
  } catch (e) {
    console.log(e);
    return 0;
  }
}

async function checkGithubData(access_token) {
  console.log("github token: ", access_token);
  try {
    const user = await fetch("https://api.github.com/user", {
      headers: {
        authorization: `token ${access_token}`,
      },
    }).then((r) => r.json());

    const starred = await fetch("https://api.github.com/user/starred", {
      headers: {
        authorization: `Bearer ${access_token}`,
      },
    }).then((r) => r.json());
    let stars = 0;
    starred.map((repo) => {
      stars += repo.stargazers_count;
    });

    return [user.followers, 0, stars, 0];
  } catch (e) {
    console.log(e);
    return [0];
  }
}

export default ({ app, db, synchronizer }) => {
  app.post("/api/request", async (req, res) => {
    try {
      const { publicSignals, proof, attester, access_token } = req.body;
      let reqData = [0];
      if (attester === "twitter") {
        // also affect APP_ADDRESS
        reqData = await checkTwitterData(access_token); // followers addition, followers subtraction
      } else if (attester === "github") {
        reqData = await checkGithubData(access_token); // followers addition, followers subtraction, stars addition, stars subtraction
      }

      const epochKeyProof = new EpochKeyProof(
        publicSignals,
        proof,
        synchronizer.prover
      );
      const valid = await epochKeyProof.verify();
      if (!valid) {
        res.status(400).json({ error: "Invalid proof" });
        return;
      }
      const epoch = await synchronizer.loadCurrentEpoch();
      const appContract = new ethers.Contract(APP_ADDRESS, UnirepApp.abi);

      const keys = Object.keys(reqData);
      let calldata;
      if (keys.length === 1) {
        calldata = appContract.interface.encodeFunctionData(
          "submitAttestation",
          [epochKeyProof.epochKey, epoch, keys[0], reqData[keys[0]]]
        );
      } else if (keys.length > 1) {
        calldata = appContract.interface.encodeFunctionData(
          "submitManyAttestations",
          [epochKeyProof.epochKey, epoch, keys, keys.map((k) => reqData[k])]
        );
      }

      const hash = await TransactionManager.queueTransaction(
        APP_ADDRESS,
        calldata
      );
      res.json({ hash });
    } catch (error) {
      res.status(500).json({ error });
    }
  });
};
