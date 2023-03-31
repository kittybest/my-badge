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

type Props = {
  title: string;
  platform: string;
  hasSignedUp: boolean;
  connected: boolean;
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

  const onClickUpdate = () => {
    if (isUpdating || isUSTing) return;

    setErrorMsg("");
    setIsUpdating(true);
    try {
      update();
    } catch (e: any) {
      setErrorMsg(e.toString());
    }
    setIsUpdating(false);
  };

  const onClickUST = () => {
    if (isUpdating || isUSTing) return;

    setErrorMsg("");
    setIsUSTing(true);
    try {
      ust();
    } catch (e: any) {
      setErrorMsg(e.toString());
    }
    setIsUSTing(false);
  };

  return (
    <Segment color={color}>
      <Grid>
        <Grid.Row stretched>
          <Grid.Column width={1}>
            <FontAwesomeIcon icon={icons[platform]} />
          </Grid.Column>
          <Grid.Column width={4}>
            <h3>{title}</h3>
            <p className={connected ? "connected" : "unconnected"}>
              {connected ? "connected" : "unconnected"}
            </p>
          </Grid.Column>
          <Grid.Column width={7} verticalAlign="middle">
            {hasSignedUp ? (
              <p>
                <b>
                  Rank <i>???</i> with rep <i>{provableData}</i>
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
