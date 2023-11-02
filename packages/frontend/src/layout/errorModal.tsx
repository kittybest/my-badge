import React from "react";
import { useError, ErrorType } from "../contexts/Error";

const ErrorModal = () => {
  const Error = useError();

  return (
    <>
      {Error.showError && (
        <div className="w-screen fixed top-10 left-0 flex justify-center">
          <div
            className="alert alert-error max-w-lg break-words cursor-pointer shadow-black"
            onClick={Error.closeError}
          >
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
            <span>{Error.error.message}</span>
          </div>
        </div>
      )}
    </>
  );
};

export default ErrorModal;
