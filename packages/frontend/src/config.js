import { ethers } from "ethers";
import config from "../../../config";
import Unirep from "@unirep/contracts/artifacts/contracts/Unirep.sol/Unirep.json";

export const UNIREP_ADDRESS = config.UNIREP_ADDRESS;

const TWITTER_ADDRESS = config.TWITTER_ADDRESS;
const GITHUB_ADDRESS = config.GITHUB_ADDRESS;
export const ATTESTERS = {
  twitter: TWITTER_ADDRESS,
  github: GITHUB_ADDRESS,
};

export const ETH_PROVIDER_URL = config.ETH_PROVIDER_URL;

export const provider = ETH_PROVIDER_URL.startsWith("http")
  ? new ethers.providers.JsonRpcProvider(ETH_PROVIDER_URL)
  : new ethers.providers.WebSocketProvider(ETH_PROVIDER_URL);

export const SERVER = "http://localhost:3001";
export const KEY_SERVER = "https://localhost:3001/build";

export const UNIREP_ABI = Unirep.abi;
