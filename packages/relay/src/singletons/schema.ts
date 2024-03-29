import { schema } from "@unirep/core";
import { nanoid } from "nanoid";
import { TableData } from "anondb/node";

const _schema = [
  {
    name: "OAuthState",
    rows: [
      {
        name: "createdAt",
        type: "Int",
        default: () => +new Date(),
      },
      ["type", "String"],
      ["redirectDestination", "String"],
      ["isSigningUp", "Bool", { optional: true }],
      ["data", "String", { optional: true }],
    ],
  },
  {
    name: "SignupCode",
    rows: [
      ["signupId", "String"],
      ["usedAt", "Int", { optional: true }],
      {
        name: "createdAt",
        type: "Int",
        default: () => +new Date(),
      },
    ],
  },
  {
    name: "AccountTransaction",
    primaryKey: "signedData",
    rows: [
      ["signedData", "String"],
      ["address", "String"],
      ["nonce", "Int"],
    ],
  },
  {
    name: "AccountNonce",
    primaryKey: "address",
    rows: [
      ["address", "String"],
      ["nonce", "Int"],
    ],
  },
  {
    name: "RankingData",
    rows: [
      ["title", "String"],
      ["data", "Int"],
      ["attesterId", "String"],
      ["transactionHash", "String"],
      ["epochKey", "String"],
      {
        name: "createdAt",
        type: "Int",
        default: () => +new Date(),
      },
    ],
  },
];

// export default [...schema, ..._schema]

export default _schema
  .map(
    (obj) =>
      ({
        ...obj,
        primaryKey: obj.primaryKey || "_id",
        rows: [
          ...obj.rows,
          {
            name: "_id",
            type: "String",
            default: () => nanoid(),
          },
        ],
      } as TableData)
  )
  .concat(schema);
