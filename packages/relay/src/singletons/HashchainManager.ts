import { Circuit, BuildOrderedTree } from "@unirep/circuits";
import { stringifyBigInts } from "@unirep/utils";
import { Synchronizer } from "@unirep/core";
import TransactionManager from "./TransactionManager";

class HashchainManager {
  latestSyncEpoch = {};
  prevEpoch = {};
  synchronizer?: Synchronizer;

  configure(_synchronizer: Synchronizer) {
    this.synchronizer = _synchronizer;
  }

  async startDaemon() {
    if (!this.synchronizer) throw new Error("Not initialized");

    const attestersData = await this.synchronizer._db.findMany("Attester", {
      where: {},
    });
    attestersData.map((data) => {
      if (data._id !== "0") {
        this.latestSyncEpoch[data._id] = 0;
        this.prevEpoch[data._id] = 0;
      }
    });

    // return
    // first sync up all the historical epochs
    // then start watching
    await this.sync();
    for (;;) {
      // try to make a
      await new Promise((r) => setTimeout(r, 10000));
      await this.sync();
    }
  }

  async sync() {
    if (!this.synchronizer) throw new Error("Not initialized");

    // Make sure we're synced up
    await this.synchronizer.waitForSync();

    const attestersData = await this.synchronizer._db.findMany("Attester", {
      where: {},
    });
    for (let i = 0; i < attestersData.length; i++) {
      const data = attestersData[i];
      if (data._id === "0") continue;
      if (!this.prevEpoch[data._id]) this.prevEpoch[data._id] = 0;
      if (!this.latestSyncEpoch[data._id]) this.latestSyncEpoch[data._id] = 0;

      const attesterId = BigInt(data._id);
      const currentEpoch = Number(
        await this.synchronizer.unirepContract.attesterCurrentEpoch(attesterId)
      );

      if (currentEpoch > this.prevEpoch[data._id]) {
        const calldata =
          this.synchronizer.unirepContract.interface.encodeFunctionData(
            "updateEpochIfNeeded",
            [attesterId]
          );
        const hash = await TransactionManager.queueTransaction(
          this.synchronizer.unirepContract.address,
          calldata
        );
        this.prevEpoch[data._id] = currentEpoch;
      }

      for (let j = this.latestSyncEpoch[data._id]; j < currentEpoch; j++) {
        // check the owed keys
        const isSealed =
          await this.synchronizer.unirepContract.attesterEpochSealed(
            attesterId,
            j
          );
        if (!isSealed) {
          console.log("executing epoch", j);
          // otherwise we need to make an ordered tree
          await this.processEpochKeys(j, attesterId);
          this.latestSyncEpoch[data._id] = j;
        } else {
          this.latestSyncEpoch[data._id] = j;
        }
      }
    }

    if (this.synchronizer.provider.network.chainId === 31337) {
      // hardhat dev nodes need to have their state refreshed manually
      // for view only functions
      await this.synchronizer.provider.send("evm_mine", []);
    }
  }

  async processEpochKeys(epoch, attesterId) {
    if (!this.synchronizer) throw new Error("Not initialized");

    // first check if there is an unprocessed hashchain
    const leafPreimages = await this.synchronizer.genEpochTreePreimages(
      epoch,
      attesterId
    );
    const { circuitInputs } =
      BuildOrderedTree.buildInputsForLeaves(leafPreimages);
    const r = await this.synchronizer.prover.genProofAndPublicSignals(
      Circuit.buildOrderedTree,
      stringifyBigInts(circuitInputs)
    );
    const { publicSignals, proof } = new BuildOrderedTree(
      r.publicSignals,
      r.proof
    );
    const calldata =
      this.synchronizer.unirepContract.interface.encodeFunctionData(
        "sealEpoch",
        [epoch, attesterId, publicSignals, proof]
      );
    const hash = await TransactionManager.queueTransaction(
      this.synchronizer.unirepContract.address,
      calldata
    );
    await this.synchronizer.provider.waitForTransaction(hash);
  }
}

export default new HashchainManager();
