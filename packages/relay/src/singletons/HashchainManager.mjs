import { ethers } from "ethers";
import { Circuit, BuildOrderedTree } from "@unirep/circuits";
import { stringifyBigInts } from "@unirep/utils";
import TransactionManager from "./TransactionManager.mjs";
import synchronizer from "./AppSynchronizer.mjs";

class HashchainManager {
  latestSyncEpoch = {};

  async startDaemon() {
    const attestersData = await synchronizer._db.findMany('Attester', {});
    attestersData.map(data => {
        if (data._id !== '0') this.latestSyncEpoch[data._id] = 0
      }
    )

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

    const attestersData = await synchronizer._db.findMany('Attester', {});
    for (let i = 0; i < attestersData.length; i ++) {      
      const data = attestersData[i];
      if (data._id === '0') continue;

      const attesterId = BigInt(data._id);
      const timestamp = Math.floor(+new Date() / 1000);
      const currentEpoch = Math.max(0, Math.floor((timestamp - data.startTimestamp) / data.epochLength));
      const currentEpochOnChain = Number(await synchronizer.unirepContract.attesterCurrentEpoch(attesterId));
      if (currentEpoch !== currentEpochOnChain) {
        const calldata = synchronizer.unirepContract.interface.encodeFunctionData(
          "updateEpochIfNeeded",
          [attesterId]
        );
        const hash = await TransactionManager.queueTransaction(
          synchronizer.unirepContract.address,
          calldata
        );
        console.log('attester', data._id, 'call update epoch if needed, hash:', hash);
      }

      for (let j = this.latestSyncEpoch[data._id]; j < currentEpoch; j ++) {
        // check the owed keys
        if (synchronizer.provider.network.chainId === 31337) {
          // hardhat dev nodes need to have their state refreshed manually
          // for view only functions
          await synchronizer.provider.send("evm_mine", []);
        }
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
  }

  async processEpochKeys(epoch, attesterId) {
    // first check if there is an unprocessed hashchain
    const leafPreimages = await synchronizer.genEpochTreePreimages(epoch, attesterId);
    const { circuitInputs } = BuildOrderedTree.buildInputsForLeaves(
      leafPreimages
    );
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
