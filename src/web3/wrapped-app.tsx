import App from "./app";
import { Web3Provider } from "./provider";

export default function WrappedApp() {
  return (
    <Web3Provider>
      <App />
    </Web3Provider>
  );
}
