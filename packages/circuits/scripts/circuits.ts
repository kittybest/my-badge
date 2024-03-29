import { CircuitConfig } from "@unirep/circuits";
// TODO: better command line build options

const {
  STATE_TREE_DEPTH,
  NUM_EPOCH_KEY_NONCE_PER_EPOCH,
  FIELD_COUNT,
  SUM_FIELD_COUNT,
} = CircuitConfig.default;

export const ptauName = "powersOfTau28_hez_final_18.ptau";

export const circuitContents = {
  proveData: `pragma circom 2.1.0; include "../circuits/proveData.circom"; \n\ncomponent main { public [ data ] } = ProveData(${STATE_TREE_DEPTH}, ${NUM_EPOCH_KEY_NONCE_PER_EPOCH}, ${SUM_FIELD_COUNT}, ${FIELD_COUNT});`,
};
