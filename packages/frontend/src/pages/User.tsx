import { useState, useContext, useEffect } from "react";
import { observer } from "mobx-react-lite";
import { useSearchParams } from "react-router-dom";
import { Container, Button, Image, Grid, Message } from "semantic-ui-react";
import User from "../contexts/User";
import { SERVER } from "../config";
import InfoCard from "../components/infoCard";

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
      console.error("No platform returns");
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

  const connect = async (platform: string) => {
    if (connectLoading[platform]) return;

    console.log("join through", platform);
    setErrorMsg({ twitter: "", github: "" });
    let tmpLoading = { ...connectLoading };
    tmpLoading[platform] = true;
    setConnectLoading(tmpLoading);

    // authorization through relay
    const currentUrl = new URL(window.location.href);
    const dest = new URL("/user", currentUrl.origin);
    const isSigningUp: boolean = !user.userStates[platform].hasSignedUp;

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
      let tmpError = { ...errorMsg };
      tmpError[platform] = "Something weird just happened";
      setErrorMsg(tmpError);
    }
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
              connected={user.userStates.twitter.access_token !== null}
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
              connect={() => connect("twitter")}
              error={errorMsg.twitter}
              connectLoading={connectLoading.twitter}
              ust={() => user.stateTransition("twitter")}
            />
            <InfoCard
              title={"Github Stars"}
              platform={"github"}
              hasSignedUp={user.userStates.github.hasSignedUp}
              connected={user.userStates.github.access_token !== null}
              data={Number(
                user.userStates.github.data[2] - user.userStates.github.data[3]
              )}
              provableData={Number(
                user.userStates.github.provableData[2] -
                  user.userStates.github.provableData[3]
              )}
              color="yellow"
              update={() => user.getRep("github")}
              connect={() => connect("github")}
              error={errorMsg.github}
              connectLoading={connectLoading.github}
              ust={() => user.stateTransition("github")}
            />
            <InfoCard
              title={"Github Followers"}
              platform={"github"}
              hasSignedUp={user.userStates.github.hasSignedUp}
              connected={user.userStates.github.access_token !== null}
              data={Number(
                user.userStates.github.data[0] - user.userStates.github.data[1]
              )}
              provableData={Number(
                user.userStates.github.provableData[0] -
                  user.userStates.github.provableData[1]
              )}
              color="red"
              update={async () => await user.getRep("github")}
              connect={() => connect("github")}
              error={errorMsg.github}
              connectLoading={connectLoading.github}
              ust={() => user.stateTransition("github")}
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