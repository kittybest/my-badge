import { Synchronizer } from "@unirep/core";
import { Prover } from "@unirep/circuits";

import { appProver } from "@unirep-app/circuits";
// import AppProver from "../../circuits/src/appProver";
import { AppUserState } from "../src/userState";

async function genUnirepState(
  provider,
  unirepAddress,
  unirepSocialAddress,
  _db
) {
  const unirep = new Synchronizer({
    unirepAddress,
    provider,
    attesterId: BigInt(unirepSocialAddress),
    prover: appProver as Prover,
  });
  unirep.pollRate = 150;
  await unirep.start();
  await unirep.waitForSync();
  return unirep;
}

export async function genUserState(
  provider,
  address,
  userIdentity,
  attesterId,
  _db
) {
  const synchronizer = await genUnirepState(provider, address, attesterId, _db);
  return new AppUserState(synchronizer, userIdentity, attesterId.toString());
}
