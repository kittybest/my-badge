import fs from "fs";
import path from "path";
import { deployUnirep } from "@unirep/contracts/deploy/index.js";
import hardhat from "hardhat";

main().catch((err) => {
  console.log(`Uncaught error: ${err}`);
  process.exit(1);
});

async function main() {
  const { ethers } = hardhat;

  const [signer] = await ethers.getSigners();
  const unirep = await deployUnirep(signer);
  const epochLength = 150;

  const Verifier = await ethers.getContractFactory("ProveDataVerifier");
  const verifier = await Verifier.deploy();
  await verifier.deployed();

  const Twitter = await ethers.getContractFactory("UnirepTwitter");
  const twitter = await Twitter.deploy(
    unirep.address,
    epochLength,
    verifier.address
  );
  await twitter.deployed();
  console.log(
    `Unirep app Twitter with epoch length ${epochLength} deployed to ${twitter.address}`
  );

  const Github = await ethers.getContractFactory("UnirepGithub");
  const github = await Github.deploy(
    unirep.address,
    epochLength,
    verifier.address
  );
  await github.deployed();
  console.log(
    `Unirep app Github with epoch length ${epochLength} deployed to ${github.address}`
  );

  const config = `export default {
    UNIREP_ADDRESS: '${unirep.address}',
    TWITTER_ADDRESS: '${twitter.address}',
    GITHUB_ADDRESS: '${github.address}',
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

  const configPath = path.join(__dirname, "../../../config.ts");
  await fs.promises.writeFile(configPath, config);

  console.log(`Config written to ${configPath}`);
}
