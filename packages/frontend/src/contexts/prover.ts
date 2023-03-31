import * as snarkjs from "snarkjs";
import { Circuit } from "@unirep/circuits";
import { SnarkPublicSignals, SnarkProof } from "@unirep/utils";
import { SERVER } from "../config";

export default {
  verifyProof: async (
    circuitName: Circuit | string,
    publicSignals: SnarkPublicSignals,
    proof: SnarkProof
  ) => {
    const url = new URL(`/build/${circuitName}.vkey.json`, SERVER);
    const vkey = await fetch(url.toString()).then((r) => r.json());
    return snarkjs.groth16.verify(vkey, publicSignals, proof);
  },
  genProofAndPublicSignals: async (
    circuitName: Circuit | string,
    inputs: any
  ) => {
    const wasmUrl = new URL(`/build/${circuitName}.wasm`, SERVER);
    const wasm = await fetch(wasmUrl.toString()).then((r) => r.arrayBuffer());
    const zkeyUrl = new URL(`/build/${circuitName}.zkey`, SERVER);

    const zkey = await fetch(zkeyUrl.toString()).then((r) => r.arrayBuffer());
    const { proof, publicSignals } = await snarkjs.groth16.fullProve(
      inputs,
      new Uint8Array(wasm),
      new Uint8Array(zkey)
    );
    return { proof, publicSignals };
  },
  /**
   * Get vkey from default built folder `zksnarkBuild/`
   * @param name Name of the circuit, which can be chosen from `Circuit`
   * @returns vkey of the circuit
   */
  getVKey: async (name: string | Circuit) => {
    // return require(path.join(buildPath, `${name}.vkey.json`))
  },
};
