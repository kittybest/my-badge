import { ethers } from "hardhat";
import { Identity } from "@semaphore-protocol/identity";
import { deployUnirep } from "@unirep/contracts/deploy";
import { genRandomSalt } from "@unirep/utils";
import { schema } from "@unirep/core";
import { SQLiteConnector } from "anondb/node";
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

  await userState.start();
  await userState.waitForSync();
  return userState;
}

describe("Unirep App", function () {
  let unirep: any;
  let app: any;
  let verifier: any;

  // epoch length
  const epochLength = 30;
  // generate random user id
  const id = new Identity();
  // graffiti preimage

  it("deployment", async function () {
    const [deployer] = await ethers.getSigners();
    unirep = await deployUnirep(deployer);

    const Verifier = await ethers.getContractFactory("ProveDataVerifier");
    verifier = await Verifier.deploy();
    await verifier.deployed();

    const App = await ethers.getContractFactory("UnirepTwitter");
    app = await App.deploy(unirep.address, epochLength, verifier.address);
    await app.deployed();
  });

  it("user sign up", async () => {
    const userState = await genUserState(id, app);

    // generate
    const { publicSignals, proof } = await userState.genUserSignUpProof();
    await app.userSignUp(publicSignals, proof).then((t) => t.wait());
    userState.stop();
  });

  it("submit attestations", async () => {
    const userState = await genUserState(id, app);

    const nonce = 0;
    // const { publicSignals, proof, epochKey, epoch } =
    //   await userState.genEpochKeyProof({ nonce });
    const epochKeyProof = await userState.genEpochKeyProof({ nonce });
    await epochKeyProof.verify();

    const field = 0;
    const val = 10;
    await app
      .submitAttestation(
        epochKeyProof.epochKey,
        epochKeyProof.epoch,
        field,
        val
      )
      .then((t) => t.wait());
    userState.stop();
  });

  it("user state transition", async () => {
    await ethers.provider.send("evm_increaseTime", [epochLength]);
    await ethers.provider.send("evm_mine", []);

    const newEpoch = await unirep.attesterCurrentEpoch(app.address);
    const userState = await genUserState(id, app);
    const { publicSignals, proof } =
      await userState.genUserStateTransitionProof({
        toEpoch: newEpoch,
      });
    await unirep
      .userStateTransition(publicSignals, proof)
      .then((t) => t.wait());
    userState.stop();
  });

  it("proof data", async function () {
    const userState = await genUserState(id, app);
    const chainId = await unirep.chainid();
    const dataProof = await userState.genDataProof({
      attesterId: app.address,
      chainId,
    });
    await dataProof.verify();

    await app
      .submitDataProof(dataProof.publicSignals, dataProof.proof)
      .then((t) => t.wait());
    userState.stop();
  });
});
