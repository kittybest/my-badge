import { useState, useContext, useEffect } from "react";
import { observer } from "mobx-react-lite";
import { useSearchParams } from "react-router-dom";
import { Container, Button, Image, Grid, Message } from "semantic-ui-react";
import User from "../contexts/User";
import { SERVER } from "../config";
import InfoCard from "../components/infoCard";
import { Title } from "../types/title";

export default observer(() => {
  const [isIdentityRevealed, setIdentityRevealed] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [errorMsg, setErrorMsg] = useState<{ [key: string]: string }>({
    twitter: "",
    github: "",
  });
  const [connectLoading, setConnectLoading] = useState<{
    [key: string]: boolean;
  }>({
    twitter: false,
    github: false,
  });
  const user = useContext(User);
  const [params, setParams] = useSearchParams();

  const copyIdentity = () => {
    navigator.clipboard.writeText(user.id);
    setIsCopied(true);
  };

  const signup = async (platform: string, access_token: string) => {
    let tmpLoading = { ...connectLoading };
    tmpLoading[platform] = true;
    setConnectLoading(tmpLoading);
    try {
      await user.signup(platform, access_token);
      await user.getRep(platform);
    } catch (e) {
      setErrorMsg({ ...errorMsg });
      tmpLoading[platform] = false;
      setConnectLoading(tmpLoading);
    }
  };

  useEffect(() => {
    const platform: string | null = params.get("platform");
    const access_token: string | null = params.get("access_token");
    const signupError: string | null = params.get("signupError");
    const isSigningUp: string | null = params.get("isSigningUp");
    if (!platform) {
      console.log("No platform returns");
    } else if (platform && access_token) {
      if (isSigningUp && parseInt(isSigningUp)) {
        signup(platform, access_token);
      } else {
        user.storeAccessToken(platform, access_token);
      }
    } else if (signupError) {
      let tmpError = { ...errorMsg };
      tmpError[platform] = signupError;
      setErrorMsg(tmpError);
    }
    setParams("");
  }, []);

  return (
    <>
      {user.hasSignedUp ? (
        <>
          <Container fluid className="user-header">
            <Grid>
              <Grid.Row columns={2}>
                <Grid.Column width={3}>
                  <Image
                    onClick={() => user.refreshRanking(Title.githubStars)}
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
              title={Title.twitter}
              platform={"twitter"}
              color="blue"
              _error={errorMsg.twitter}
            />
            <InfoCard
              title={Title.githubStars}
              platform={"github"}
              color="yellow"
              _error={errorMsg.github}
            />
            <InfoCard
              title={Title.githubFollowers}
              platform={"github"}
              color="red"
              _error={errorMsg.github}
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
