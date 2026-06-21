import packageJson from "../../package.json";

const packageVersion = packageJson.version?.trim();

export const DASHBOARD_VERSION = packageVersion ? `v${packageVersion}` : "v0.1";
