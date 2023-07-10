import React, { useState, useContext, useEffect } from "react";
import { observer } from "mobx-react-lite";
import {
  Button,
  Grid,
  Segment,
  Message,
  SemanticCOLORS,
} from "semantic-ui-react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faTwitter,
  faGithub,
  IconDefinition,
} from "@fortawesome/free-brands-svg-icons";
import { SERVER } from "../config";
import { Title } from "../types/title";
import User from "../contexts/User";

const semanticColorHex: { [key: string]: string } = {
  red: "#db2828",
  orange: "#f2711c",
  yellow: "#fbbd08",
  green: "#21ba45",
  blue: "#2185d0",
};

type Props = {
  title: Title;
  platform: string;
  color: SemanticCOLORS;
  _error: string;
};

const InfoCard = ({ title, platform, color, _error }: Props) => {
  const icons: { [key: string]: IconDefinition } = {
    twitter: faTwitter,
    github: faGithub,
  };

  const user = useContext(User);

  const [isUpdating, setIsUpdating] = useState(false);
  const [isUSTing, setIsUSTing] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [connectLoading, setConnectLoading] = useState(false);

  const provableData = Number(
    user.provableData[platform]
      ? user.provableData[platform][0] - user.provableData[platform][1]
      : 0
  );
  const data = Number(
    user.data[platform] ? user.data[platform][0] - user.data[platform][1] : 0
  );
  const connected = user.accessTokens[platform] !== undefined;
  const hasSignedUp = user.hasSignedUp[platform];
  const ranking = user.rankings[title];

  const onClickUpdate = async () => {
    if (isUpdating || isUSTing) return;

    setErrorMsg("");
    setIsUpdating(true);
    try {
      await user.getRep(platform);
    } catch (e: any) {
      setErrorMsg(e.toString());
    }
    setIsUpdating(false);
  };

  const onClickUST = async () => {
    if (isUpdating || isUSTing) return;

    setErrorMsg("");
    setIsUSTing(true);
    try {
      await user.stateTransition(platform);
    } catch (e: any) {
      setErrorMsg(e.toString());
    }
    setIsUSTing(false);
  };

  const processedTitle = (title: string) => {
    const words = title.split("_");
    const formattedWords = words.map(
      (word) => word.charAt(0).toUpperCase() + word.slice(1)
    );
    return formattedWords.join(" ");
  };

  const calculatedProgressWidth = () => {
    /* The width of progress: 5% to 80% */
    let ret: number[] = [5, 5]; // [provableData, data]
    if (provableData !== 0 && provableData > data)
      ret = [80, 5 + 75 * (data / provableData)];
    else if (data !== 0 && data > provableData)
      ret = [5 + 75 * (provableData / data), 80];
    else if (data === provableData && data !== 0 && provableData !== 0)
      ret = [80, 80];
    return ret;
  };

  const getRanking = () => {
    user.refreshRanking(title);
  };

  const connect = async () => {
    if (connectLoading) return;

    console.log("join through", platform);
    setErrorMsg("");
    setConnectLoading(true);

    // authorization through relay
    const currentUrl = new URL(window.location.href);
    const dest = new URL("/user", currentUrl.origin);
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
      setErrorMsg("Something weird just happened");
    }
  };

  useEffect(() => {
    setErrorMsg(_error);
  }, [_error]);

  return (
    <Segment color={color}>
      <Grid>
        <Grid.Row stretched>
          {/* Platform Icon */}
          <Grid.Column width={1}>
            <FontAwesomeIcon icon={icons[platform]} />
          </Grid.Column>
          {/* Platform condition */}
          <Grid.Column width={3}>
            <h3>{processedTitle(title)}</h3>
            <p className={connected ? "connected" : "unconnected"}>
              {connected ? "connected" : "unconnected"}
            </p>
          </Grid.Column>
          {/* Ranking of the Title */}
          <Grid.Column width={1} verticalAlign="middle">
            <h2 className="ranking" onClick={getRanking}>
              {ranking ?? "??"}
            </h2>
          </Grid.Column>
          {/* Data of the Title */}
          {hasSignedUp ? (
            <Grid.Column width={7} verticalAlign="middle">
              <div className="data-info">
                <div
                  className="progress"
                  style={{
                    width: `${calculatedProgressWidth()[0]}%`,
                    backgroundColor: `${semanticColorHex[color]}`,
                  }}
                ></div>
                <span>{provableData}</span>
              </div>
              <div className="data-info">
                <div
                  className="progress"
                  style={{ width: `${calculatedProgressWidth()[1]}%` }}
                ></div>
                <span>{data}</span>
              </div>
            </Grid.Column>
          ) : (
            <Grid.Column width={7} verticalAlign="middle">
              <p>Not connected</p>
            </Grid.Column>
          )}
          {!hasSignedUp && (
            <Grid.Column width={4}>
              <Button onClick={connect} loading={connectLoading}>
                Connect!
              </Button>
            </Grid.Column>
          )}
          {hasSignedUp && !connected && (
            <Grid.Column width={2}>
              <Button onClick={connect} loading={connectLoading}>
                Connect!
              </Button>
            </Grid.Column>
          )}
          {hasSignedUp && connected && (
            <Grid.Column width={2}>
              <Button onClick={onClickUpdate} loading={isUpdating}>
                Update
              </Button>
            </Grid.Column>
          )}
          {hasSignedUp && (
            <Grid.Column width={2}>
              <Button onClick={onClickUST} loading={isUSTing}>
                UST
              </Button>
            </Grid.Column>
          )}
        </Grid.Row>
        {errorMsg.length > 0 && (
          <Grid.Row>
            <Grid.Column>
              <Message error header="Oops!" content={errorMsg} />
            </Grid.Column>
          </Grid.Row>
        )}
      </Grid>
    </Segment>
  );
};

export default observer(InfoCard);
