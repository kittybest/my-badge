import * as utils from "@unirep/utils";

import { CircuitConfig } from "@unirep/circuits";
import { defaultProver } from "../provers/defaultProver";
import { AppCircuit } from "../src";

const {
  EPOCH_TREE_DEPTH,
  EPOCH_TREE_ARITY,
  STATE_TREE_DEPTH,
  NUM_EPOCH_KEY_NONCE_PER_EPOCH,
  SUM_FIELD_COUNT,
  FIELD_COUNT,
} = CircuitConfig.default;

const genNewEpochTree = (
  _epochTreeDepth: number = EPOCH_TREE_DEPTH,
  _epochTreeArity = EPOCH_TREE_ARITY
) => {
  const tree = new utils.IncrementalMerkleTree(
    _epochTreeDepth,
    0,
    _epochTreeArity
  );
  tree.insert(0);
  return tree;
};

export const fillZero = (data: number[], length: number) => {
  return [...data, ...Array(length - data.length).fill(0)];
};

export const randomData = () => [
  ...Array(SUM_FIELD_COUNT)
    .fill(0)
    .map(() => utils.hash1([Math.floor(Math.random() * 199191919)])),
  ...Array(FIELD_COUNT - SUM_FIELD_COUNT)
    .fill(0)
    .map((_, i) => {
      if (i % 2 === SUM_FIELD_COUNT % 2) {
        return utils.hash1([Math.floor(Math.random() * 128289928892)]);
      } else {
        return BigInt(Math.floor(Math.random() * 2 ** 10));
      }
    }),
];

const genEpochKeyCircuitInput = (config: {
  id: utils.ZkIdentity;
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
    identity_secret: id.secretHash,
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
  id: utils.ZkIdentity;
  epoch: number;
  nonce: number;
  attesterId: number | bigint;
  _data: (bigint | number)[];
  revealNonce?: number;
}) => {
  const { id, epoch, nonce, attesterId, _data, revealNonce } = Object.assign(
    {
      _data: [],
    },
    config
  );

  const data = fillZero(_data, FIELD_COUNT);
  // Global state tree
  const stateTree = new utils.IncrementalMerkleTree(STATE_TREE_DEPTH);
  const hashedLeaf = utils.genStateTreeLeaf(
    id.secretHash,
    BigInt(attesterId),
    epoch,
    data as any
  );
  stateTree.insert(hashedLeaf);
  const stateTreeProof = stateTree.createProof(0); // if there is only one GST leaf, the index is 0

  const circuitInputs = {
    identity_secret: id.secretHash,
    state_tree_indexes: stateTreeProof.pathIndices,
    state_tree_elements: stateTreeProof.siblings,
    data,
    epoch,
    nonce,
    attester_id: attesterId,
    reveal_nonce: revealNonce ?? 0,
  };
  return utils.stringifyBigInts(circuitInputs);
};

const genProofAndVerify = async (circuit: AppCircuit, circuitInputs: any) => {
  const startTime = new Date().getTime();
  const { proof, publicSignals } = await defaultProver.genProofAndPublicSignals(
    circuit,
    circuitInputs
  );
  const endTime = new Date().getTime();
  console.log(
    `Gen Proof time: ${endTime - startTime} ms (${Math.floor(
      (endTime - startTime) / 1000
    )} s)`
  );
  const isValid = await defaultProver.verifyProof(
    circuit,
    publicSignals,
    proof
  );
  return { isValid, proof, publicSignals };
};

export {
  genNewEpochTree,
  genEpochKeyCircuitInput,
  genDataCircuitInput,
  genProofAndVerify,
};
