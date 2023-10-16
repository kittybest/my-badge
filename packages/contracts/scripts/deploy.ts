import fs from "fs";
import path from "path";
import { deployUnirep } from "@unirep/contracts/deploy/index.js";
import hardhat from "hardhat";
import { config } from "dotenv";
config();

main().catch((err) => {
  console.log(`Uncaught error: ${err}`);
  process.exit(1);
});

async function main() {
  const { ethers } = hardhat;

  const network = await ethers.provider.getNetwork();

  const [signer] = await ethers.getSigners();
  const epochLength = 300;
  let unirepAddress: string | undefined;

  if (network.name === "sepolia" && process.env.UNIREP_ADDRESS) {
    unirepAddress = process.env.UNIREP_ADDRESS;
  }

  // deploy Unirep contract
  if (!unirepAddress) {
    const unirep = await deployUnirep(signer);
    unirepAddress = unirep.address;
  }

  console.log("unirep address:", unirepAddress);

  // deploy Verifier
  const Verifier = await ethers.getContractFactory("ProveDataVerifier");
  const verifier = await Verifier.deploy();
  await verifier.deployed();

  // deploy Twitter
  const Twitter = await ethers.getContractFactory("UnirepTwitter");
  const twitter = await Twitter.deploy(
    unirepAddress,
    epochLength,
    verifier.address
  );
  await twitter.deployed();
  console.log(
    `Unirep app Twitter with epoch length ${epochLength} deployed to ${twitter.address}`
  );

  const Github = await ethers.getContractFactory("UnirepGithub");
  const github = await Github.deploy(
    unirepAddress,
    epochLength,
    verifier.address
  );
  await github.deployed();
  console.log(
    `Unirep app Github with epoch length ${epochLength} deployed to ${github.address}`
  );

  const config = `export default {
    UNIREP_ADDRESS: '${unirepAddress}',
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
