import { DataProof, AppCircuit } from "@unirep-app/circuits";
import { UserState } from "@unirep/core";
import { stringifyBigInts } from "@unirep/utils";
import { ethers } from "ethers";
import UNIREP_APP_ABI from "../abi/UnirepApp.json";

class AppUserState extends UserState {
  unirepApp: any;

  /* Constructor */
  constructor(config, id, unirepAppAddress) {
    super(config, id);
    this.unirepApp = new ethers.Contract(
      unirepAppAddress,
      UNIREP_APP_ABI,
      config.provider
    );
  }

  /* Generate DataProof
   * options:
   *   - nonce?: number
   *   - epoch?: number
   *   - revealNonce?: boolean
   */
  async genDataProof(options: any) {
    const epoch = options.epoch ?? (await this.latestTransitionedEpoch());
    const tree = await this.sync.genStateTree(epoch);
    const leafIndex = await this.latestStateTreeLeafIndex(epoch);
    const data = await this.getData(epoch - 1);
    const stateTreeProof = tree.createProof(leafIndex);
    const circuitInputs = {
      identity_secret: this.id.secretHash,
      state_tree_indexes: stateTreeProof.pathIndices,
      state_tree_elements: stateTreeProof.siblings,
      data,
      epoch,
      nonce: options.nonce ?? 0,
      attester_id: this.sync.attesterId.toString(),
      reveal_nonce: options.revealNonce ?? 0,
    };
    const results = await this.sync.prover.genProofAndPublicSignals(
      AppCircuit.proveData,
      stringifyBigInts(circuitInputs)
    );

    console.log("gen data proof results:", results);

    return new DataProof(
      results.publicSignals,
      results.proof,
      this.sync.prover
    );
  }
}

export default AppUserState;
