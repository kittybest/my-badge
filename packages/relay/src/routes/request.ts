import { ethers } from "ethers";
import { Express } from "express";
import { DB } from "anondb/node";
import { Synchronizer } from "@unirep/core";
import fetch from "node-fetch";
import { EpochKeyProof, Prover } from "@unirep/circuits";
import TransactionManager from "../singletons/TransactionManager";
import { UNIREP_ADDRESS, provider } from "../config";

import UNIREP_ABI from "@unirep/contracts/artifacts/contracts/Unirep.sol/Unirep.json";
import UNIREP_TWITTER_ABI from "@unirep-app/contracts/abi/UnirepTwitter.json";
import UNIREP_GITHUB_ABI from "@unirep-app/contracts/abi/UnirepGithub.json";

async function checkTwitterData(access_token: any) {
  console.log("twitter token:", access_token);
  try {
    const user: any = await fetch(
      "https://api.twitter.com/2/users/me?user.fields=public_metrics",
      {
        headers: {
          authorization: `Bearer ${access_token}`,
        },
      }
    ).then((r) => r.json());
    return { followers: user.data.public_metrics.followers_count as number };
  } catch (e: any) {
    console.log(e);
    return { error: e };
  }
}

async function checkGithubData(access_token: any) {
  console.log("github token: ", access_token);
  try {
    const user: any = await fetch("https://api.github.com/user", {
      headers: {
        authorization: `token ${access_token}`,
      },
    }).then((r) => r.json());

    const myRepos: any = await fetch("https://api.github.com/user/repos", {
      headers: {
        authorization: `Bearer ${access_token}`,
      },
    }).then((r) => r.json());
    let stars: number = 0;
    myRepos.map((repo: any) => {
      stars += repo.stargazers_count;
    });

    return { followers: user.followers as number, stars };
  } catch (e: any) {
    console.log(e);
    return { error: e };
  }
}

export default (
  app: Express,
  db: DB,
  synchronizer: Synchronizer,
  prover: Prover
) => {
  app.post("/api/request", async (req, res) => {
    try {
      const {
        publicSignals,
        proof,
        attester,
        attesterId,
        access_token,
        currentData,
      } = req.body;

      let reqData = [0];
      let abi: any;
      if (attester === "twitter") {
        // also affect APP_ADDRESS
        const { followers, error } = await checkTwitterData(access_token); // followers addition, followers subtraction
        if (error) {
          res
            .status(400)
            .json({ error: "Something's wrong while getting twitter data." });
        }

        const diff = (followers ?? 0) - (currentData[0] - currentData[1]);
        if (diff >= 0) {
          reqData = [diff];
        } else {
          reqData = [0, -diff];
        }
        abi = UNIREP_TWITTER_ABI;
      } else if (attester === "github") {
        const { followers, stars, error } = await checkGithubData(access_token); // followers addition, followers subtraction, stars addition, stars subtraction
        if (error) {
          res
            .status(400)
            .json({ error: "Something's wrong while getting github data." });
        }

        const diff1 = (followers ?? 0) - (currentData[0] - currentData[1]);
        if (diff1 >= 0) {
          reqData = [diff1, 0];
        } else {
          reqData = [0, -diff1];
        }
        const diff2 = (stars ?? 0) - (currentData[2] - currentData[3]);
        if (diff2 >= 0) {
          reqData.push(diff2);
        } else {
          reqData.push(0);
          reqData.push(-diff2);
        }
        abi = UNIREP_GITHUB_ABI;
      }
      console.log("reqData:", reqData);

      const epochKeyProof: EpochKeyProof = new EpochKeyProof(
        publicSignals,
        proof,
        prover
      );

      if (
        epochKeyProof.attesterId.toString() !== BigInt(attesterId).toString()
      ) {
        res.status(400).json({ error: "Attester Id does not match." });
        return;
      }

      const valid = await epochKeyProof.verify();
      if (!valid) {
        res.status(400).json({ error: "Invalid proof" });
        return;
      }
      const unirepContract = new ethers.Contract(
        UNIREP_ADDRESS,
        UNIREP_ABI.abi,
        provider
      );
      const epoch = Number(
        await unirepContract.attesterCurrentEpoch(attesterId)
      );
      if (Number(epochKeyProof.epoch) !== epoch) {
        res.status(400).json({
          error: `Wrong epoch: should be ${epoch}, but it is ${Number(
            epochKeyProof.epoch
          )} in the proof.`,
        });
        return;
      }

      if (!abi) {
        res.status(400).json({ error: "attester does not matches " });
        return;
      }

      const appContract = new ethers.Contract(attesterId, abi);
      const keys = Object.keys(reqData);
      let calldata: string = "";
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
        attesterId,
        calldata
      );
      res.json({ hash });
    } catch (error: any) {
      res.status(500).json({ error });
    }
  });
};
