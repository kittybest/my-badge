import React from "react";
import { Outlet, Link } from "react-router-dom";

import Header from "./Header";
import Footer from "./Footer";
import ErrorModal from "./errorModal";

const Layout = () => {
  return (
    <>
      <Header />
      <Outlet />
      <Footer />
      <ErrorModal />
    </>
  );
};

export default Layout;
