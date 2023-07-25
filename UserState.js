"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserState = void 0;
const utils_1 = require("@unirep/utils");
const circuits_1 = require("@unirep/circuits");
const Synchronizer_1 = require("./Synchronizer");
/**
 * User state is used for a user to generate proofs and obtain the current user status.
 * It takes user's `ZKIdentity` and checks the events that matches the user's identity.
 */
class UserState {
  get commitment() {
    return this.id.commitment;
  }
  constructor(config, id) {
    var _a;
    /**
     * Get the reputation object from the attester
     * @param toEpoch The latest epoch that the reputation is accumulated
     * @returns The reputation object
     */
    this.getData = async (_toEpoch, _attesterId = this.sync.attesterId) => {
      var _a, _b;
      const data = Array(this.sync.settings.fieldCount).fill(BigInt(0));
      const attesterId = (0, Synchronizer_1.toDecString)(_attesterId);
      const orClauses = [];
      const toEpoch =
        _toEpoch !== null && _toEpoch !== void 0
          ? _toEpoch
          : await this.latestTransitionedEpoch(attesterId);
      const signup = await this.sync._db.findOne("UserSignUp", {
        where: {
          commitment: this.commitment.toString(),
          attesterId,
        },
      });
      if (signup) {
        orClauses.push({
          epochKey: signup.commitment,
          epoch: utils_1.MAX_EPOCH,
        });
      }
      const allNullifiers = [];
      for (
        let x =
          (_a =
            signup === null || signup === void 0 ? void 0 : signup.epoch) !==
            null && _a !== void 0
            ? _a
            : 0;
        x <= toEpoch;
        x++
      ) {
        allNullifiers.push(
          ...[0, this.sync.settings.numEpochKeyNoncePerEpoch].map((v) =>
            (0, utils_1.genEpochKey)(
              this.id.secret,
              attesterId,
              x,
              v
            ).toString()
          )
        );
      }
      const sortedNullifiers = await this.sync._db.findMany("Nullifier", {
        where: {
          attesterId,
          nullifier: allNullifiers,
        },
        orderBy: {
          epoch: "asc",
        },
      });
      for (
        let x =
          (_b =
            signup === null || signup === void 0 ? void 0 : signup.epoch) !==
            null && _b !== void 0
            ? _b
            : 0;
        x <= toEpoch;
        x++
      ) {
        const epks = Array(this.sync.settings.numEpochKeyNoncePerEpoch)
          .fill(null)
          .map((_, i) =>
            (0, utils_1.genEpochKey)(
              this.id.secret,
              attesterId,
              x,
              i
            ).toString()
          );
        const nullifiers = [0, this.sync.settings.numEpochKeyNoncePerEpoch].map(
          (v) =>
            (0, utils_1.genEpochKey)(
              this.id.secret,
              attesterId,
              x,
              v
            ).toString()
        );
        let usted = false;
        for (const { nullifier, epoch } of sortedNullifiers) {
          if (epoch > x) {
            break;
          }
          if (epoch === x) {
            usted = true;
            break;
          }
        }
        const signedup = await this.sync._db.findOne("UserSignUp", {
          where: {
            attesterId: attesterId,
            commitment: this.commitment.toString(),
            epoch: x,
          },
        });
        if (!usted && !signedup) continue;
        orClauses.push({
          epochKey: epks,
          epoch: x,
        });
      }
      if (orClauses.length === 0) return data;
      const attestations = await this.sync._db.findMany("Attestation", {
        where: {
          OR: orClauses,
          attesterId: attesterId,
        },
        orderBy: {
          index: "asc",
        },
      });
      for (const a of attestations) {
        const { fieldIndex } = a;
        if (fieldIndex < this.sync.settings.sumFieldCount) {
          data[fieldIndex] = (data[fieldIndex] + BigInt(a.change)) % utils_1.F;
        } else {
          data[fieldIndex] = BigInt(a.change);
        }
      }
      return data;
    };
    this.getDataByEpochKey = async (
      epochKey,
      epoch,
      _attesterId = this.sync.attesterId
    ) => {
      this._checkSync();
      const attesterId = (0, Synchronizer_1.toDecString)(_attesterId);
      this.sync.checkAttesterId(attesterId);
      const data = Array(this.sync.settings.fieldCount).fill(BigInt(0));
      if (typeof epoch !== "number") throw new Error("epoch must be number");
      const attestations = await this.sync._db.findMany("Attestation", {
        where: {
          epoch,
          epochKey: epochKey.toString(),
          attesterId: attesterId,
        },
        orderBy: {
          index: "asc",
        },
      });
      for (const a of attestations) {
        const { fieldIndex } = a;
        if (fieldIndex < this.sync.settings.sumFieldCount) {
          data[fieldIndex] = (data[fieldIndex] + BigInt(a.change)) % utils_1.F;
        } else {
          data[fieldIndex] = BigInt(a.change);
        }
      }
      return data;
    };
    /**
     * Check if epoch key nonce is valid
     */
    this._checkEpkNonce = (epochKeyNonce) => {
      if (epochKeyNonce >= this.sync.settings.numEpochKeyNoncePerEpoch)
        throw new Error(
          `@unirep/core:UserState: epochKeyNonce (${epochKeyNonce}) must be less than max epoch nonce`
        );
    };
    this._checkSync = () => {
      if (!this.sync)
        throw new Error("@unirep/core:UserState: no synchronizer is set");
    };
    this.getEpochKeyIndex = async (epoch, _epochKey, _attesterId) => {
      this._checkSync();
      const attestations = await this.sync._db.findMany("Attestation", {
        where: {
          epoch,
          attesterId: (0, Synchronizer_1.toDecString)(_attesterId),
        },
        orderBy: {
          index: "asc",
        },
      });
      let index = 0;
      const seenEpochKeys = {};
      for (const { epochKey } of attestations) {
        if (seenEpochKeys[epochKey]) continue;
        if (BigInt(epochKey) === BigInt(_epochKey)) {
          return index;
        }
        seenEpochKeys[epochKey] = true;
        index++;
      }
      return 0;
    };
    this.genUserStateTransitionProof = async (options = {}) => {
      var _a;
      const { toEpoch: _toEpoch } = options;
      const attesterId = (0, Synchronizer_1.toDecString)(
        (_a = options.attesterId) !== null && _a !== void 0
          ? _a
          : this.sync.attesterId
      );
      const fromEpoch = await this.latestTransitionedEpoch(attesterId);
      const data = await this.getData(fromEpoch - 1, attesterId);
      const toEpoch =
        _toEpoch !== null && _toEpoch !== void 0
          ? _toEpoch
          : this.sync.calcCurrentEpoch(attesterId);
      if (fromEpoch === toEpoch) {
        throw new Error(
          "@unirep/core:UserState: Cannot transition to same epoch"
        );
      }
      const epochTree = await this.sync.genEpochTree(fromEpoch, attesterId);
      const stateTree = await this.sync.genStateTree(fromEpoch, attesterId);
      const epochKeys = Array(this.sync.settings.numEpochKeyNoncePerEpoch)
        .fill(null)
        .map((_, i) =>
          (0, utils_1.genEpochKey)(this.id.secret, attesterId, fromEpoch, i)
        );
      const historyTree = await this.sync.genHistoryTree(attesterId);
      const leafHash = (0, utils_1.hash2)([stateTree.root, epochTree.root]);
      const leaf = await this.sync._db.findOne("HistoryTreeLeaf", {
        where: {
          attesterId,
          leaf: leafHash.toString(),
        },
      });
      let historyTreeProof;
      if (leaf) {
        historyTreeProof = historyTree.createProof(leaf.index);
      } else {
        // the epoch hasn't been ended onchain yet
        // add the leaf offchain to make the proof
        const leafCount = await this.sync._db.count("HistoryTreeLeaf", {
          attesterId,
        });
        historyTree.insert(leafHash);
        historyTreeProof = historyTree.createProof(leafCount);
      }
      const epochKeyLeafIndices = await Promise.all(
        epochKeys.map(async (epk) =>
          this.getEpochKeyIndex(fromEpoch, epk, attesterId)
        )
      );
      const epochKeyRep = await Promise.all(
        epochKeys.map(async (epochKey, i) => {
          const newData = await this.getDataByEpochKey(
            epochKey,
            fromEpoch,
            attesterId
          );
          const hasChanges = newData.reduce((acc, obj) => {
            return acc || obj != BigInt(0);
          }, false);
          const proof = epochTree.createProof(epochKeyLeafIndices[i]);
          return { epochKey, hasChanges, newData, proof };
        })
      );
      const latestLeafIndex = await this.latestStateTreeLeafIndex(
        fromEpoch,
        attesterId
      );
      const stateTreeProof = stateTree.createProof(latestLeafIndex);
      const circuitInputs = {
        from_epoch: fromEpoch,
        to_epoch: toEpoch,
        identity_secret: this.id.secret,
        state_tree_indexes: stateTreeProof.pathIndices,
        state_tree_elements: stateTreeProof.siblings,
        attester_id: attesterId.toString(),
        history_tree_indices: historyTreeProof.pathIndices,
        history_tree_elements: historyTreeProof.siblings,
        data,
        new_data: epochKeyRep.map(({ newData }) => newData),
        epoch_tree_elements: epochKeyRep.map(({ proof }) => proof.siblings),
        epoch_tree_indices: epochKeyRep.map(({ proof }) => proof.pathIndices),
        epoch_tree_root: epochTree.root,
      };
      const results = await this.sync.prover.genProofAndPublicSignals(
        circuits_1.Circuit.userStateTransition,
        (0, utils_1.stringifyBigInts)(circuitInputs)
      );
      return new circuits_1.UserStateTransitionProof(
        results.publicSignals,
        results.proof,
        this.sync.prover
      );
    };
    /**
     * Generate a reputation proof of current user state and given conditions
     * @param epkNonce The nonce determines the output of the epoch key
     * @param minRep The amount of reputation that user wants to prove. It should satisfy: `posRep - negRep >= minRep`
     * @param maxRep The amount of reputation that user wants to prove. It should satisfy: `negRep - posRep >= maxRep`
     * @param graffitiPreImage The graffiti pre-image that user wants to prove. It should satisfy: `hash(graffitiPreImage) == graffiti`
     * @returns The reputation proof of type `ReputationProof`.
     */
    this.genProveReputationProof = async (options) => {
      var _a, _b, _c;
      const { minRep, maxRep, graffitiPreImage, proveZeroRep, revealNonce } =
        options;
      const nonce = (_a = options.epkNonce) !== null && _a !== void 0 ? _a : 0;
      const attesterId = (0, Synchronizer_1.toDecString)(
        (_b = options.attesterId) !== null && _b !== void 0
          ? _b
          : this.sync.attesterId
      );
      this._checkEpkNonce(nonce);
      const epoch = await this.latestTransitionedEpoch(attesterId);
      const leafIndex = await this.latestStateTreeLeafIndex(epoch, attesterId);
      const data = await this.getData(epoch - 1, attesterId);
      const stateTree = await this.sync.genStateTree(epoch, attesterId);
      const stateTreeProof = stateTree.createProof(leafIndex);
      const circuitInputs = {
        identity_secret: this.id.secret,
        state_tree_indexes: stateTreeProof.pathIndices,
        state_tree_elements: stateTreeProof.siblings,
        data,
        prove_graffiti: graffitiPreImage ? 1 : 0,
        graffiti_pre_image:
          graffitiPreImage !== null && graffitiPreImage !== void 0
            ? graffitiPreImage
            : 0,
        reveal_nonce:
          revealNonce !== null && revealNonce !== void 0 ? revealNonce : 0,
        attester_id: attesterId.toString(),
        epoch,
        nonce,
        min_rep: minRep !== null && minRep !== void 0 ? minRep : 0,
        max_rep: maxRep !== null && maxRep !== void 0 ? maxRep : 0,
        prove_min_rep: !!(minRep !== null && minRep !== void 0 ? minRep : 0)
          ? 1
          : 0,
        prove_max_rep: !!(maxRep !== null && maxRep !== void 0 ? maxRep : 0)
          ? 1
          : 0,
        prove_zero_rep:
          proveZeroRep !== null && proveZeroRep !== void 0 ? proveZeroRep : 0,
        sig_data: (_c = options.data) !== null && _c !== void 0 ? _c : 0,
      };
      const results = await this.sync.prover.genProofAndPublicSignals(
        circuits_1.Circuit.proveReputation,
        (0, utils_1.stringifyBigInts)(circuitInputs)
      );
      return new circuits_1.ReputationProof(
        results.publicSignals,
        results.proof,
        this.sync.prover
      );
    };
    /**
     * Generate a user sign up proof of current user state and the given attester ID
     * @returns The sign up proof of type `SignUpProof`.
     */
    this.genUserSignUpProof = async (options = {}) => {
      var _a, _b;
      const attesterId = (0, Synchronizer_1.toDecString)(
        (_a = options.attesterId) !== null && _a !== void 0
          ? _a
          : this.sync.attesterId
      );
      const epoch =
        (_b = options.epoch) !== null && _b !== void 0
          ? _b
          : this.sync.calcCurrentEpoch(attesterId);
      const circuitInputs = {
        epoch,
        identity_nullifier: this.id.nullifier,
        identity_trapdoor: this.id.trapdoor,
        attester_id: attesterId,
      };
      const results = await this.sync.prover.genProofAndPublicSignals(
        circuits_1.Circuit.signup,
        (0, utils_1.stringifyBigInts)(circuitInputs)
      );
      return new circuits_1.SignupProof(
        results.publicSignals,
        results.proof,
        this.sync.prover
      );
    };
    this.genEpochKeyProof = async (options = {}) => {
      var _a, _b, _c, _d;
      const nonce = (_a = options.nonce) !== null && _a !== void 0 ? _a : 0;
      const attesterId = (0, Synchronizer_1.toDecString)(
        (_b = options.attesterId) !== null && _b !== void 0
          ? _b
          : this.sync.attesterId
      );
      const epoch =
        (_c = options.epoch) !== null && _c !== void 0
          ? _c
          : await this.latestTransitionedEpoch(attesterId);
      const tree = await this.sync.genStateTree(epoch, attesterId);
      const leafIndex = await this.latestStateTreeLeafIndex(epoch, attesterId);
      const data = await this.getData(epoch - 1, attesterId);
      const proof = tree.createProof(leafIndex);
      const circuitInputs = {
        identity_secret: this.id.secret,
        data,
        sig_data:
          (_d = options.data) !== null && _d !== void 0 ? _d : BigInt(0),
        state_tree_elements: proof.siblings,
        state_tree_indexes: proof.pathIndices,
        epoch,
        nonce,
        attester_id: attesterId,
        reveal_nonce: options.revealNonce ? 1 : 0,
      };
      const results = await this.sync.prover.genProofAndPublicSignals(
        circuits_1.Circuit.epochKey,
        (0, utils_1.stringifyBigInts)(circuitInputs)
      );
      return new circuits_1.EpochKeyProof(
        results.publicSignals,
        results.proof,
        this.sync.prover
      );
    };
    this.genEpochKeyLiteProof = async (options = {}) => {
      var _a, _b, _c, _d;
      const nonce = (_a = options.nonce) !== null && _a !== void 0 ? _a : 0;
      const attesterId = (0, Synchronizer_1.toDecString)(
        (_b = options.attesterId) !== null && _b !== void 0
          ? _b
          : this.sync.attesterId
      );
      const epoch =
        (_c = options.epoch) !== null && _c !== void 0
          ? _c
          : await this.latestTransitionedEpoch(attesterId);
      const circuitInputs = {
        identity_secret: this.id.secret,
        sig_data:
          (_d = options.data) !== null && _d !== void 0 ? _d : BigInt(0),
        epoch,
        nonce,
        attester_id: attesterId,
        reveal_nonce: options.revealNonce ? 1 : 0,
      };
      const results = await this.sync.prover.genProofAndPublicSignals(
        circuits_1.Circuit.epochKeyLite,
        (0, utils_1.stringifyBigInts)(circuitInputs)
      );
      return new circuits_1.EpochKeyLiteProof(
        results.publicSignals,
        results.proof,
        this.sync.prover
      );
    };
    if (config instanceof Synchronizer_1.Synchronizer) {
      if (!id) {
        throw new Error(
          "@unirep/core:UserState: id must be supplied as second argument when initialized with a sync"
        );
      }
      this.sync = config;
      this.id = id;
    } else {
      this.id = (_a = config._id) !== null && _a !== void 0 ? _a : id;
      delete config._id;
      this.sync = new Synchronizer_1.Synchronizer(config);
    }
  }
  async start() {
    await this.sync.start();
  }
  async waitForSync(n) {
    await this.sync.waitForSync(n);
  }
  stop() {
    this.sync.stop();
  }
  /**
   * Query if the user is signed up in the unirep state.
   * @returns True if user has signed up in unirep contract, false otherwise.
   */
  async hasSignedUp(attesterId = this.sync.attesterId) {
    this._checkSync();
    this.sync.checkAttesterId(attesterId);
    const signup = await this.sync._db.findOne("UserSignUp", {
      where: {
        commitment: this.commitment.toString(),
        attesterId: (0, Synchronizer_1.toDecString)(attesterId),
      },
    });
    return !!signup;
  }
  /**
   * Query the latest user state transition epoch. If user hasn't performed user state transition,
   * the function will return the epoch which user has signed up in Unirep contract.
   * @returns The latest epoch where user performs user state transition.
   */
  async latestTransitionedEpoch(_attesterId = this.sync.attesterId) {
    this._checkSync();
    const attesterId = (0, Synchronizer_1.toDecString)(_attesterId);
    this.sync.checkAttesterId(attesterId);
    const currentEpoch = await this.sync.loadCurrentEpoch(attesterId);
    let latestTransitionedEpoch = 0;
    for (let x = currentEpoch; x >= 0; x--) {
      const nullifiers = [0, this.sync.settings.numEpochKeyNoncePerEpoch].map(
        (v) =>
          (0, utils_1.genEpochKey)(this.id.secret, attesterId, x, v).toString()
      );
      const n = await this.sync._db.findOne("Nullifier", {
        where: {
          nullifier: nullifiers,
        },
      });
      if (n) {
        latestTransitionedEpoch = n.epoch;
        break;
      }
    }
    if (latestTransitionedEpoch === 0) {
      const signup = await this.sync._db.findOne("UserSignUp", {
        where: {
          commitment: this.commitment.toString(),
          attesterId,
        },
      });
      if (!signup) return 0;
      return signup.epoch;
    }
    return latestTransitionedEpoch;
  }
  /**
   * Get the latest global state tree leaf index for an epoch.
   * @param _epoch Get the global state tree leaf index of the given epoch
   * @returns The the latest global state tree leaf index for an epoch.
   */
  async latestStateTreeLeafIndex(_epoch, _attesterId = this.sync.attesterId) {
    const attesterId = (0, Synchronizer_1.toDecString)(_attesterId);
    if (!(await this.hasSignedUp(attesterId))) return -1;
    const currentEpoch =
      _epoch !== null && _epoch !== void 0
        ? _epoch
        : this.sync.calcCurrentEpoch(attesterId);
    const latestTransitionedEpoch = await this.latestTransitionedEpoch(
      attesterId
    );
    if (latestTransitionedEpoch !== currentEpoch) return -1;
    if (latestTransitionedEpoch === 0) {
      const signup = await this.sync._db.findOne("UserSignUp", {
        where: {
          commitment: this.commitment.toString(),
          attesterId: attesterId,
        },
      });
      if (!signup) {
        throw new Error("@unirep/core:UserState: user is not signed up");
      }
      if (signup.epoch !== currentEpoch) {
        return 0;
      }
      // don't include attestations that are not provable
      const data = await this.getData(currentEpoch - 1, attesterId);
      const leaf = (0, utils_1.genStateTreeLeaf)(
        this.id.secret,
        attesterId,
        signup.epoch,
        data
      );
      const foundLeaf = await this.sync._db.findOne("StateTreeLeaf", {
        where: {
          hash: leaf.toString(),
        },
      });
      if (!foundLeaf) return -1;
      return foundLeaf.index;
    }
    const data = await this.getData(latestTransitionedEpoch - 1, attesterId);
    const leaf = (0, utils_1.genStateTreeLeaf)(
      this.id.secret,
      attesterId,
      latestTransitionedEpoch,
      data
    );
    const foundLeaf = await this.sync._db.findOne("StateTreeLeaf", {
      where: {
        epoch: currentEpoch,
        hash: leaf.toString(),
      },
    });
    if (!foundLeaf) return -1;
    return foundLeaf.index;
  }
  getEpochKeys(_epoch, nonce, _attesterId = this.sync.attesterId) {
    this._checkSync();
    const attesterId = (0, Synchronizer_1.toDecString)(_attesterId);
    const epoch =
      _epoch !== null && _epoch !== void 0
        ? _epoch
        : this.sync.calcCurrentEpoch(attesterId);
    this._checkEpkNonce(nonce !== null && nonce !== void 0 ? nonce : 0);
    if (typeof nonce === "number") {
      return (0, utils_1.genEpochKey)(this.id.secret, attesterId, epoch, nonce);
    }
    return Array(this.sync.settings.numEpochKeyNoncePerEpoch)
      .fill(null)
      .map((_, i) =>
        (0, utils_1.genEpochKey)(this.id.secret, attesterId, epoch, i)
      );
  }
  async getProvableData(attesterId = this.sync.attesterId) {
    const epoch = await this.latestTransitionedEpoch(attesterId);
    return this.getData(epoch - 1, attesterId);
  }
}
exports.default = UserState;
exports.UserState = UserState;
