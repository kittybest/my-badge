pragma circom 2.0.0;

/*
    Prove:
        1. if user has a leaf in current state tree
        2. leaf has claimed reputation
        4. output a chosen epoch key
*/

include "../../../node_modules/@unirep/circuits/circuits/circomlib/circuits/comparators.circom";
include "../../../node_modules/@unirep/circuits/circuits/circomlib/circuits/gates.circom";
include "../../../node_modules/@unirep/circuits/circuits/circomlib/circuits/poseidon.circom";

include "../../../node_modules/@unirep/circuits/circuits/epochKey.circom";

template ProveData(STATE_TREE_DEPTH, NUM_EPOCH_KEY_NONCE_PER_EPOCH, SUM_FIELD_COUNT, FIELD_COUNT) {
    signal output epoch_key;

    // Global state tree leaf: Identity & user state root
    signal input identity_secret;
    // Global state tree
    signal input state_tree_indexes[STATE_TREE_DEPTH];
    signal input state_tree_elements[STATE_TREE_DEPTH];
    signal output state_tree_root;
    // Attestation by the attester
    signal input data[FIELD_COUNT];
    // Epoch key
    signal input attester_id;
    signal input epoch;
    signal input nonce;
    signal input reveal_nonce;

    signal output control;
    /**
     * control:
     * 8 bits nonce
     * 64 bits epoch
     * 160 bits attester_id
     * 1 bit reveal_nonce
     **/
    
    /* Make sure reveal_nonce is 0 or 1 */
    reveal_nonce * (reveal_nonce - 1) === 0;

    /* Do the epoch key proof, state tree membership */
    component epoch_key_prover = EpochKey(
      STATE_TREE_DEPTH,
      NUM_EPOCH_KEY_NONCE_PER_EPOCH,
      FIELD_COUNT
    );
    epoch_key_prover.identity_secret <== identity_secret;
    epoch_key_prover.reveal_nonce <== reveal_nonce;
    epoch_key_prover.attester_id <== attester_id;
    epoch_key_prover.epoch <== epoch;
    epoch_key_prover.nonce <== nonce;
    epoch_key_prover.sig_data <== 0;
    for (var i = 0; i < STATE_TREE_DEPTH; i++) {
        epoch_key_prover.state_tree_indexes[i] <== state_tree_indexes[i];
        epoch_key_prover.state_tree_elements[i] <== state_tree_elements[i];
    }
    for (var i = 0; i < FIELD_COUNT; i++) {
        epoch_key_prover.data[i] <== data[i];
    }

    control <== epoch_key_prover.control;
    epoch_key <== epoch_key_prover.epoch_key;
    state_tree_root <== epoch_key_prover.state_tree_root;

    /* End of check */
}
