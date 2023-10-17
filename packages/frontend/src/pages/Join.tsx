import { useEffect, useState, useContext } from "react";
import { observer } from "mobx-react-lite";
import { Link, useNavigate, useSearchParams } from "react-router-dom";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTwitter, faGithub } from "@fortawesome/free-brands-svg-icons";
import { SERVER } from "../config";
import User from "../contexts/User";

export default observer(() => {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();

  const user = useContext(User);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [idInput, setIdInput] = useState("");

  const signup = async (platform: string, access_token: string) => {
    setErrorMsg("");
    setIsLoading(true);
    try {
      await user.signup(platform, access_token);
      await user.getRep(platform);
      return navigate("/user");
    } catch (e: any) {
      setErrorMsg(e.toString());
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const platform = params.get("platform");
    const access_token = params.get("access_token");
    const signupError = params.get("signupError");
    const isSigningUp = params.get("isSigningUp");
    if (platform && access_token) {
      if (isSigningUp && parseInt(isSigningUp)) {
        signup(platform, access_token);
      } else {
        user.storeAccessToken(platform, access_token);
      }
    } else if (signupError) {
      setErrorMsg(
        `Sign up through ${platform?.toUpperCase()} error: ${signupError}`
      );
    }
    setParams("");
  }, []);

  const join = async (platform: string) => {
    console.log("join through", platform);

    // authorization through relay
    const currentUrl = new URL(window.location.href);
    const dest = new URL("/join", currentUrl.origin);

    if (platform === "twitter") {
      const url = new URL("/api/oauth/twitter", SERVER);
      url.searchParams.set("redirectDestination", dest.toString());
      url.searchParams.set("isSigningUp", true.toString());
      window.location.replace(url.toString());
    } else if (platform === "github") {
      const url = new URL("/api/oauth/github", SERVER);
      url.searchParams.set("redirectDestination", dest.toString());
      url.searchParams.set("isSigningUp", true.toString());
      window.location.replace(url.toString());
    } else {
      console.log("wwaitttt whatttt???");
    }
  };

  const login = async () => {
    try {
      await user.login(idInput);
      return navigate("/user");
    } catch (e: any) {
      setErrorMsg(e.toString());
    }
  };

  const onIdInputChange = (event: any) => {
    setIdInput(event.target.value);
  };

  return (
    <>
      {/* {isLoading ? (
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

          <Form>
            <TextArea
              placeholder="Please enter your private key."
              style={{ width: "300px" }}
              onChange={onIdInputChange}
            />
          </Form>
          <Button basic size="large" onClick={login}>
            Log in
          </Button>
          <Link to="/help">Any question?</Link>
        </div>
      )} */}
    </>
  );
});
