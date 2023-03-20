import React, { useEffect, useState, useContext } from "react";
import { observer } from "mobx-react-lite";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Button, Divider, Input, Loader, Message } from "semantic-ui-react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTwitter, faGithub } from "@fortawesome/free-brands-svg-icons";
import { SERVER } from "../config.js";
import User from "../contexts/User";

export default observer(() => {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();

  const user = useContext(User);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const signup = async (platform, access_token) => {
    setErrorMsg("");
    setIsLoading(true);
    try {
      await user.signup(platform, access_token);
      await user.getRep(platform);
      return navigate("/user");
    } catch (e) {
      setErrorMsg(e.toString());
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const platform = params.get("platform");
    const access_token = params.get("access_token");
    const signupError = params.get("signupError");
    if (platform && access_token) {
      signup(platform, access_token);
      params.delete("platform");
      params.delete("access_token");
      params.delete("signupCode");
    } else if (signupError) {
      setErrorMsg(signupError);
      params.delete("signupError");
    }
    setParams(params);
  }, []);

  const join = async (platform) => {
    console.log("join through", platform);

    // authorization through relay
    const currentUrl = new URL(window.location.href);
    const dest = new URL("/join", currentUrl.origin);

    if (platform === "twitter") {
      const url = new URL("/api/oauth/twitter", SERVER);
      url.searchParams.set("redirectDestination", dest.toString());
      window.location.replace(url.toString());
    } else if (platform === "github") {
      const url = new URL("/api/oauth/github", SERVER);
      url.searchParams.set("redirectDestination", dest.toString());
      window.location.replace(url.toString());
    } else {
      console.log("wwaitttt whatttt???");
    }
  };

  return (
    <>
      {isLoading ? (
        <div className="join-container">
          <Loader active inline="centered" size="huge" />
          <Link to="/help">Any question?</Link>
        </div>
      ) : (
        <div className="join-container">
          {errorMsg.length > 0 && (
            <Message error header="Oops!" content={errorMsg} />
          )}
          <Button
            basic
            color="blue"
            size="huge"
            onClick={() => join("twitter")}
          >
            <FontAwesomeIcon icon={faTwitter} />
            <span>Join with Twitter</span>
          </Button>
          <Button
            basic
            color="black"
            size="huge"
            onClick={() => join("github")}
          >
            <FontAwesomeIcon icon={faGithub} />
            <span>Join with Github</span>
          </Button>

          <Divider horizontal>Already has account?</Divider>

          <Input placeholder="Please enter your private key." size="large" />
          <Button basic size="large">
            Log in
          </Button>

          <Link to="/help">Any question?</Link>
        </div>
      )}
    </>
  );
});
