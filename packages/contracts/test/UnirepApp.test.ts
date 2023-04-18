import { ethers } from "hardhat";
import { deployUnirep } from "@unirep/contracts/deploy";
import { genRandomSalt, ZkIdentity, stringifyBigInts } from "@unirep/utils";
import { schema } from "@unirep/core";
import { BuildOrderedTree, Circuit } from "@unirep/circuits";
import { appProver as prover } from "@unirep-app/circuits";
import { DB, SQLiteConnector } from "anondb/node";
import { genUserState as _genUserState } from "./utils";

async function genUserState(id, app) {
  // generate a user state
  const db = await SQLiteConnector.create(schema, ":memory:");
  const unirepAddress = await app.unirep();
  const attesterId = BigInt(app.address);
  const userState = await _genUserState(
    ethers.provider,
    unirepAddress,
    id,
    attesterId,
    db
  );

  await userState.waitForSync();
  return userState;
}

describe("Unirep App", function () {
  let unirep: any;
  let app: any;
  let verifier: any;

  // epoch length
  const epochLength = 30;
  let startTime = 0;
  // generate random user id
  const id = new ZkIdentity();
  // graffiti preimage
  const graffitiPreImage = genRandomSalt();

  it("deployment", async function () {
    const [deployer] = await ethers.getSigners();
    unirep = await deployUnirep(deployer);

    const Verifier = await ethers.getContractFactory("ProveDataVerifier");
    verifier = await Verifier.deploy();
    await verifier.deployed();

    const App = await ethers.getContractFactory("UnirepApp");
    app = await App.deploy(unirep.address, epochLength, verifier.address);
    await app.deployed();
    startTime = (await unirep.attesterStartTimestamp(app.address)).toNumber();
  });

  it("user sign up", async () => {
    const userState = await genUserState(id, app);

    // generate
    const { publicSignals, proof } = await userState.genUserSignUpProof();
    await app.userSignUp(publicSignals, proof).then((t) => t.wait());
  });

  it("submit attestations", async () => {
    const userState = await genUserState(id, app);

    const nonce = 0;
    const { publicSignals, proof, epochKey, epoch } =
      await userState.genEpochKeyProof({ nonce });
    await unirep
      .verifyEpochKeyProof(publicSignals, proof)
      .then((t: any) => t.wait());

    const field = 0;
    const val = 10;
    await app
      .submitAttestation(epochKey, epoch, field, val)
      .then((t) => t.wait());
    userState.sync.stop();
  });

  it("(attester/relayer) process attestations", async () => {
    const userState = await genUserState(id, app);
    const epoch = await userState.sync.loadCurrentEpoch();
    await ethers.provider.send("evm_increaseTime", [epochLength]);
    await ethers.provider.send("evm_mine", []);

    const preimages = await userState.sync.genEpochTreePreimages(epoch);
    const { circuitInputs } = BuildOrderedTree.buildInputsForLeaves(preimages);
    const r = await prover.genProofAndPublicSignals(
      Circuit.buildOrderedTree,
      stringifyBigInts(circuitInputs)
    );
    const { publicSignals, proof } = new BuildOrderedTree(
      r.publicSignals,
      r.proof,
      prover
    );
    await unirep
      .sealEpoch(epoch, app.address, publicSignals, proof)
      .then((t) => t.wait());
    userState.sync.stop();
  });

  it("user state transition", async () => {
    const oldEpoch = await unirep.attesterCurrentEpoch(app.address);
    const timestamp = Math.floor(+new Date() / 1000);
    const waitTime = startTime + epochLength - timestamp;
    for (;;) {
      await new Promise((resolve) => setTimeout(resolve, waitTime * 1000));
      await ethers.provider.send("evm_mine", []);
      const newEpoch = await unirep.attesterCurrentEpoch(app.address);
      if (oldEpoch.toNumber() + 1 == newEpoch.toNumber()) break;
    }
    const newEpoch = await unirep.attesterCurrentEpoch(app.address);
    const userState = await genUserState(id, app);
    const { publicSignals, proof } =
      await userState.genUserStateTransitionProof({
        toEpoch: newEpoch.toNumber(),
      });
    await unirep
      .userStateTransition(publicSignals, proof)
      .then((t) => t.wait());
  });

  it("proof data", async function () {
    const userState = await genUserState(id, app);
    const { publicSignals, proof } = await userState.genDataProof({});
    await app.submitDataProof(publicSignals, proof).then((t) => t.wait());
  });
});
