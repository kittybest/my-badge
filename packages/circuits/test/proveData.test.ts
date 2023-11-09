import { expect } from "chai";
import { Identity } from "@semaphore-protocol/identity";
import { genEpochKey, F } from "@unirep/utils";
import { CircuitConfig } from "@unirep/circuits";
import { DataProof, AppCircuit } from "../src";
import { genDataCircuitInput, genProofAndVerify, fillZero } from "./utils";

const { SUM_FIELD_COUNT, NUM_EPOCH_KEY_NONCE_PER_EPOCH, FIELD_COUNT } =
  CircuitConfig.default;

describe("Prove reputation from attester circuit", function () {
  this.timeout(300000);

  it("should prove a reputation", async () => {
    const id = new Identity();
    const epoch = 20;
    const nonce = 0;
    const attesterId = 219090124810;
    const data = fillZero([], FIELD_COUNT);
    const chainId = 31337;

    const circuitInputs = genDataCircuitInput({
      id,
      epoch,
      nonce,
      attesterId,
      _data: data,
      chainId,
    });

    const { isValid, publicSignals, proof } = await genProofAndVerify(
      AppCircuit.proveData,
      circuitInputs
    );
    expect(isValid).to.be.true;
    // check control outputs
    expect(publicSignals[2].toString()).to.equal(
      DataProof.buildControl({ epoch, nonce, attesterId, chainId }).toString()
    );
    const dataProof = new DataProof(publicSignals, proof);
    expect(dataProof.epoch.toString()).to.equal(epoch.toString());
    expect(dataProof.nonce.toString()).to.equal("0");
    expect(dataProof.revealNonce.toString()).to.equal("0");
    expect(dataProof.attesterId.toString()).to.equal(attesterId.toString());
    for (let i = 0; i < FIELD_COUNT; i++) {
      expect(dataProof.data[i].toString()).to.equal(data[i].toString());
    }
  });

  it("should not reveal nonce", async () => {
    const id = new Identity();
    const epoch = 1028;
    const attesterId = 10210;
    const nonce = 1;
    const data = fillZero([], FIELD_COUNT);
    const chainId = 31337;
    const circuitInputs = genDataCircuitInput({
      id,
      epoch,
      nonce,
      attesterId,
      _data: data,
      chainId,
    });
    const { isValid, proof, publicSignals } = await genProofAndVerify(
      AppCircuit.proveData,
      circuitInputs
    );
    expect(isValid).to.be.true;
    // check control outputs
    expect(publicSignals[2].toString()).to.equal(
      DataProof.buildControl({ epoch, nonce, attesterId, chainId }).toString()
    );

    const dataProof = new DataProof(publicSignals, proof);
    expect(dataProof.epoch.toString()).to.equal(epoch.toString());
    expect(dataProof.nonce.toString()).to.equal("0");
    expect(dataProof.revealNonce.toString()).to.equal("0");
    expect(dataProof.attesterId.toString()).to.equal(attesterId.toString());
  });

  it("should reveal nonce", async () => {
    const id = new Identity();
    const epoch = 1028;
    const attesterId = 10210;
    const nonce = 0;
    const revealNonce = 1;
    const data = fillZero([], FIELD_COUNT);
    const chainId = 31337;
    const circuitInputs = genDataCircuitInput({
      id,
      epoch,
      nonce,
      attesterId,
      _data: data,
      revealNonce,
      chainId,
    });
    const { isValid, proof, publicSignals } = await genProofAndVerify(
      AppCircuit.proveData,
      circuitInputs
    );
    expect(isValid).to.be.true;

    // check control outputs
    expect(publicSignals[2].toString()).to.equal(
      DataProof.buildControl({
        epoch,
        nonce,
        attesterId,
        revealNonce,
        chainId,
      }).toString(),
      "actual control not as expected"
    );

    const dataProof = new DataProof(publicSignals, proof);
    expect(dataProof.epoch.toString()).to.equal(
      epoch.toString(),
      "actual epoch not as expected"
    );
    expect(dataProof.nonce.toString()).to.equal(
      nonce.toString(),
      "actual nonce not as expected"
    );
    expect(dataProof.revealNonce.toString()).to.equal(
      revealNonce.toString(),
      "actual revealNonce not as expected"
    );
    expect(dataProof.attesterId.toString()).to.equal(
      attesterId.toString(),
      "actual attesterId not as expected"
    );
  });

  it("should output an epoch key", async () => {
    const id = new Identity();
    const epoch = 1028;
    const attesterId = 10210;
    const nonce = 0;
    const revealNonce = 1;
    const data = fillZero([], FIELD_COUNT);
    const chainId = 31337;

    const circuitInputs = genDataCircuitInput({
      id,
      epoch,
      nonce,
      attesterId,
      _data: data,
      revealNonce,
      chainId,
    });
    const { isValid, proof, publicSignals } = await genProofAndVerify(
      AppCircuit.proveData,
      circuitInputs
    );
    expect(isValid).to.be.true;

    const dataProof = new DataProof(publicSignals, proof);
    expect(dataProof.epoch.toString()).to.equal(epoch.toString());
    expect(dataProof.nonce.toString()).to.equal(nonce.toString());
    expect(dataProof.revealNonce.toString()).to.equal(revealNonce.toString());
    expect(dataProof.attesterId.toString()).to.equal(attesterId.toString());
    expect(dataProof.epochKey.toString()).to.equal(
      genEpochKey(
        id.secret,
        attesterId.toString(),
        epoch,
        nonce,
        chainId
      ).toString()
    );
  });

  it("should fail to prove a nonce that is above max nonce", async () => {
    const id = new Identity();
    const epoch = 1028;
    const attesterId = 10210;
    const nonce = NUM_EPOCH_KEY_NONCE_PER_EPOCH;
    const data = fillZero([], FIELD_COUNT);
    const chainId = 31337;

    const circuitInputs = genDataCircuitInput({
      id,
      epoch,
      nonce,
      attesterId,
      _data: data,
      chainId,
    });
    await new Promise<void>((rs, rj) => {
      genProofAndVerify(AppCircuit.proveData, circuitInputs)
        .then(() => rj())
        .catch(() => rs());
    });
  });

  it("should fail to prove an out of range attesterId", async () => {
    const id = new Identity();
    const epoch = 1028;
    const attesterId = BigInt(2) ** BigInt(160);
    const nonce = 0;
    const data = fillZero([], FIELD_COUNT);
    const chainId = 31337;

    const circuitInputs = genDataCircuitInput({
      id,
      epoch,
      nonce,
      attesterId,
      _data: data,
      chainId,
    });
    await new Promise<void>((rs, rj) => {
      genProofAndVerify(AppCircuit.proveData, circuitInputs)
        .then(() => rj())
        .catch(() => rs());
    });
  });

  it("should fail to prove an out of range revealNonce", async () => {
    const id = new Identity();
    const epoch = 1028;
    const attesterId = 10210;
    const nonce = 0;
    const revealNonce = 2;
    const data = fillZero([], FIELD_COUNT);
    const chainId = 31337;

    const circuitInputs = genDataCircuitInput({
      id,
      epoch,
      nonce,
      attesterId,
      _data: data,
      revealNonce,
      chainId,
    });
    await new Promise<void>((rs, rj) => {
      genProofAndVerify(AppCircuit.proveData, circuitInputs)
        .then(() => rj())
        .catch(() => rs());
    });
  });
});
