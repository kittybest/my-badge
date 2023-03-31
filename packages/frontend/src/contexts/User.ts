import { createContext } from "react";
import { ethers } from "ethers";
import { makeAutoObservable } from "mobx";
import { ZkIdentity, Strategy, stringifyBigInts } from "@unirep/utils";
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

interface AppUserState {
  userState: UserState;
  hasSignedUp: boolean;
  latestTransitionedEpoch: number;
  data: bigint[];
  provableData: bigint[];
  attesterId: string;
  access_token: string;
}

const ATTESTERS: { [key: string]: string } = {
  twitter: TWITTER_ADDRESS,
  github: GITHUB_ADDRESS,
};

class User {
  userStates: { [key: string]: AppUserState } = {}; // key: attesterId, value: { userState, currentEpoch, latestTransitionedEpoch, hasSignedUp, data, provableData }
  id: string = "";
  fieldCount: number = -1;
  sumFieldCount: number = -1;
  hasSignedUp: boolean = false;

  constructor() {
    makeAutoObservable(this);
    this.load();
  }

  async load() {
    const id: string | null = localStorage.getItem("id");
    const identity = new ZkIdentity(
      id ? Strategy.SERIALIZED : Strategy.RANDOM,
      id ?? undefined
    );
    if (!id) {
      localStorage.setItem("id", identity.serializeIdentity());
    }
    this.id = identity.serializeIdentity();

    const db = new MemoryConnector(constructSchema(schema)); // not used in the beta version??

    for (const [platform, attesterId] of Object.entries(ATTESTERS)) {
      console.log("attester", platform, "with address", attesterId);
      const userState = new UserState(
        {
          db,
          provider,
          prover,
          unirepAddress: UNIREP_ADDRESS,
          attesterId: BigInt(attesterId),
          _id: identity,
        },
        identity
      );
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

      const access_token =
        localStorage.getItem(`${platform}_access_token`) ?? "";

      this.userStates[platform] = {
        userState,
        hasSignedUp,
        latestTransitionedEpoch,
        data,
        provableData,
        attesterId,
        access_token,
      };
    }
    this.updateHasSignedUp();
  }

  async loadReputation(platform: string) {
    this.userStates[platform].data = await this.userStates[
      platform
    ].userState.getData();
    this.userStates[platform].provableData = await this.userStates[
      platform
    ].userState.getProvableData();
  }

  async waitForLoad(platform: string) {
    for (var i = 0; i < 10; i++) {
      if (this.userStates[platform]) break;
      await Wait(1000);
    }

    if (!this.userStates[platform]) throw new Error("userState is undefined");
  }

  async login(id: string) {
    if (!id || id.length === 0) {
      throw new Error("You have not entered identity yet.");
    }
    const identity = new ZkIdentity(Strategy.SERIALIZED, id);
    localStorage.setItem("id", identity.serializeIdentity());
    await this.load();
  }

  updateHasSignedUp() {
    for (const [platform, us] of Object.entries(this.userStates)) {
      this.hasSignedUp = this.hasSignedUp || us.hasSignedUp;
    }
  }

  epochKey(platform: string, nonce: number) {
    if (!this.userStates[platform] || !this.userStates[platform].userState)
      return "0x";
    const epoch = this.userStates[platform].userState.sync.calcCurrentEpoch();
    const keys: BigInt | BigInt[] =
      this.userStates[platform].userState.getEpochKeys(epoch);
    const key = Array.isArray(keys) ? keys[nonce] : keys;
    return `0x${key.toString(16)}`;
  }

  async signup(platform: string, access_token: string) {
    /* Assign attesterId */
    const attesterId: string = ATTESTERS[platform];
    if (!attesterId) {
      throw new Error("You are not signing up through available web2 service.");
    }

    /* Wait for loading userStates */
    await this.waitForLoad(platform);

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

    /* Store access_token to local storage */
    await this.storeAccessToken(platform, access_token);
  }

  async stateTransition(platform: string) {
    // check if previous data has been sealed
    const sealed = await this.userStates[platform].userState.sync.isEpochSealed(
      await this.userStates[platform].userState.latestTransitionedEpoch()
    );
    if (!sealed) {
      throw new Error("From epoch is not yet sealed");
    }

    // gen proof
    await this.userStates[platform].userState.waitForSync();
    const signupProof = await this.userStates[
      platform
    ].userState.genUserStateTransitionProof();
    const data = await fetch(`${SERVER}/api/transition`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        publicSignals: signupProof.publicSignals,
        proof: signupProof.proof,
        attesterId: ATTESTERS[platform],
      }),
    }).then((r) => r.json());
    await provider.waitForTransaction(data.hash);
    await this.userStates[platform].userState.waitForSync();
    await this.loadReputation(platform);
    this.userStates[platform].latestTransitionedEpoch = await this.userStates[
      platform
    ].userState.latestTransitionedEpoch();
  }

  async getRep(platform: string) {
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

  async logout() {
    for (const [platform, us] of Object.entries(this.userStates)) {
      await us.userState.sync.stop();
      await us.userState.sync._db.closeAndWipe();
      window.localStorage.removeItem(`${platform}_access_token`);
    }
    this.userStates = {};
    this.hasSignedUp = false;
    window.localStorage.removeItem("id"); // for if anyone else wanna sign up and use
  }

  async storeAccessToken(platform: string, access_token: string) {
    await this.waitForLoad(platform);

    window.localStorage.setItem(`${platform}_access_token`, access_token);
    this.userStates[platform].access_token = access_token;
  }
}

export default createContext(new User());
