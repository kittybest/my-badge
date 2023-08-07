import { DataProof, AppCircuit } from "@unirep-app/circuits";
import { UserState } from "@unirep/core";
import { stringifyBigInts } from "@unirep/utils";

export class AppUserState extends UserState {
  /* Constructor */
  constructor(config) {
    super(config); // prover & id are necessary
  }

  /* Generate DataProof
   * options:
   *   - nonce?: number
   *   - epoch?: number
   *   - revealNonce?: boolean
   *   - attesterId: string
   */
  async genDataProof(options: any) {
    const epoch =
      options.epoch ?? (await this.latestTransitionedEpoch(options.attesterId));
    const tree = await this.sync.genStateTree(epoch, options.attesterId);
    const leafIndex = await this.latestStateTreeLeafIndex(
      epoch,
      options.attesterId
    );
    const data = await this.getData(epoch - 1, options.attesterId);
    const stateTreeProof = tree.createProof(leafIndex);
    const circuitInputs = {
      identity_secret: this.id.secret,
      state_tree_indexes: stateTreeProof.pathIndices,
      state_tree_elements: stateTreeProof.siblings,
      data,
      epoch,
      nonce: options.nonce ?? 0,
      attester_id: options.attesterId,
      reveal_nonce: options.revealNonce ?? 0,
    };
    const results = await this.prover.genProofAndPublicSignals(
      AppCircuit.proveData,
      stringifyBigInts(circuitInputs)
    );

    return new DataProof(results.publicSignals, results.proof, this.prover);
  }
}
