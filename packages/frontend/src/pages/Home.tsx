import React, { useContext, useEffect, useState } from "react";
import { observer } from "mobx-react-lite";
import { Link } from "react-router-dom";
import { Title } from "../types/title";
import { SERVER } from "../config";

import User from "../contexts/User";
import RankingChart from "../components/rankingChart";

export default observer(() => {
  const user = useContext(User);

  const [rankings, setRankings] = useState<{ [key: string]: any[] }>({});

  const refreshRanking = async () => {
    try {
      const _rankings = await fetch(`${SERVER}/api/ranking`).then((r) =>
        r.json()
      );
      setRankings(_rankings);
    } catch (err: any) {
      console.error(err);
    }
  };

  useEffect(() => {
    refreshRanking();
  }, []);

  const formCardGroup = (title: Title) => {
    const data = rankings[title] ?? [];

    // return (
    //   <Card.Group style={{ marginTop: "24px" }}>
    //     {data.map((d: any) => (
    //       <Card
    //         fluid
    //         header={"0x" + BigInt(d.epochKey).toString(16)}
    //         key={d._id}
    //         className="my-card"
    //       />
    //     ))}
    //   </Card.Group>
    // );
  };

  return (
    <div>
      <div className="relative" style={{ height: "40vh" }}>
        <img
          className="w-full h-full object-fit absolute -z-50"
          src={require("../../public/banner.png")}
        />
        <div className="h-full flex flex-col justify-center items-center">
          <h2>My Badge: Your Web3 Identity</h2>
          {!user.signedUp && (
            <Link to="/join">
              <button className="btn btn-primary btn-lg btn-wide">
                Join Us
              </button>
            </Link>
          )}
        </div>
      </div>
      <div className="flex flex-col gap-4 items-center py-8">
        {Object.keys(rankings).map((p) => (
          <RankingChart platform={p} ranking={rankings[p]} />
        ))}
      </div>

      {/* <div
        className="banner"
        style={{
          backgroundImage: `url(${require("../../public/banner.jpg")})`,
        }}
      >
        {!user.hasSignedUp && (
          <Link to="/join">
            <Button className="join-button" color="orange" size="massive">
              Join Us!
            </Button>
          </Link>
        )}
      </div>
      <Container>
        <Segment.Group horizontal>
          <Segment color="blue">
            <Button basic color="blue" fluid size="big">
              Twitter Followers
            </Button>
            {formCardGroup(Title.twitter)}
          </Segment>
          <Segment color="yellow">
            <Button basic color="yellow" fluid size="big">
              Github Stars
            </Button>
            {formCardGroup(Title.githubStars)}
          </Segment>
          <Segment color="red">
            <Button basic color="red" fluid size="big">
              Github Followers
            </Button>
            {formCardGroup(Title.githubFollowers)}
          </Segment>
        </Segment.Group>
        <div className="margin"></div>
      </Container> */}
    </div>
  );
});
