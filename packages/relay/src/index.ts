import path from "path";
import fs from "fs";
import express from "express";
import { provider, PRIVATE_KEY } from "./config";
import TransactionManager from "./singletons/TransactionManager";
import synchronizer from "./singletons/AppSynchronizer";
import HashchainManager from "./singletons/HashchainManager";

main().catch((err) => {
  console.log(`Uncaught error: ${err}`);
  process.exit(1);
});

async function main() {
  if (synchronizer.isInitDB) {
    await synchronizer.initDB();
  }
  await synchronizer.start();
  TransactionManager.configure(PRIVATE_KEY, provider, synchronizer._db);
  await TransactionManager.start();
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
