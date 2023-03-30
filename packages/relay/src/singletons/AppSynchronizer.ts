import { Synchronizer } from "@unirep/core";
import { provider, UNIREP_ADDRESS, DB_PATH } from "../config";
import { SQLiteConnector } from "anondb/node.js";
import { DB } from "anondb/node";
import prover from "./prover";
import schema from "./schema";

class AppSynchronizer extends Synchronizer {
  isInitDB: boolean = false;

  async initDB() {
    this._db = await SQLiteConnector.create(schema, DB_PATH ?? ":memory:");
    this.isInitDB = true;
  }
}

// const db = await SQLiteConnector.create(schema, DB_PATH ?? ":memory:");

export default new AppSynchronizer({
  db: {} as DB,
  provider,
  unirepAddress: UNIREP_ADDRESS,
  prover,
});
