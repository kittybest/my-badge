import React, { useState, useContext, useEffect } from "react";
import { observer } from "mobx-react-lite";
import Jdenticon from "react-jdenticon";

type Props = {
  epochKey: string;
  data: number;
  txHash: string;
  rank: number;
};

const RankingCard = ({ epochKey, data, txHash, rank }: Props) => {
  return (
    <div className="card w-52 shadow-xl bg-card">
      <figure className="bg-white">
        <Jdenticon size="180" value={epochKey} />
      </figure>
      <div className="card-body p-4">
        <h2 className="card-title">Score: {data}</h2>
        <div className="card-actions justify-evenly">
          <button className="btn btn-secondary">Verify</button>
          <button className="btn btn-primary">
            <img
              className="w-4 h-4"
              src={require("../../public/arrow-up-right.svg")}
            />
          </button>
        </div>
      </div>
    </div>
  );
};

export default observer(RankingCard);
