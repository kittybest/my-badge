import fs from "fs";
import path from "path";
import UNIREP_TWITTER_ABI from "../artifacts/contracts/UnirepTwitter.sol/UnirepTwitter.json";
import UNIREP_GITHUB_ABI from "../artifacts/contracts/UnirepGithub.sol/UnirepGithub.json";
import Verifier_ABI from "../artifacts/contracts/ProveDataVerifier.sol/ProveDataVerifier.json";

fs.writeFileSync(
  path.join(__dirname, "../abi/UnirepTwitter.json"),
  JSON.stringify(UNIREP_TWITTER_ABI.abi)
);

fs.writeFileSync(
  path.join(__dirname, "../abi/UnirepGithub.json"),
  JSON.stringify(UNIREP_GITHUB_ABI.abi)
);

fs.writeFileSync(
  path.join(__dirname, "../abi/ProveDataVerifier.json"),
  JSON.stringify(Verifier_ABI.abi)
);
