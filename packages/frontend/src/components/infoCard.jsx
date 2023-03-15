import React from "react";
import { Button, Grid, Segment } from "semantic-ui-react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTwitter, faGithub } from "@fortawesome/free-brands-svg-icons";

const InfoCard = ({
  title,
  platform,
  hasSignedUp,
  data,
  provableData,
  color,
  update,
  ust,
}) => {
  const icons = {
    twitter: faTwitter,
    github: faGithub,
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
            <p className={hasSignedUp ? "connected" : "unconnected"}>
              {hasSignedUp ? "connected" : "unconnected"}
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
          <Grid.Column width={2}>
            {hasSignedUp && <Button onClick={update}>Update</Button>}
          </Grid.Column>
          <Grid.Column width={2}>
            {hasSignedUp ? (
              <Button onClick={ust}>UST</Button>
            ) : (
              <Button>Connect!</Button>
            )}
          </Grid.Column>
        </Grid.Row>
      </Grid>
    </Segment>
  );
};

export default InfoCard;