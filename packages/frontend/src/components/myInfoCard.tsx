import React, { useState, useContext, useEffect } from "react";
import { observer } from "mobx-react-lite";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faTwitter,
  faGithub,
  IconDefinition,
} from "@fortawesome/free-brands-svg-icons";

import User, { ATTESTERS } from "../contexts/User";
import { Title } from "../types/title";

type Props = {
  platform: string;
};

const MyInfoCard = ({ platform }: Props) => {
  const user = useContext(User);

  const icons: { [key: string]: IconDefinition } = {
    twitter: faTwitter,
    github: faGithub,
  };

  const ranking =
    user.rankings[platform === "twitter" ? "twitter" : "github_stars"];

  useEffect(() => {
    user.refreshRanking(
      platform === "twitter" ? Title.twitter : Title.githubStars
    );
  }, []);

  return (
    <div className="w-72 h-72 shadow-xl bg-card rounded-lg flex flex-col">
      <div className="bg-white basis-1/12 p-1 text-center text-2xl rounded-t-lg">
        <FontAwesomeIcon icon={icons[platform]} />
      </div>
      <div className="basis-5/12 p-2 flex">
        <div className="w-24 h-24">{ranking}</div>
      </div>
    </div>
  );
};

export default observer(MyInfoCard);
