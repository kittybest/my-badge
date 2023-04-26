import path from "path";
import fs from "fs";
import express from "express";
import { ethers } from "ethers";
import { SQLiteConnector } from "anondb/node.js";

import {
  provider,
  PRIVATE_KEY,
  UNIREP_ADDRESS,
  DB_PATH,
  TWITTER_ADDRESS,
  GITHUB_ADDRESS,
} from "./config";
import UNIREP_APP_ABI from "@unirep-app/contracts/abi/UnirepApp.json";
import TransactionManager from "./singletons/TransactionManager";
import prover from "./singletons/prover";
import schema from "./singletons/schema";
import HashchainManager from "./singletons/HashchainManager";
import AppSynchronizer from "./singletons/Synchronizer";

main().catch((err) => {
  console.log(`Uncaught error: ${err}`);
  process.exit(1);
});

async function main() {
  // database
  const db = await SQLiteConnector.create(schema, DB_PATH ?? ":memory:");

  // contracts
  const twitterContract = new ethers.Contract(
    TWITTER_ADDRESS,
    UNIREP_APP_ABI,
    provider
  );
  const githubContract = new ethers.Contract(
    GITHUB_ADDRESS,
    UNIREP_APP_ABI,
    provider
  );

  const synchronizer = new AppSynchronizer(
    db,
    provider,
    UNIREP_ADDRESS,
    prover,
    [twitterContract, githubContract]
  );
  await synchronizer.start();
  TransactionManager.configure(PRIVATE_KEY, provider, synchronizer._db);
  await TransactionManager.start();
  HashchainManager.configure(synchronizer);
  HashchainManager.startDaemon();

  const app = express();
  const port = process.env.PORT ?? 8000;
  app.listen(port, () => console.log(`Listening on port ${port}`));
  app.use("*", (req, res, next) => {
    res.set("access-control-allow-origin", "*");
    res.set("access-control-allow-headers", "*");
    next();
  });
  app.use(express.json());
  app.use("/build", express.static(path.join(__dirname, "../keys")));

  // import all non-index files from this folder
  const routeDir = path.join(__dirname, "routes");
  const routes = await fs.promises.readdir(routeDir);
  for (const routeFile of routes) {
    const { default: route } = await import(path.join(routeDir, routeFile));
    route(app, synchronizer._db, synchronizer);
  }
}
