import React, { useState, useContext, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { observer } from "mobx-react-lite";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { IconProp } from "@fortawesome/fontawesome-svg-core";
import { faTwitter, faGithub } from "@fortawesome/free-brands-svg-icons";

import {
  faCheck,
  faDownload,
  faBan,
  faRotate,
} from "@fortawesome/free-solid-svg-icons";

import User, { ATTESTERS } from "../contexts/User";
import { useError } from "../contexts/Error";
import { Title } from "../types/title";
import { SERVER } from "../config";

type Props = {
  platform: string;
};

const MyInfoCard = ({ platform }: Props) => {
  const user = useContext(User);
  const Error = useError();
  const [params, setParams] = useSearchParams();

  const [isUpdating, setIsUpdating] = useState(false);
  const [isUSTing, setIsUSTing] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [remainingTime, setRemainingTime] = useState<number | String>(0);

  const icons: { [key: string]: IconProp } = {
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
  const connected = user.accessTokens[platform] !== undefined;
  const hasSignedUp = user.hasSignedUp[platform];
  const { provableData, data } = calculateData(platform);

  const updateTimer = async () => {
    if (!user.userState) {
      setRemainingTime("Loading...");
      return;
    }
    if (hasSignedUp) {
      const latestTransitionedEpoch =
        await user.userState.latestTransitionedEpoch(ATTESTERS[platform]);
      const currentEpoch = user.userState.sync.calcCurrentEpoch(
        ATTESTERS[platform]
      );
      if (latestTransitionedEpoch !== currentEpoch) {
        setRemainingTime("UST");
        return;
      }
      const time = user.userState.sync.calcEpochRemainingTime(
        ATTESTERS[platform]
      );
      setRemainingTime(time);
    }
  };

  const onClickUST = async () => {
    if (isUpdating || isUSTing) return;
    if (typeof remainingTime === "number" && remainingTime > 0) {
      Error.errorHandler("It's not time to do user state transition yet.");
      return;
    }

    setIsUSTing(true);
    try {
      await user.stateTransition(platform);
    } catch (e: any) {
      Error.errorHandler(e.toString());
    }
    setIsUSTing(false);
  };

  const connect = async () => {
    if (isConnecting || isUSTing || isUpdating) return;

    setIsConnecting(true);

    // authorization through relay
    const currentUrl = new URL(window.location.href);
    const dest = new URL("/", currentUrl.origin);
    const isSigningUp: boolean = !user.hasSignedUp[platform];

    if (platform === "twitter") {
      const url = new URL("/api/oauth/twitter", SERVER);
      url.searchParams.set("redirectDestination", dest.toString());
      url.searchParams.set("isSigningUp", isSigningUp.toString());
      window.location.replace(url.toString());
    } else if (platform === "github") {
      const url = new URL("/api/oauth/github", SERVER);
      url.searchParams.set("redirectDestination", dest.toString());
      url.searchParams.set("isSigningUp", isSigningUp.toString());
      window.location.replace(url.toString());
    } else {
      Error.errorHandler("Failed to connect, something weird just happened");
    }
  };

  const signup = async (platform: string, access_token: string) => {
    setIsConnecting(true);
    try {
      await user.signup(platform, access_token);
      await user.getRep(platform);
    } catch (e: any) {
      Error.errorHandler(e.toString());
      setIsConnecting(false);
    }
    setIsConnecting(false);
  };

  useEffect(() => {
    user.refreshRanking(
      platform === "twitter" ? Title.twitter : Title.githubStars
    );
  }, []);

  useEffect(() => {
    setInterval(() => {
      updateTimer();
    }, 1000);
  }, []);

  useEffect(() => {
    const _platform: string | null = params.get("platform");
    const access_token: string | null = params.get("access_token");
    const signupError: string | null = params.get("signupError");
    const isSigningUp: string | null = params.get("isSigningUp");
    if (!_platform) {
      console.log("No platform returns");
    } else if (_platform !== platform) {
      console.log("none of my business.");
    } else if (access_token) {
      if (isSigningUp && parseInt(isSigningUp)) {
        signup(platform, access_token);
      } else {
        user.storeAccessToken(platform, access_token);
      }
    } else if (signupError) {
      Error.errorHandler(`Connect to ${platform} error: ${signupError}`);
    }
    setParams("");
  }, []);

  return (
    <div className="w-72 h-72 shadow-xl bg-card rounded-lg flex flex-col gap-2">
      <div className="bg-white basis-1/12 p-1 text-center text-2xl rounded-t-lg">
        <FontAwesomeIcon icon={icons[platform]} />
      </div>
      {/* connect button */}
      {!hasSignedUp && (
        <div className="basis-11/12 flex justify-center items-center">
          <button className="btn btn-primary btn-lg btn-wide" onClick={connect}>
            {isConnecting ? (
              <span className="loading loading-spinner loading-md"></span>
            ) : (
              "Connect"
            )}
          </button>
        </div>
      )}

      {/* user status */}
      {hasSignedUp && (
        <div className="basis-5/12 flex p-2 justify-around items-center">
          <div className="avatar">
            <div
              className="w-20 h-20 rounded-full ring ring-secondary ring-offset-4"
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
                  style={{
                    objectFit: "contain",
                    width: "4rem",
                    height: "4rem",
                  }}
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
      )}

      {/* main action buttons */}
      {hasSignedUp && (
        <div className="basis-3/12 p-2 flex justify-around items-center">
          {connected ? (
            <button className="btn btn-success">
              <FontAwesomeIcon icon={faCheck as IconProp} size="lg" />
            </button>
          ) : (
            <button className="btn btn-neutral">
              <FontAwesomeIcon
                icon={faBan as IconProp}
                size="lg"
                color="white"
              />
            </button>
          )}
          <button className="btn btn-warning">
            <FontAwesomeIcon icon={faRotate as IconProp} size="lg" />
          </button>
          <button className="btn btn-info">
            <FontAwesomeIcon icon={faDownload as IconProp} size="lg" />
          </button>
        </div>
      )}

      {/* UST button */}
      {hasSignedUp && (
        <div className="basis-3/12 p-2">
          <div className="text-center">
            <button
              className="btn btn-primary btn-xl btn-wide"
              onClick={onClickUST}
            >
              {isUSTing ? (
                <span className="loading loading-spinner loading-xs"></span>
              ) : (
                remainingTime
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default observer(MyInfoCard);
