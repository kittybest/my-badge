import path from "path";
import fs from "fs";
import express from "express";
import { SQLiteConnector } from "anondb/node.js";

import { provider, PRIVATE_KEY, UNIREP_ADDRESS, DB_PATH } from "./config";
import TransactionManager from "./singletons/TransactionManager";
import prover from "./singletons/prover";
import schema from "./singletons/schema";
import AppSynchronizer from "./singletons/Synchronizer";

main().catch((err) => {
  console.log(`Uncaught error: ${err}`);
  process.exit(1);
});

async function main() {
  // database
  const db = await SQLiteConnector.create(schema, DB_PATH ?? ":memory:");

  const synchronizer = new AppSynchronizer(
    db,
    provider,
    UNIREP_ADDRESS,
    prover
  );
  await synchronizer.start();

  // pushing blocks to update block.timestamp on chain while running hardhat in local
  const network = await synchronizer.provider.getNetwork();
  if (network.chainId === 31337) {
    // hardhat dev nodes need to have their state refreshed manually
    // for view only functions
    setInterval(() => synchronizer.provider.emit("evm_mine", []), 12000);
  }

  TransactionManager.configure(PRIVATE_KEY, provider, db);
  await TransactionManager.start();

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
    route(app, synchronizer.db, synchronizer);
  }
}
