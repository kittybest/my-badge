import { createContext } from "react";
import { ethers } from "ethers";
import { makeAutoObservable } from "mobx";
import { stringifyBigInts } from "@unirep/utils";
import { Identity } from "@semaphore-protocol/identity";
import { schema } from "@unirep/core";
import { AppUserState } from "@unirep-app/contracts";
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

const ATTESTERS: { [key: string]: string } = {
  twitter: TWITTER_ADDRESS,
  github: GITHUB_ADDRESS,
};

class User {
  id: string = "";
  fieldCount: number = -1;
  sumFieldCount: number = -1;
  userState: AppUserState | undefined;
  accessTokens: { [key: string]: string } = {}; // platform: access_token
  data: { [key: string]: bigint[] } = {}; // platform: array of data
  provableData: { [key: string]: bigint[] } = {}; // platform: array of data
  hasSignedUp: { [key: string]: boolean } = {};

  constructor() {
    makeAutoObservable(this);
    this.load();
  }

  async load() {
    const id: string = localStorage.getItem("id") ?? "";
    const identity = new Identity(id);
    if (!id) {
      localStorage.setItem("id", identity.toString());
    }

    const db = new MemoryConnector(constructSchema(schema)); // not used in the beta version??

    this.userState = new AppUserState(
      {
        db,
        provider,
        prover,
        unirepAddress: UNIREP_ADDRESS,
        attesterId: [TWITTER_ADDRESS, GITHUB_ADDRESS],
        _id: identity,
      },
      identity
    );

    await this.userState.sync.start();

    if (this.fieldCount < 0) {
      this.fieldCount = this.userState.sync.settings.fieldCount;
    }
    if (this.sumFieldCount < 0) {
      this.sumFieldCount = this.userState.sync.settings.sumFieldCount;
    }

    await this.userState.waitForSync();

    for (const [platform, attesterId] of Object.entries(ATTESTERS)) {
      const _accessToken = localStorage.getItem(`${platform}_access_token`);
      if (_accessToken) this.accessTokens[platform] = _accessToken;
    }

    await this.updateHasSignedUp();
    await this.loadReputation();
  }

  async loadReputation(_platform?: string) {
    if (!this.userState) throw new Error("UserState is undefined");

    if (!_platform) {
      for (const [platform, attesterId] of Object.entries(ATTESTERS)) {
        this.data[platform] = await this.userState.getData(
          undefined,
          attesterId
        );
        this.provableData[platform] = await this.userState.getProvableData(
          attesterId
        );
      }
    } else {
      this.data[_platform] = await this.userState.getData(
        undefined,
        ATTESTERS[_platform]
      );
      this.provableData[_platform] = await this.userState.getProvableData(
        ATTESTERS[_platform]
      );
    }
  }

  async waitForLoad(platform: string) {
    for (var i = 0; i < 10; i++) {
      if (this.userState) break;
      await Wait(1000);
    }

    if (!this.userState) throw new Error("userState is undefined");
  }

  async login(id: string) {
    if (!id || id.length === 0) {
      throw new Error("You have not entered identity yet.");
    }
    const identity = new Identity(id);
    localStorage.setItem("id", identity.toString());
    await this.load();
  }

  async updateHasSignedUp() {
    if (!this.userState) throw new Error("UserState is undefined");

    for (const [platform, attesterId] of Object.entries(ATTESTERS)) {
      this.hasSignedUp[platform] = await this.userState.hasSignedUp(attesterId);
    }
  }

  epochKey(platform: string, nonce: number) {
    if (!this.userState) return "0x";

    const epoch = this.userState.sync.calcCurrentEpoch(ATTESTERS[platform]);
    const keys = this.userState.getEpochKeys(epoch, nonce, ATTESTERS[platform]);
    if (Array.isArray(keys) && keys.length > 1) {
      console.error(
        "Error: Something is wrong, just wanna get epoch key of certain nonce but got an array."
      );
      return;
    }
    const key = Array.isArray(keys) ? keys[0] : keys;
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

    /* Check if userState is loaded */
    if (!this.userState) throw new Error("UserState is undefined");

    /* Gen signupProof */
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
      attesterId: ATTESTERS[platform],
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
    await this.userState.waitForSync();
    await this.updateHasSignedUp();

    /* Store access_token to local storage */
    await this.storeAccessToken(platform, access_token);
  }

  async stateTransition(platform: string) {
    /* Check if UserState is loaded */
    if (!this.userState) throw new Error("UserState is undefined");

    // gen proof
    await this.userState.waitForSync();
    const stateTransitionProof =
      await this.userState.genUserStateTransitionProof({
        attesterId: ATTESTERS[platform],
      });
    const data = await fetch(`${SERVER}/api/transition`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        publicSignals: stateTransitionProof.publicSignals,
        proof: stateTransitionProof.proof,
        attesterId: ATTESTERS[platform],
      }),
    }).then((r) => r.json());
    await provider.waitForTransaction(data.hash);
    await this.userState.waitForSync();
    await this.loadReputation(platform);
  }

  async getRep(platform: string) {
    /* Check attesterId and userState */
    const attesterId = ATTESTERS[platform];
    if (!attesterId) {
      throw new Error("You are not signing up through available web2 service.");
    }

    /* Check if UserState is loaded */
    if (!this.userState) throw new Error("UserState is undefined");

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
    const epochKeyProof = await this.userState.genEpochKeyProof({
      nonce: 0,
      epoch: currentEpoch,
      attesterId: ATTESTERS[platform],
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
          currentData: this.data[platform],
        })
      ),
    }).then((r) => r.json());
    await provider.waitForTransaction(data.hash);
    await this.userState.waitForSync();
    await this.loadReputation(platform);
  }

  async logout() {
    /* Check if UserState is loaded */
    if (!this.userState) throw new Error("UserState is undefined");

    /* Stop the synchronizer and wipe out the db */
    this.userState.sync.stop();
    await this.userState.sync._db.closeAndWipe();

    /* Operations related to localStorage and local variables */
    for (const [platform, attesterId] of Object.entries(ATTESTERS)) {
      window.localStorage.removeItem(`${platform}_access_token`);
    }

    this.userState = undefined;
    this.hasSignedUp = {};
    this.data = {};
    this.provableData = {};
    window.localStorage.removeItem("id"); // for if anyone else wanna sign up and use
  }

  async storeAccessToken(platform: string, access_token: string) {
    await this.waitForLoad(platform);

    window.localStorage.setItem(`${platform}_access_token`, access_token);
    this.accessTokens[platform] = access_token;
  }

  async uploadDataProof(platform: string) {
    // const { publicSignals, proof } = await this.userStates[
    //   "twitter"
    // ].userState.genDataProof({});
    // const attesterId = ATTESTERS[platform];
    // /* Call API to calculate and receive reputation data */
    // const data = await fetch(`${SERVER}/api/ranking`, {
    //   method: "POST",
    //   headers: {
    //     "content-type": "application/json",
    //   },
    //   body: JSON.stringify(
    //     stringifyBigInts({
    //       publicSignals,
    //       proof,
    //       attesterId,
    //     })
    //   ),
    // }).then((r) => r.json());
    // await provider.waitForTransaction(data.hash);
  }
}

export default createContext(new User());
