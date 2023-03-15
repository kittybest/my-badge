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
  ATTESTERS,
  SERVER,
  UNIREP_ABI,
} from "../config";
import prover from "./prover";
import Wait from "../utils/wait";
import poseidon from "poseidon-lite";

class User {
  userStates = {}; // key: attesterId, value: { userState, currentEpoch, latestTransitionedEpoch, hasSignedUp, data, provableData }
  userState = null;
  id;
  fieldCount = -1;
  sumFieldCount = -1;
  hasSignedUp = false;

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

    for (const [platform, attesterId] of Object.entries(ATTESTERS)) {
      console.log("attester", platform, "with address", attesterId);
      const userState = new UserState({
        db,
        provider,
        prover,
        unirepAddress: UNIREP_ADDRESS,
        attesterId,
        _id: identity,
      });
      await userState.sync.start();

      if (this.fieldCount < 0) {
        this.fieldCount = userState.sync.settings.fieldCount;
      }
      if (this.sumFieldCount < 0) {
        this.sumFieldCount = userState.sync.settings.sumFieldCount;
      }

      await userState.waitForSync();
      const hasSignedUp = await userState.hasSignedUp();
      const latestTransitionedEpoch = await userState.latestTransitionedEpoch();
      const data = await userState.getData();
      const provableData = await userState.getProvableData();

      this.userStates[platform] = {
        userState,
        hasSignedUp,
        latestTransitionedEpoch,
        data,
        provableData,
      };
    }
    this.updateHasSignedUp();
  }

  async loadReputation(platform) {
    this.userStates[platform].data = await this.userStates[
      platform
    ].userState.getData();
    this.userStates[platform].provableData = await this.userStates[
      platform
    ].userState.getProvableData();
  }

  async waitForLoad(platform) {
    for (var i = 0; i < 10; i++) {
      if (this.userStates[platform]) break;
      await Wait(1000);
    }

    if (!this.userStates[platform]) throw new Error("userState is undefined");
  }

  updateHasSignedUp() {
    for (const [platform, us] of Object.entries(this.userStates)) {
      this.hasSignedUp = this.hasSignedUp || us.hasSignedUp;
    }
  }

  epochKey(platform, nonce) {
    if (!this.userStates[platform] || !this.userStates[platform].userState)
      return "0x";
    const epoch = this.userStates[platform].userState.sync.calcCurrentEpoch();
    const keys = this.userStates[platform].userState.getEpochKeys(epoch);
    const key = keys[nonce];
    return `0x${key.toString(16)}`;
  }

  async signup(platform, access_token) {
    /* Assign attesterId */
    const attesterId = ATTESTERS[platform];
    if (!attesterId) {
      throw new Error("You are not signing up through available web2 service.");
    }

    /* Wait for loading userStates */
    await this.waitForLoad(platform);

    /* Store access_token to local storage */
    localStorage.setItem(`${platform}_access_token`, access_token);

    /* Gen signupProof */
    const unirepContract = new ethers.Contract(
      UNIREP_ADDRESS,
      UNIREP_ABI,
      provider
    );
    const currentEpoch = Number(
      await unirepContract.attesterCurrentEpoch(attesterId)
    );
    const signupProof = await this.userStates[
      platform
    ].userState.genUserSignUpProof({
      epoch: currentEpoch,
    });

    /* Sign up to attester */
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
      throw new Error(JSON.stringify(data.error));
    }

    /* Update */
    await provider.waitForTransaction(data.hash);
    await this.userStates[platform].userState.waitForSync();
    this.userStates[platform].hasSignedUp = await this.userStates[
      platform
    ].userState.hasSignedUp();
    this.userStates[platform].latestTransitionedEpoch =
      this.userStates[platform].userState.sync.calcCurrentEpoch();
    this.updateHasSignedUp();
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
    /* Check attesterId and userState */
    const attesterId = ATTESTERS[platform];
    if (!attesterId) {
      throw new Error("You are not signing up through available web2 service.");
    }
    await this.waitForLoad(platform);

    /* Load access_token */
    const access_token = localStorage.getItem(`${platform}_access_token`);

    /* Gen epochKeyProof */
    const unirepContract = new ethers.Contract(
      UNIREP_ADDRESS,
      UNIREP_ABI,
      provider
    );
    const currentEpoch = Number(
      await unirepContract.attesterCurrentEpoch(attesterId)
    );
    const epochKeyProof = await this.userStates[
      platform
    ].userState.genEpochKeyProof({
      nonce: 0,
      epoch: currentEpoch,
    });

    /* Call API to calculate and receive reputation data */
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
          currentData: this.userStates[platform].data,
        })
      ),
    }).then((r) => r.json());
    await provider.waitForTransaction(data.hash);
    await this.userStates[platform].userState.waitForSync();
    await this.loadReputation(platform);
  }
}

export default createContext(new User());
