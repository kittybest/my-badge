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
          <Grid.Column width={6} verticalAlign="middle">
            {hasSignedUp ? (
              <p>
                <b>
                  rep <i>{provableData}</i>
                </b>
                (updated next epoch: {data})
              </p>
            ) : (
              <p>Not connected</p>
            )}
          </Grid.Column>
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
