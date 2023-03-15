import React, { useState, useContext } from "react";
import { observer } from "mobx-react-lite";
import { Container, Button, Image, Grid, Message } from "semantic-ui-react";
import User from "../contexts/User";
import InfoCard from "../components/infoCard";

export default observer(() => {
  const [isIdentityRevealed, setIdentityRevealed] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const user = useContext(User);

  const copyIdentity = () => {
    navigator.clipboard.writeText(user.id);
    setIsCopied(true);
  };

  return (
    <>
      {user.hasSignedUp ? (
        <>
          <Container fluid className="user-header">
            <Grid>
              <Grid.Row columns={2}>
                <Grid.Column width={3}>
                  <Image
                    src={require("../../public/user.jpg")}
                    size="small"
                    circular
                  />
                </Grid.Column>
                <Grid.Column width={7}>
                  <Container className="info-container">
                    <span>
                      <b>My Identity:</b>
                    </span>
                    {isIdentityRevealed ? (
                      <div className="identity-container">
                        <span>{user.id}</span>
                        <Button
                          color="grey"
                          inverted
                          basic
                          onClick={copyIdentity}
                        >
                          {isCopied ? "Copied!" : "Copy"}
                        </Button>
                        <Button
                          color="grey"
                          inverted
                          basic
                          onClick={() => setIdentityRevealed(false)}
                        >
                          Hide
                        </Button>
                      </div>
                    ) : (
                      <Button
                        color="grey"
                        inverted
                        basic
                        onClick={() => setIdentityRevealed(true)}
                      >
                        Reveal
                      </Button>
                    )}
                  </Container>
                  <Container className="info-container">
                    <span>
                      <b>My Badges:</b>
                    </span>
                    <Image
                      src={require("../../public/badge.png")}
                      size="mini"
                      circular
                      inline
                    />
                  </Container>
                </Grid.Column>
              </Grid.Row>
            </Grid>
          </Container>
          <Container fluid className="user-body">
            <InfoCard
              title={"Twitter"}
              platform={"twitter"}
              hasSignedUp={user.userStates.twitter.hasSignedUp}
              data={Number(
                user.userStates.twitter.data[0] -
                  user.userStates.twitter.data[1]
              )}
              provableData={Number(
                user.userStates.twitter.provableData[0] -
                  user.userStates.twitter.provableData[1]
              )}
              color="blue"
              update={() => user.getRep("twitter")}
            />
            <InfoCard
              title={"Github Stars"}
              platform={"github"}
              hasSignedUp={user.userStates.github.hasSignedUp}
              data={Number(
                user.userStates.github.data[2] - user.userStates.github.data[3]
              )}
              provableData={Number(
                user.userStates.github.provableData[2] -
                  user.userStates.github.provableData[3]
              )}
              color="yellow"
              update={() => user.getRep("github")}
            />
            <InfoCard
              title={"Github Subscribers"}
              platform={"github"}
              hasSignedUp={user.userStates.github.hasSignedUp}
              data={Number(
                user.userStates.github.data[0] - user.userStates.github.data[1]
              )}
              provableData={Number(
                user.userStates.github.provableData[0] -
                  user.userStates.github.provableData[1]
              )}
              color="red"
              update={() => user.getRep("github")}
            />
          </Container>
        </>
      ) : (
        <Message
          warning
          header="Please Sign Up"
          content="Click the Join Button on the header, then you will be able to view your data."
        />
      )}
    </>
  );
});
