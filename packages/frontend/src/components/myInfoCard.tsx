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

  const calculateData = (platform: string) => {
    let posField: number = 0;
    let negField: number = 1;

    return {
      provableData: user.provableData[platform]
        ? Number(
            user.provableData[platform][posField] -
              user.provableData[platform][negField]
          )
        : 0,
      data: user.data[platform]
        ? Number(user.data[platform][posField] - user.data[platform][negField])
        : 0,
    };
  };

  const ranking =
    user.rankings[platform === "twitter" ? "twitter" : "github_stars"];
  const { provableData, data } = calculateData(platform);

  useEffect(() => {
    user.refreshRanking(
      platform === "twitter" ? Title.twitter : Title.githubStars
    );
  }, []);

  return (
    <div className="w-72 h-72 shadow-xl bg-card rounded-lg flex flex-col gap-2">
      <div className="bg-white basis-1/12 p-1 text-center text-2xl rounded-t-lg">
        <FontAwesomeIcon icon={icons[platform]} />
      </div>
      <div className="basis-5/12 flex p-2 justify-around items-center">
        <div className="avatar">
          <div
            className="w-24 h-24 rounded-full ring ring-secondary ring-offset-4"
            style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            {ranking ? (
              <img
                src={require("../../public/arrow.svg")}
                className="bg-contain"
              />
            ) : (
              <img
                src={require("../../public/questionmark.png")}
                style={{ objectFit: "contain", width: "4rem", height: "4rem" }}
              />
            )}
          </div>
        </div>
        <div>
          <h2 className="text-secondary leading-loose">
            Current: <span>{provableData}</span>
          </h2>
          <h3>
            Next: <span>{data}</span>
          </h3>
        </div>
      </div>
      <div className="basis-3/12 p-2 flex"></div>
      <div className="basis-3/12 p-2"></div>
    </div>
  );
};

export default observer(MyInfoCard);
