// Global error handler for React Native 0.76 (Hermes) Android release builds
// Prevents unhandled promise rejections and JS errors from crashing the app

import { LogBox } from "react-native";
import { installAuthFlowPatch } from "./authFlowPatch";

if (!__DEV__) {
  LogBox.ignoreAllLogs(true);
}

// Override the global error handler to prevent release crashes
const originalHandler = ErrorUtils?.getGlobalHandler?.();

if (ErrorUtils?.setGlobalHandler) {
  ErrorUtils.setGlobalHandler((error: any, isFatal?: boolean) => {
    if (__DEV__) {
      if (originalHandler) {
        originalHandler(error, isFatal);
      }
      return;
    }
    // In release: log but don't crash
    console.warn(
      "[Clashiq]",
      isFatal ? "Fatal" : "Error",
      error?.message || String(error),
      "\nSTACK:\n" + (error?.stack || "no stack")
    );
  });
}

// Route Google/Facebook sign-in through the account-ID picker.
// Installed here so no existing screen or store file has to change.
// Runs after the crash guard above is armed, so a failure can never take the app down.
try {
  installAuthFlowPatch();
} catch (err) {
  console.warn("[Clashiq] account picker patch could not be installed:", err);
}
