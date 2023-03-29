const fs = require("fs");
const path = require("path");

const {
  abi: AppABI,
} = require("../artifacts/contracts/UnirepApp.sol/UnirepApp.json");
const {
  abi: VerifierABI,
} = require("../artifacts/contracts/ProveDataVerifier.sol/ProveDataVerifier.json");

fs.writeFileSync(
  path.join(__dirname, "../abi/UnirepApp.json"),
  JSON.stringify(AppABI)
);

fs.writeFileSync(
  path.join(__dirname, "../abi/ProveDataVerifier.json"),
  JSON.stringify(VerifierABI)
);
