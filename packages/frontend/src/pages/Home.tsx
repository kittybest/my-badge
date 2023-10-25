import React, { useContext, useEffect, useState } from "react";
import { observer } from "mobx-react-lite";
import { Link } from "react-router-dom";
import Jdenticon from "react-jdenticon";

import { SERVER, TWITTER_ADDRESS } from "../config";
import User from "../contexts/User";
import RankingChart from "../components/rankingChart";
import MyInfoCard from "../components/myInfoCard";

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

  const downloadId = () => {
    const element = document.createElement("a");
    const file = new Blob([user.id], {
      type: "text/plain",
    });
    element.href = URL.createObjectURL(file);
    element.download = "my-badge-id.txt";
    document.body.appendChild(element);
    element.click();
  };

  useEffect(() => {
    refreshRanking();
  }, []);

  return (
    <div>
      <div className="relative" style={{ height: "40vh" }}>
        <img
          className="w-full h-full object-fit absolute -z-50"
          src={require("../../public/banner.png")}
        />
        {!user.signedUp && (
          <div className="h-full flex flex-col justify-center items-center">
            <h2>My Badge: Your Web3 Identity</h2>
            <Link to="/join">
              <button className="btn btn-primary btn-lg btn-wide">
                Join Us
              </button>
            </Link>
          </div>
        )}
        {user.signedUp && (
          <div className="h-full flex items-center p-8 gap-8">
            <div className="h-full flex flex-col w-72 break-all items-center gap-2">
              <div className="bg-white">
                <Jdenticon
                  size="120"
                  value={user.epochKey(TWITTER_ADDRESS, 0)}
                />
              </div>
              <label className="swap swap-flip cursor-pointer">
                <input type="checkbox" />
                <div className="swap-on">{user.id}</div>
                <div
                  className="swap-off text-center rounded-lg btn-secondary p-10"
                  onClick={downloadId}
                >
                  Reveal and Download
                  <br />
                  My Id
                </div>
              </label>
            </div>
            <div className="flex gap-4">
              <MyInfoCard platform="twitter" />
              <MyInfoCard platform="github" />
            </div>
          </div>
        )}
      </div>
      <div className="flex flex-col gap-4 items-center py-8">
        {Object.keys(rankings).map((p) => (
          <RankingChart platform={p} ranking={rankings[p]} />
        ))}
      </div>
    </div>
  );
});
