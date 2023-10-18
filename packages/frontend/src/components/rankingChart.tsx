import React, { useState, useContext, useEffect } from "react";
import { observer } from "mobx-react-lite";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faTwitter,
  faGithub,
  IconDefinition,
} from "@fortawesome/free-brands-svg-icons";

import RankingCard from "./rankingCard";

type Props = {
  platform: string;
  ranking: any[];
};

const RankingChart = ({ platform, ranking }: Props) => {
  const icons: { [key: string]: IconDefinition } = {
    twitter: faTwitter,
    github: faGithub,
  };

  return (
    <div className="w-4/5 h-72 flex rounded-lg border-white border-2">
      <div className="w-12 border-r-2 border-white flex justify-center items-center text-xl">
        <FontAwesomeIcon icon={icons[platform.split("_")[0]]} />
      </div>
      <div className="w-full p-4 flex overflow-scroll gap-8">
        {ranking.map((d, i) => (
          <RankingCard
            epochKey={d.epochKey}
            data={d.data}
            txHash={d.transactionHash}
            rank={i + 1}
          />
        ))}
      </div>
      <div className="w-12 border-l-2 border-white "></div>
    </div>
  );
};

export default observer(RankingChart);
