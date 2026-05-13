import base from "@weopen/config/eslint";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const config = [
  ...base,
  ...nextVitals,
  ...nextTs
];

export default config;
