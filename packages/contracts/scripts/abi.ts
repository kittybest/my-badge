import fs from "fs";
import path from "path";
import UNIREPAPP_ABI from "../artifacts/contracts/UnirepApp.sol/UnirepApp.json";
import Verifier_ABI from "../artifacts/contracts/ProveDataVerifier.sol/ProveDataVerifier.json";

fs.writeFileSync(
  path.join(__dirname, "../abi/UnirepApp.json"),
  JSON.stringify(UNIREPAPP_ABI.abi)
);

fs.writeFileSync(
  path.join(__dirname, "../abi/ProveDataVerifier.json"),
  JSON.stringify(Verifier_ABI.abi)
);
