import { Circuit, BuildOrderedTree } from "@unirep/circuits";
import { stringifyBigInts } from "@unirep/utils";
import TransactionManager from "./TransactionManager";
import synchronizer from "./AppSynchronizer";

class HashchainManager {
  latestSyncEpoch = {};
  prevEpoch = {};

  async startDaemon() {
    const attestersData = await synchronizer._db.findMany("Attester", {
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
    // Make sure we're synced up
    await synchronizer.waitForSync();

    const attestersData = await synchronizer._db.findMany("Attester", {
      where: {},
    });
    for (let i = 0; i < attestersData.length; i++) {
      const data = attestersData[i];
      if (data._id === "0") continue;
      if (!this.prevEpoch[data._id]) this.prevEpoch[data._id] = 0;
      if (!this.latestSyncEpoch[data._id]) this.latestSyncEpoch[data._id] = 0;

      const attesterId = BigInt(data._id);
      const currentEpoch = Number(
        await synchronizer.unirepContract.attesterCurrentEpoch(attesterId)
      );

      if (currentEpoch > this.prevEpoch[data._id]) {
        const calldata =
          synchronizer.unirepContract.interface.encodeFunctionData(
            "updateEpochIfNeeded",
            [attesterId]
          );
        const hash = await TransactionManager.queueTransaction(
          synchronizer.unirepContract.address,
          calldata
        );
        this.prevEpoch[data._id] = currentEpoch;
      }

      for (let j = this.latestSyncEpoch[data._id]; j < currentEpoch; j++) {
        // check the owed keys
        const isSealed = await synchronizer.unirepContract.attesterEpochSealed(
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

    if (synchronizer.provider.network.chainId === 31337) {
      // hardhat dev nodes need to have their state refreshed manually
      // for view only functions
      await synchronizer.provider.send("evm_mine", []);
    }
  }

  async processEpochKeys(epoch, attesterId) {
    // first check if there is an unprocessed hashchain
    const leafPreimages = await synchronizer.genEpochTreePreimages(
      epoch,
      attesterId
    );
    const { circuitInputs } =
      BuildOrderedTree.buildInputsForLeaves(leafPreimages);
    const r = await synchronizer.prover.genProofAndPublicSignals(
      Circuit.buildOrderedTree,
      stringifyBigInts(circuitInputs)
    );
    const { publicSignals, proof } = new BuildOrderedTree(
      r.publicSignals,
      r.proof
    );
    const calldata = synchronizer.unirepContract.interface.encodeFunctionData(
      "sealEpoch",
      [epoch, attesterId, publicSignals, proof]
    );
    const hash = await TransactionManager.queueTransaction(
      synchronizer.unirepContract.address,
      calldata
    );
    await synchronizer.provider.waitForTransaction(hash);
  }
}

export default new HashchainManager();
