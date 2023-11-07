import { createContext, useContext, useState, ReactNode } from "react";

export enum ErrorType {
  None,
  Default,
  EpochNotMatch,
  AlreadySignedUp,
}

type MyError = {
  type: ErrorType;
  message: string;
};

interface ErrorContent {
  error: MyError;
  errorHandler: (e: string) => void;
  showError: boolean;
  closeError: () => void;
}

const defaultError = { type: ErrorType.None, message: "" };

interface ErrorProviderProps {
  children: ReactNode;
}

const ErrorContext = createContext<ErrorContent>({
  error: defaultError,
  errorHandler: () => {},
  showError: false,
  closeError: () => {},
});

export const ErrorProvider: React.FC<ErrorProviderProps> = ({ children }) => {
  const [error, setError] = useState<MyError>(defaultError);
  const [showError, setShowError] = useState<boolean>(false);

  const errorHandler = (e: string) => {
    if (e.length <= 0) return;
    setShowError(true);
    if (e.indexOf("0x53d3ff53") !== -1) {
      setError({
        type: ErrorType.EpochNotMatch,
        message: "Epoch does not match.",
      });
    } else {
      setError({ type: ErrorType.Default, message: e });
    }
  };

  const closeError = () => {
    setError({ type: ErrorType.None, message: "" });
    setShowError(false);
  };

  const value: ErrorContent = {
    error,
    errorHandler,
    showError,
    closeError,
  };

  return (
    <ErrorContext.Provider value={value}>{children}</ErrorContext.Provider>
  );
};

export default ErrorContext;

export const useError = () => {
  const context = useContext(ErrorContext);
  if (!context) throw new Error("useError must be used within a ErrorProvider");

  return context;
};
