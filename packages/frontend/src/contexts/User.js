import { createContext } from "react";
import { ethers } from "ethers";
import { makeAutoObservable } from "mobx";
import { ZkIdentity, Strategy, hash1, stringifyBigInts } from "@unirep/utils";
import { UserState, schema } from "@unirep/core";
import { MemoryConnector } from "anondb/web";
import { constructSchema } from "anondb/types";
import {
  provider,
  UNIREP_ADDRESS,
  TWITTER_ADDRESS,
  GITHUB_ADDRESS,
  SERVER,
  UNIREP_ABI,
} from "../config";
import prover from "./prover";
import Wait from "../utils/wait";
import poseidon from "poseidon-lite";

class User {
  userState = null;
  id;
  currentEpoch;
  latestTransitionedEpoch;
  hasSignedUp = false;
  data = [];
  provableData = [];

  constructor() {
    makeAutoObservable(this);
    this.load();
  }

  async load() {
    const id = localStorage.getItem("id");
    const identity = new ZkIdentity(
      id ? Strategy.SERIALIZED : Strategy.RANDOM,
      id
    );
    if (!id) {
      localStorage.setItem("id", identity.serializeIdentity());
    }
    this.id = identity.serializeIdentity();

    const db = new MemoryConnector(constructSchema(schema)); // not used in the beta version??
    const userState = new UserState({
      db,
      provider,
      prover,
      unirepAddress: UNIREP_ADDRESS,
      attesterId: TWITTER_ADDRESS,
      _id: identity,
    });
    await userState.sync.start();
    this.userState = userState;
    await userState.waitForSync();
    this.hasSignedUp = await userState.hasSignedUp();
    await this.loadReputation();
    this.latestTransitionedEpoch =
      await this.userState.latestTransitionedEpoch();
  }

  get fieldCount() {
    // what is this?
    return this.userState?.sync.settings.fieldCount;
  }

  get sumFieldCount() {
    // what is this??
    return this.userState?.sync.settings.sumFieldCount;
  }

  epochKey(nonce) {
    if (!this.userState) return "0x";
    const epoch = this.userState.sync.calcCurrentEpoch();
    const keys = this.userState.getEpochKeys(epoch);
    const key = keys[nonce];
    return `0x${key.toString(16)}`;
  }

  async loadReputation() {
    this.data = await this.userState.getData();
    this.provableData = await this.userState.getProvableData();
  }

  async signup(platform, access_token) {
    for (var i = 0; i < 10; i++) {
      if (this.userState) break;
      await Wait(1000);
    }

    if (!this.userState) throw new Error("userState is undefined");

    const attesterId =
      platform === "twitter"
        ? TWITTER_ADDRESS
        : platform === "github"
        ? GITHUB_ADDRESS
        : undefined;
    if (!attesterId) {
      throw new Error("You are not signing up through available web2 service.");
    }

    localStorage.setItem(`${platform}_access_token`, access_token);

    const unirepContract = new ethers.Contract(
      UNIREP_ADDRESS,
      UNIREP_ABI,
      provider
    );
    const currentEpoch = Number(
      await unirepContract.attesterCurrentEpoch(attesterId)
    );
    const signupProof = await this.userState.genUserSignUpProof({
      epoch: currentEpoch,
    });

    const data = await fetch(`${SERVER}/api/signup`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        publicSignals: signupProof.publicSignals,
        proof: signupProof.proof,
        attesterId,
      }),
    }).then((r) => r.json());
    if (data.error) {
      throw new Error(data.error.toString());
    }

    await provider.waitForTransaction(data.hash);
    await this.userState.waitForSync();
    this.hasSignedUp = await this.userState.hasSignedUp();
    this.latestTransitionedEpoch = this.userState.sync.calcCurrentEpoch();
  }

  async requestReputation(reqData, epkNonce) {
    // check data change availablity
    for (const key of Object.keys(reqData)) {
      if (reqData[key] === "") {
        delete reqData[key];
        continue;
      }
      if (+key > this.sumFieldCount && +key % 2 !== this.sumFieldCount % 2) {
        // what is this for ?????
        throw new Error("Cannot change timestamp field");
      }
    }

    // gen proof
    const epochKeyProof = await this.userState.genEpochKeyProof({
      nonce: epkNonce,
    });

    const data = await fetch(`${SERVER}/api/request`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify(
        stringifyBigInts({
          reqData,
          publicSignals: epochKeyProof.publicSignals,
          proof: epochKeyProof.proof,
        })
      ),
    }).then((r) => r.json());
    await provider.waitForTransaction(data.hash);
    await this.userState.waitForSync();
    await this.loadReputation();
  }

  async stateTransition() {
    // check if previous data has been sealed
    const sealed = await this.userState.sync.isEpochSealed(
      await this.userState.latestTransitionedEpoch()
    );
    if (!sealed) {
      // how to cause this error??? where will it call sealData???
      throw new Error("From epoch is not yet sealed");
    }

    // gen proof
    await this.userState.waitForSync();
    const signupProof = await this.userState.genUserStateTransitionProof();
    const data = await fetch(`${SERVER}/api/transition`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        publicSignals: signupProof.publicSignals,
        proof: signupProof.proof,
      }),
    }).then((r) => r.json());
    await provider.waitForTransaction(data.hash);
    await this.userState.waitForSync();
    await this.loadReputation();
    this.latestTransitionedEpoch =
      await this.userState.latestTransitionedEpoch();
  }

  async proveReputation(minRep = 0, _graffitiPreImage = 0) {
    let graffitiPreImage = _graffitiPreImage;
    if (typeof graffitiPreImage === "string") {
      graffitiPreImage = `0x${Buffer.from(_graffitiPreImage).toString("hex")}`;
    }
    const reputationProof = await this.userState.genProveReputationProof({
      epkNonce: 0,
      minRep: Number(minRep),
      graffitiPreImage,
    });
    return { ...reputationProof, valid: await reputationProof.verify() };
  }

  async getRep(platform) {
    for (var i = 0; i < 10; i++) {
      if (this.userState) break;
      await Wait(1000);
    }

    if (!this.userState) throw new Error("userState is undefined");

    const attesterId =
      platform === "twitter"
        ? TWITTER_ADDRESS
        : platform === "github"
        ? GITHUB_ADDRESS
        : undefined;
    if (!attesterId) {
      throw new Error("You are not signing up through available web2 service.");
    }

    const access_token = localStorage.getItem(`${platform}_access_token`);

    // gen epochKeyProof
    const unirepContract = new ethers.Contract(
      UNIREP_ADDRESS,
      UNIREP_ABI,
      provider
    );
    const currentEpoch = Number(
      await unirepContract.attesterCurrentEpoch(attesterId)
    );
    const epochKeyProof = await this.userState.genEpochKeyProof({
      nonce: 0,
      epoch: currentEpoch,
    });

    const data = await fetch(`${SERVER}/api/request`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify(
        stringifyBigInts({
          publicSignals: epochKeyProof.publicSignals,
          proof: epochKeyProof.proof,
          access_token,
          attester: platform,
          attesterId,
          currentData: this.data, // TODO: should be changed to proof
        })
      ),
    }).then((r) => r.json());
    await provider.waitForTransaction(data.hash);
    await this.userState.waitForSync();
    await this.loadReputation();
  }
}

export default createContext(new User());
