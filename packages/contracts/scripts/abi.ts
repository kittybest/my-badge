import fs from "fs";
import path from "path";
import UNIREPAPP_ABI from "../artifacts/contracts/UnirepApp.sol/UnirepApp.json";

fs.writeFileSync(
  path.join(__dirname, "../abi/UnirepApp.json"),
  JSON.stringify(UNIREPAPP_ABI)
);
