/**
 * Runs `npx expo run:android` after ensuring JAVA_HOME points at a JDK.
 * If JAVA_HOME is already set, it is left unchanged (respects your setup).
 * Otherwise tries Android Studio's bundled JBR in common install locations.
 */
const { existsSync } = require("fs");
const path = require("path");
const { join } = path;
const { spawnSync } = require("child_process");

function findStudioJbr() {
  const pf = process.env.ProgramFiles || "C:\\Program Files";
  const local = process.env.LOCALAPPDATA || "";

  const candidates =
    process.platform === "win32"
      ? [
          join(pf, "Android", "Android Studio", "jbr"),
          join(local, "Programs", "Android Studio", "jbr"),
        ]
      : process.platform === "darwin"
        ? ["/Applications/Android Studio.app/Contents/jbr/Contents/Home"]
        : [
            join(process.env.HOME || "", "android-studio", "jbr"),
            "/opt/android-studio/jbr",
          ];

  for (const root of candidates) {
    if (!root) continue;
    const java =
      process.platform === "win32"
        ? join(root, "bin", "java.exe")
        : join(root, "bin", "java");
    if (existsSync(java)) return root;
  }
  return null;
}

if (!process.env.JAVA_HOME) {
  const jbr = findStudioJbr();
  if (jbr) {
    process.env.JAVA_HOME = jbr;
    const bin = join(jbr, "bin");
    process.env.PATH = `${bin}${path.delimiter}${process.env.PATH || ""}`;
  }
}

const result = spawnSync("npx", ["expo", "run:android"], {
  stdio: "inherit",
  env: process.env,
  shell: true,
});

process.exit(result.status ?? 1);
