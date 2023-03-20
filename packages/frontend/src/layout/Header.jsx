import React, { useContext } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Header, Button, Segment } from "semantic-ui-react";
import { observer } from "mobx-react-lite";

import User from "../contexts/User";

export default observer(() => {
  const location = useLocation();
  const user = useContext(User);
  const navigate = useNavigate();

  const logout = async () => {
    await user.logout();
    return navigate("/");
  };

  return (
    <Segment clearing raised>
      <Header floated="right">
        {location.pathname !== "/join" && !user.hasSignedUp && (
          <Link to="/join">
            <Button color="orange" size="large">
              Join
            </Button>
          </Link>
        )}
        {location.pathname !== "/user" && user.hasSignedUp && (
          <Link to="/user">
            <Button color="purple" size="large">
              My Page
            </Button>
          </Link>
        )}
        {user.hasSignedUp && (
          <Button color="orange" size="large" basic onClick={logout}>
            Logout
          </Button>
        )}
      </Header>
      <Link to="/">
        <Header as="h2" icon="certificate" content="My Badge" floated="left" />
      </Link>
    </Segment>
  );
});
