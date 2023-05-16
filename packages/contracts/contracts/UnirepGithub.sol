// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;
import { Unirep } from "@unirep/contracts/Unirep.sol";

// Uncomment this line to use console.log
// import "hardhat/console.sol";

interface IVerifier {
    /**
     * @return bool Whether the proof is valid given the hardcoded verifying key
     *          above and the public inputs
     */
    function verifyProof(
        uint256[9] calldata publicSignals,
        uint256[8] calldata proof
    ) external view returns (bool);
}

contract UnirepGithub {
    /* Constants */
    uint8 public constant FIELD_COUNT = 6;
    uint256 public constant SNARK_SCALAR_FIELD = 21888242871839275222246405745257275088548364400416034343698204186575808495617;
    
    /* Variables */
    Unirep public unirep;
    IVerifier immutable dataVerifier;

    /* Events */
    event SubmitGithubDataProof (
        uint256 indexed epochKey,
        uint256[FIELD_COUNT] data,
        uint256[8] proof
    );

    /* Errors */
    error InvalidEpoch(uint256 epoch);
    error InvalidStateTreeRoot(uint256 stateTreeRoot);
    error InvalidProof();
    error InvalidEpochKey();

    /* Constructor */
    constructor(Unirep _unirep, uint48 _epochLength, IVerifier _dataVerifier) {
        // set unirep address
        unirep = _unirep;

        // sign up as an attester
        unirep.attesterSignUp(_epochLength);

        // setup the verifier contracts
        dataVerifier = _dataVerifier;
    }

    // sign up users in this app
    function userSignUp(
        uint256[] memory publicSignals,
        uint256[8] memory proof
    ) public {
        unirep.userSignUp(publicSignals, proof);
    }

    function submitManyAttestations(
        uint256 epochKey,
        uint48 targetEpoch,
        uint[] calldata fieldIndices,
        uint[] calldata vals
    ) public {
        require(fieldIndices.length == vals.length, 'arrmismatch');
        for (uint8 x = 0; x < fieldIndices.length; x++) {
            unirep.attest(epochKey, targetEpoch, fieldIndices[x], vals[x]);
        }
    }

    function submitAttestation(
        uint256 epochKey,
        uint48 targetEpoch,
        uint256 fieldIndex,
        uint256 val
    ) public {
        unirep.attest(
            epochKey,
            targetEpoch,
            fieldIndex,
            val
        );
    }

    function decodeDataProofControl(uint256 control) public pure returns(uint256 attesterId, uint256 epoch, uint256 epochKey) {
        epochKey = control & ((1 << 8) - 1);
        epoch = (control >> 8) & ((1 << 64) -1);
        attesterId = (control >> 72) & ((1 << 160) - 1);

        return (epochKey, epoch, attesterId);
    }

    function submitDataProof(
        uint256[9] memory publicSignals,
        uint256[8] memory proof
    ) public {
        // check if proof is valid
        bool valid = dataVerifier.verifyProof(publicSignals, proof);
        if (!valid) revert InvalidProof();

        // check if epoch key exceed the constraint
        uint256 epochKey = publicSignals[0];
        if (epochKey >= SNARK_SCALAR_FIELD) revert InvalidEpochKey();

        // decode publicSignals
        uint256 revealNonce;
        uint256 attesterId;
        uint256 epoch;
        uint256 nonce;
        (revealNonce, attesterId, epoch, nonce) = unirep.decodeEpochKeyControl(publicSignals[2]);

        // check the root does exists
        uint256 stateTreeRoot = publicSignals[1];

        if (!unirep.attesterStateTreeRootExists(uint160(attesterId), epoch, stateTreeRoot))
            revert InvalidStateTreeRoot(stateTreeRoot);

        // check if epoch not match
        if (epoch > unirep.attesterCurrentEpoch(uint160(attesterId)))
            revert InvalidEpoch(epoch);

        // TODO: proof nullifier???


        uint256[FIELD_COUNT] memory data;
        for(uint8 x = 0; x < FIELD_COUNT; x ++) {
            data[x] = publicSignals[3+x];
        }

        emit SubmitGithubDataProof(
            epochKey,
            data,
            proof
        );
    }

}
