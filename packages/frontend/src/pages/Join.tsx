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
      return navigate("/");
    } catch (e: any) {
      if (e.toString().includes("0x53d3ff53"))
        setErrorMsg("Epoch does not match. Please try again later.");
      else setErrorMsg(e.toString());
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
      return navigate("/");
    } catch (e: any) {
      setErrorMsg(e.toString());
    }
  };

  const onIdInputChange = (event: any) => {
    setIdInput(event.target.value);
  };

  return (
    <>
      {isLoading ? (
        <div className="w-full h-screen flex flex-col justify-center items-center gap-8">
          <div className="loading loading-spinner loading-lg"></div>
          <Link to="/help" target="_blank">
            Any question?
          </Link>
        </div>
      ) : (
        <div className="w-full h-screen flex flex-col justify-center p-4">
          <div className="flex flex-col w-full border-opacity-50 gap-4">
            <div className="grid place-items-center gap-8">
              {errorMsg.length > 0 && (
                <div className="alert alert-error max-w-lg break-words">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="stroke-current shrink-0 h-6 w-6"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <span>{errorMsg}</span>
                </div>
              )}
              <button
                className="button btn-lg btn-wide rounded-lg btn-info"
                onClick={() => join("twitter")}
              >
                <FontAwesomeIcon icon={faTwitter} />
                <span className="ml-1">Join with Twitter</span>
              </button>
              <button
                className="button btn-lg btn-wide rounded-lg btn-secondary"
                onClick={() => join("github")}
              >
                <FontAwesomeIcon icon={faGithub} />
                <span className="ml-1">Join with Github</span>
              </button>
            </div>
            <div className="divider">Already has account?</div>
            <div className="grid place-items-center gap-4">
              <textarea
                placeholder="Please enter your private key."
                className="textarea textarea-bordered w-72"
                onChange={onIdInputChange}
              />
              <button className="button btn-primary btn-md btn-wide rounded-lg">
                Log In
              </button>
              <Link to="/help" className="text-sm underline">
                Any question?
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
});
