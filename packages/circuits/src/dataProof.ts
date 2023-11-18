import { SnarkProof } from "@unirep/utils";
import { BigNumberish } from "@ethersproject/bignumber";
import { BaseProof, Prover, CircuitConfig } from "@unirep/circuits";
import { AppCircuit } from "./circuits";

/**
 * The reputation proof structure that helps to query the public signals
 */
export class DataProof extends BaseProof {
  readonly idx = {
    epochKey: 0,
    stateTreeRoot: 1,
    control: 2,
    data: 3,
  };
  public epochKey: BigNumberish;
  public stateTreeRoot: BigNumberish;
  public control: BigNumberish;
  public epoch: BigNumberish;
  public revealNonce: BigNumberish;
  public nonce: BigNumberish;
  public attesterId: BigNumberish;
  public data: BigNumberish[] = [];

  /**
   * @param _publicSignals The public signals of the reputation proof that can be verified by the prover
   * @param _proof The proof that can be verified by the prover
   * @param prover The prover that can verify the public signals and the proof
   */
  constructor(
    _publicSignals: (bigint | string)[],
    _proof: SnarkProof | (bigint | string)[],
    prover?: Prover
  ) {
    super(_publicSignals, _proof, prover);
    this.epochKey = _publicSignals[this.idx.epochKey];
    this.stateTreeRoot = _publicSignals[this.idx.stateTreeRoot];
    this.control = _publicSignals[this.idx.control].toString();
    this.revealNonce = (BigInt(this.control) >> BigInt(216)) & BigInt(1);
    this.attesterId =
      (BigInt(this.control) >> BigInt(56)) &
      ((BigInt(1) << BigInt(160)) - BigInt(1));
    this.epoch =
      (BigInt(this.control) >> BigInt(8)) &
      ((BigInt(1) << BigInt(48)) - BigInt(1));
    this.nonce = BigInt(this.control) & ((BigInt(1) << BigInt(8)) - BigInt(1));
    for (let i = 0; i < CircuitConfig.default.FIELD_COUNT; i++) {
      this.data.push(_publicSignals[this.idx.data + i]);
    }
    (this as any).circuit = AppCircuit.proveData;
  }

  static buildControl({ attesterId, epoch, nonce, revealNonce, chainId }: any) {
    let control = BigInt(0);
    control += BigInt(chainId ?? 0) << BigInt(217);
    control += BigInt(revealNonce ?? 0) << BigInt(216);
    control += BigInt(attesterId) << BigInt(56);
    control += BigInt(epoch) << BigInt(8);
    control += BigInt(nonce) * BigInt(revealNonce ?? 0);

    return control;
  }
}
