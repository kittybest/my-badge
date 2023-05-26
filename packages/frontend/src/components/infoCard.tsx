import React, { useState } from "react";
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
import { Title } from "../types/title";

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
  hasSignedUp: boolean;
  connected: boolean;
  ranking: number;
  getRanking: () => void;
  data: number;
  provableData: number;
  color: SemanticCOLORS;
  update: () => void;
  ust: () => void;
  connect: () => void;
  error: string;
  connectLoading: boolean;
};

const InfoCard = ({
  title,
  platform,
  hasSignedUp,
  connected,
  ranking,
  getRanking,
  data,
  provableData,
  color,
  update,
  ust,
  connect,
  error,
  connectLoading,
}: Props) => {
  const icons: { [key: string]: IconDefinition } = {
    twitter: faTwitter,
    github: faGithub,
  };

  const [isUpdating, setIsUpdating] = useState(false);
  const [isUSTing, setIsUSTing] = useState(false);
  const [errorMsg, setErrorMsg] = useState(error);

  const onClickUpdate = async () => {
    if (isUpdating || isUSTing) return;

    setErrorMsg("");
    setIsUpdating(true);
    try {
      await update();
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
      await ust();
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

export default InfoCard;
