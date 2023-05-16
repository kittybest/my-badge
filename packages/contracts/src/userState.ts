import { DataProof, AppCircuit } from "@unirep-app/circuits";
import { UserState } from "@unirep/core";
import { stringifyBigInts } from "@unirep/utils";
import { ethers } from "ethers";
import UNIREP_TWITTER_ABI from "@unirep-app/contracts/abi/UnirepTwitter.json";
import UNIREP_GITHUB_ABI from "@unirep-app/contracts/abi/UnirepGithub.json";

export class AppUserState extends UserState {
  unirepTwitter: any;
  unirepGithub: any;

  /* Constructor */
  constructor(config, id, addresses: string[]) {
    super(config, id);

    if (addresses.length > 0) {
      this.unirepTwitter = new ethers.Contract(
        addresses[0],
        UNIREP_TWITTER_ABI,
        config.provider
      );
    }
    if (addresses.length > 1) {
      this.unirepGithub = new ethers.Contract(
        addresses[1],
        UNIREP_GITHUB_ABI,
        config.provider
      );
    }
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
