import * as utils from "@unirep/utils";
import { Identity } from "@semaphore-protocol/identity";

import { CircuitConfig } from "@unirep/circuits";
import { AppCircuit } from "../src";
import { appProver } from "../provers/appProver";
import { poseidon1 } from "poseidon-lite";

const { STATE_TREE_DEPTH, SUM_FIELD_COUNT, FIELD_COUNT } =
  CircuitConfig.default;

export const fillZero = (data: number[], length: number) => {
  return [...data, ...Array(length - data.length).fill(0)];
};

export const randomData = () => [
  ...Array(SUM_FIELD_COUNT)
    .fill(0)
    .map(() => poseidon1([Math.floor(Math.random() * 199191919)])),
  ...Array(FIELD_COUNT - SUM_FIELD_COUNT)
    .fill(0)
    .map(
      () =>
        poseidon1([Math.floor(Math.random() * 199191919)]) %
        BigInt(2) ** BigInt(253)
    ),
];

const genEpochKeyCircuitInput = (config: {
  id: Identity;
  tree: utils.IncrementalMerkleTree;
  leafIndex: number;
  epoch: number;
  nonce: number;
  attesterId: number | bigint;
  data?: bigint[];
  sigData?: bigint;
  revealNonce?: number;
}) => {
  const {
    id,
    tree,
    leafIndex,
    epoch,
    nonce,
    attesterId,
    data: _data,
    sigData,
    revealNonce,
  } = Object.assign(
    {
      data: [],
    },
    config
  );
  const data = [..._data, ...Array(FIELD_COUNT - _data.length).fill(0)];
  const proof = tree.createProof(leafIndex);
  const circuitInputs = {
    state_tree_elements: proof.siblings,
    state_tree_indexes: proof.pathIndices,
    identity_secret: id.secret,
    data,
    sig_data: sigData ?? BigInt(0),
    nonce,
    epoch,
    attester_id: attesterId,
    reveal_nonce: revealNonce ?? 0,
  };
  return utils.stringifyBigInts(circuitInputs);
};

const genDataCircuitInput = (config: {
  id: Identity;
  epoch: number;
  nonce: number;
  attesterId: number | bigint;
  _data: (bigint | number)[];
  revealNonce?: number;
  chainId: number;
}) => {
  const { id, epoch, nonce, attesterId, _data, revealNonce, chainId } =
    Object.assign(
      {
        _data: [],
      },
      config
    );

  const data = fillZero(_data, FIELD_COUNT);
  // Global state tree
  const stateTree = new utils.IncrementalMerkleTree(STATE_TREE_DEPTH);
  const hashedLeaf = utils.genStateTreeLeaf(
    id.secret,
    BigInt(attesterId),
    epoch,
    data as any,
    chainId
  );
  stateTree.insert(hashedLeaf);
  const stateTreeProof = stateTree.createProof(0); // if there is only one GST leaf, the index is 0

  const circuitInputs = {
    identity_secret: id.secret,
    state_tree_indices: stateTreeProof.pathIndices,
    state_tree_elements: stateTreeProof.siblings,
    data,
    attester_id: attesterId,
    epoch,
    nonce,
    reveal_nonce: revealNonce ?? 0,
    chain_id: chainId,
  };
  return utils.stringifyBigInts(circuitInputs);
};

const genProofAndVerify = async (circuit: AppCircuit, circuitInputs: any) => {
  const startTime = new Date().getTime();
  const { proof, publicSignals } = await appProver.genProofAndPublicSignals(
    circuit,
    circuitInputs
  );
  const endTime = new Date().getTime();
  console.log(
    `Gen Proof time: ${endTime - startTime} ms (${Math.floor(
      (endTime - startTime) / 1000
    )} s)`
  );
  const isValid = await appProver.verifyProof(circuit, publicSignals, proof);
  return { isValid, proof, publicSignals };
};

export { genEpochKeyCircuitInput, genDataCircuitInput, genProofAndVerify };
