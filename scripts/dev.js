import { spawn } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const apiPort = process.env.PORT || "8787";
const webPort = process.env.VITE_PORT || "5173";
const children = [];
let shuttingDown = false;

function run(args, env) {
  const child = spawn(process.execPath, args, {
    cwd: root,
    stdio: "inherit",
    env: { ...process.env, ...env },
  });
  children.push(child);
  child.on("exit", (code) => {
    if (!shuttingDown) shutdown(code ?? 1);
  });
}

function shutdown(code = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  for (const child of children) {
    if (!child.killed) child.kill("SIGTERM");
  }
  setTimeout(() => process.exit(code), 100);
}

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));

console.log(`API http://127.0.0.1:${apiPort}`);
console.log(`App http://127.0.0.1:${webPort}`);

run(["--disable-warning=ExperimentalWarning", "server/index.js"], {
  PORT: String(apiPort),
  SERVE_STATIC: "0",
});
run(
  ["node_modules/vite/bin/vite.js", "--host", "127.0.0.1", "--port", String(webPort), "--strictPort"],
  { PORTAL_API: `http://127.0.0.1:${apiPort}` },
);
