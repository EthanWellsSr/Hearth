import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const lockPath = path.join(projectRoot, "package-lock.json");
const outputPath = path.join(
  projectRoot,
  "public",
  "legal",
  "THIRD_PARTY_NOTICES.txt",
);
const checkOnly = process.argv.includes("--check");
const lock = JSON.parse(readFileSync(lockPath, "utf8"));

function packageName(lockPackagePath) {
  return lockPackagePath.slice(lockPackagePath.lastIndexOf("node_modules/") + 13);
}

function isShippedPackage(lockPackagePath, metadata) {
  return (
    lockPackagePath.includes("node_modules/") &&
    metadata.dev !== true &&
    metadata.link !== true
  );
}

// --check compares the committed file's package inventory with the lockfile.
// It never reads node_modules, because which optional platform packages npm
// installs (and therefore which license files exist) differs by OS and CPU;
// the full regeneration runs on the developer's machine with `npm run notices`.
if (checkOnly) {
  const expected = Object.entries(lock.packages ?? {})
    .filter(([lockPackagePath, metadata]) => isShippedPackage(lockPackagePath, metadata))
    .map(([lockPackagePath, metadata]) => `${packageName(lockPackagePath)}@${metadata.version}`)
    .sort();
  const current = existsSync(outputPath) ? readFileSync(outputPath, "utf8") : "";
  const inventory = current.split("LICENSE AND NOTICE TEXTS")[0];
  const listed = [...inventory.matchAll(/^(\S+@\S+)\nLicense: /gm)]
    .map((match) => match[1])
    .sort();
  const missing = expected.filter((name) => !listed.includes(name));
  const extra = listed.filter((name) => !expected.includes(name));
  if (missing.length > 0 || extra.length > 0 || expected.length !== listed.length) {
    console.error("Third-party notices are out of date. Run `npm run notices`.");
    for (const name of missing) console.error(`  missing: ${name}`);
    for (const name of extra) console.error(`  no longer shipped: ${name}`);
    process.exit(1);
  }
  console.log(`Third-party notices are current (${listed.length} packages).`);
  process.exit(0);
}

function repositoryUrl(repository) {
  const value = typeof repository === "string" ? repository : repository?.url;
  return value?.replace(/^git\+/, "") ?? null;
}

function licenseLabel(license) {
  if (typeof license === "string") return license;
  if (Array.isArray(license)) return license.map(licenseLabel).join(" OR ");
  if (license?.type) return license.type;
  return null;
}

function noticeFiles(directory) {
  if (!existsSync(directory)) return [];

  return readdirSync(directory)
    .filter((name) => /^(licen[cs]e|copying|notice)(\..*|$)/i.test(name))
    .map((name) => path.join(directory, name))
    .filter((file) => statSync(file).isFile());
}

function existing(...segments) {
  const file = path.join(projectRoot, ...segments);
  return existsSync(file) ? file : null;
}

const installedLibvipsNotice = (() => {
  const imagePackages = path.join(projectRoot, "node_modules", "@img");
  if (!existsSync(imagePackages)) return null;

  for (const name of readdirSync(imagePackages).sort()) {
    if (!name.startsWith("sharp-libvips-")) continue;
    const readme = path.join(imagePackages, name, "README.md");
    if (existsSync(readme)) return readme;
  }

  return null;
})();

function fallbackNoticeFiles(name, declaredLicense) {
  const files = [];

  if (name.startsWith("@next/")) {
    files.push(existing("node_modules", "next", "license.md"));
  } else if (name === "client-only") {
    files.push(existing("node_modules", "react", "LICENSE"));
  } else if (name.startsWith("@img/sharp-libvips-")) {
    files.push(installedLibvipsNotice);
    files.push(existing("node_modules", "heic-to", "LICENSE"));
  } else if (name.startsWith("@img/sharp-")) {
    files.push(existing("node_modules", "sharp", "LICENSE"));
    if (declaredLicense.includes("LGPL")) {
      files.push(existing("node_modules", "heic-to", "LICENSE"));
    }
    if (declaredLicense.includes("MIT")) {
      files.push(existing("node_modules", "react", "LICENSE"));
    }
  }

  return files.filter(Boolean);
}

const packages = [];
const unresolved = [];

for (const [lockPackagePath, metadata] of Object.entries(lock.packages ?? {})) {
  if (!isShippedPackage(lockPackagePath, metadata)) continue;

  const name = packageName(lockPackagePath);
  const directory = path.join(projectRoot, lockPackagePath);
  const manifestPath = path.join(directory, "package.json");
  const manifest = existsSync(manifestPath)
    ? JSON.parse(readFileSync(manifestPath, "utf8"))
    : {};
  const declaredLicense =
    licenseLabel(manifest.license ?? manifest.licenses ?? metadata.license) ??
    "UNSPECIFIED";
  const files = noticeFiles(directory);
  if (files.length === 0) {
    files.push(...fallbackNoticeFiles(name, declaredLicense));
  }

  if (declaredLicense === "UNSPECIFIED" || files.length === 0) {
    unresolved.push(`${name}@${metadata.version ?? manifest.version ?? "unknown"}`);
    continue;
  }

  packages.push({
    name,
    version: metadata.version ?? manifest.version ?? "unknown",
    license: declaredLicense,
    optional: metadata.optional === true,
    source:
      repositoryUrl(manifest.repository) ??
      manifest.homepage ??
      metadata.resolved ??
      "Not provided",
    files,
  });
}

if (unresolved.length > 0) {
  throw new Error(
    `Missing license metadata or text for:\n${unresolved
      .sort()
      .map((name) => `- ${name}`)
      .join("\n")}`,
  );
}

packages.sort((a, b) =>
  `${a.name}@${a.version}`.localeCompare(`${b.name}@${b.version}`),
);

const licenseTexts = new Map();

for (const dependency of packages) {
  for (const file of dependency.files) {
    const text = readFileSync(file, "utf8")
      .replace(/\r\n?/g, "\n")
      .split("\n")
      .map((line) => line.trimEnd())
      .join("\n")
      .trim();
    const hash = createHash("sha256").update(text).digest("hex");
    const entry = licenseTexts.get(hash) ?? {
      packages: new Set(),
      sources: new Set(),
      text,
    };
    entry.packages.add(`${dependency.name}@${dependency.version}`);
    entry.sources.add(path.relative(projectRoot, file).replaceAll(path.sep, "/"));
    licenseTexts.set(hash, entry);
  }
}

const lines = [
  "HEARTH THIRD-PARTY SOFTWARE NOTICES",
  "====================================",
  "",
  "Generated from package-lock.json by `npm run notices`. Do not edit manually.",
  "The inventory includes production dependencies and optional platform packages;",
  "development-only dependencies are excluded.",
  "",
  "PACKAGE INVENTORY",
  "-----------------",
  "",
];

for (const dependency of packages) {
  lines.push(`${dependency.name}@${dependency.version}`);
  lines.push(`License: ${dependency.license}`);
  lines.push(`Source: ${dependency.source}`);
  if (dependency.optional) lines.push("Optional platform package: yes");
  lines.push("");
}

lines.push("LICENSE AND NOTICE TEXTS", "------------------------", "");

const sortedTexts = [...licenseTexts.values()].sort((a, b) =>
  [...a.packages][0].localeCompare([...b.packages][0]),
);

for (const entry of sortedTexts) {
  lines.push("=".repeat(80));
  lines.push("Applies to:");
  for (const name of [...entry.packages].sort()) lines.push(`- ${name}`);
  lines.push("Source files used to generate this notice:");
  for (const source of [...entry.sources].sort()) lines.push(`- ${source}`);
  lines.push("-".repeat(80), entry.text, "");
}

const output = `${lines.join("\n").trimEnd()}\n`;

mkdirSync(path.dirname(outputPath), { recursive: true });
writeFileSync(outputPath, output);
console.log(
  `Wrote ${path.relative(projectRoot, outputPath)} for ${packages.length} packages.`,
);
