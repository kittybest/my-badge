import fs from "fs";
import path from "path";
import url from "url";
import { createRequire } from "module";
import { deployUnirep } from "@unirep/contracts/deploy/index.js";
import hardhat from "hardhat";
const { ethers } = hardhat;

const require = createRequire(import.meta.url);
const __dirname = path.dirname(url.fileURLToPath(import.meta.url));

const UnirepApp = require("../abi/UnirepApp.json");

const [signer] = await ethers.getSigners();
const unirep = await deployUnirep(signer);
const epochLength = 150;

const App = await ethers.getContractFactory("UnirepApp");

const app1 = await App.deploy(unirep.address, epochLength);
await app1.deployed();
console.log(
  `Unirep app 1 with epoch length ${epochLength} deployed to ${app1.address}`
);

const app2 = await App.deploy(unirep.address, epochLength);
await app2.deployed();
console.log(
  `Unirep app 2 with epoch length ${epochLength} deployed to ${app2.address}`
);

const config = `module.exports = {
  UNIREP_ADDRESS: '${unirep.address}',
  TWITTER_ADDRESS: '${app1.address}',
  GITHUB_ADDRESS: '${app2.address}',
  ETH_PROVIDER_URL: '${hardhat.network.config.url ?? ""}',
  ${
    Array.isArray(hardhat.network.config.accounts)
      ? `PRIVATE_KEY: '${hardhat.network.config.accounts[0]}',`
      : `/**
    This contract was deployed using a mnemonic. The PRIVATE_KEY variable needs to be set manually
  **/`
  }
}
`;

const configPath = path.join(__dirname, "../../../config.js");
await fs.promises.writeFile(configPath, config);

console.log(`Config written to ${configPath}`);
