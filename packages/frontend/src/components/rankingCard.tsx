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
    <div className="card w-96 bg-base-100 shadow-xl">
      <Jdenticon size="48" value={epochKey} />
    </div>
  );
};

export default observer(RankingCard);
