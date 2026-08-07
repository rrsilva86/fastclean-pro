const { spawn } = require("node:child_process");
const fs = require("node:fs");
const net = require("node:net");
const path = require("node:path");

const appDir = path.resolve(__dirname, "../..");
const port = Number(process.env.FASTCLEAN_PORT || 3000);
const logDir = path.join(process.env.HOME || appDir, "Library/Logs/FastCleanPro");
const logFile = path.join(logDir, "fastclean-pro.log");
const pidFile = path.join(logDir, "fastclean-pro.pid");
const nextBin = path.join(appDir, "node_modules/next/dist/bin/next");
const localNode = path.join(appDir, ".local-tools/node-v24.16.0-darwin-arm64/bin/node");
const nodeBin = fs.existsSync(localNode) ? localNode : process.execPath;

function isPortOpen() {
  return new Promise((resolve) => {
    const socket = net.createConnection({ host: "127.0.0.1", port }, () => {
      socket.destroy();
      resolve(true);
    });
    socket.on("error", () => resolve(false));
    socket.setTimeout(500, () => {
      socket.destroy();
      resolve(false);
    });
  });
}

(async () => {
  fs.mkdirSync(logDir, { recursive: true });

  if (await isPortOpen()) {
    process.exit(0);
  }

  const out = fs.openSync(logFile, "a");
  const child = spawn(nodeBin, [nextBin, "start", "-p", String(port)], {
    cwd: appDir,
    detached: true,
    env: {
      HOME: process.env.HOME || "",
      NODE_ENV: "production",
      PATH: `${path.dirname(nodeBin)}:/usr/local/bin:/opt/homebrew/bin:${process.env.PATH || ""}`
    },
    stdio: ["ignore", out, out]
  });

  fs.writeFileSync(pidFile, String(child.pid));
  child.unref();
})();
