/** @type {import('expo/config').ExpoConfig} */
const appJson = require("./app.json");

const DEFAULT_DOMAIN = "tashi-9512b.as.r.appspot.com";

module.exports = () => ({
  ...appJson.expo,
  android: {
    ...appJson.expo.android,
    softwareKeyboardLayoutMode: "resize",
  },
  extra: {
    ...appJson.expo.extra,
    apiDomain: process.env.EXPO_PUBLIC_DOMAIN || DEFAULT_DOMAIN,
  },
});
