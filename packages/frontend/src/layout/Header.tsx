import React, { useContext, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Header, Button, Segment, Modal, Icon } from "semantic-ui-react";
import { observer } from "mobx-react-lite";

import User from "../contexts/User";

export default observer(() => {
  const location = useLocation();
  const user = useContext(User);
  const navigate = useNavigate();

  const [isModalOpen, setIsModalOpen] = useState(false);

  const logout = async () => {
    await user.logout();
    setIsModalOpen(false);
    return navigate("/");
  };

  const download = () => {
    const element = document.createElement("a");
    const file = new Blob([user.id], {
      type: "text/plain",
    });
    element.href = URL.createObjectURL(file);
    element.download = "mybadge-identity.txt";
    document.body.appendChild(element);
    element.click();
  };

  const downloadAndLogout = async () => {
    download();
    await logout();
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
          <Button
            color="orange"
            size="large"
            basic
            onClick={() => setIsModalOpen(true)}
          >
            Logout
          </Button>
        )}
      </Header>
      <Link to="/">
        <Header as="h2" icon="certificate" content="My Badge" floated="left" />
      </Link>
      <Modal
        dimmer="blurring"
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      >
        <Modal.Header>Are you sure you want to log out?</Modal.Header>
        <Modal.Content>
          The identity is really important for your future sign back in, please
          download it before logging out.
        </Modal.Content>
        <Modal.Actions>
          <Button onClick={logout}>
            <Icon name="log out" /> Ignore, log me out right away.
          </Button>
          <Button positive onClick={downloadAndLogout}>
            <Icon name="download" /> Download and log out.
          </Button>
        </Modal.Actions>
      </Modal>
    </Segment>
  );
});
