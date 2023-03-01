import React from "react";
import { Segment } from "semantic-ui-react";

const Footer = () => {
  return (
    <div className="footer">
      <Segment raised textAlign="center">
        Wanna know more? see
        <span> </span>
        <a href="https://developer.unirep.io/" target="blank">
          Docs
        </a>
        <span>|</span>
        <a href="https://github.com/Unirep" target="blank">
          GitHub
        </a>
        <span>|</span>
        <a href="https://discord.com/invite/VzMMDJmYc5" target="blank">
          Discord
        </a>
      </Segment>
    </div>
  );
};

export default Footer;
