import React from "react";
import { useError, ErrorType } from "../contexts/Error";

const ErrorModal = () => {
  const Error = useError();

  return Error.showError && <div></div>;
};

export default ErrorModal;
