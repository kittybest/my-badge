const { appProver } = require("@unirep-app/circuits");
const { AppUserState } = require("../src/userState");
const { Synchronizer } = require("@unirep/core");

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
    prover: appProver,
  });
  unirep.pollRate = 150;
  await unirep.start();
  await unirep.waitForSync();
  return unirep;
}

async function genUserState(provider, address, userIdentity, attesterId, _db) {
  const synchronizer = await genUnirepState(provider, address, attesterId, _db);
  return new AppUserState(synchronizer, userIdentity, attesterId.toString());
}

module.exports = { genUserState };
