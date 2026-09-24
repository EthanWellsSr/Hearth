export type NoticePackage = { name: string; license: string };
export type NoticeText = { appliesTo: string[]; text: string };

const TEXTS_HEADING = "LICENSE AND NOTICE TEXTS";
const SECTION_RULE = /^={20,}$/m;
const BODY_RULE = /^-{20,}$/m;

// Parses the file written by scripts/generate-third-party-notices.mjs.
export function parseThirdPartyNotices(source: string) {
  const normalized = source.replace(/\r\n/g, "\n");
  const textsStart = normalized.indexOf(TEXTS_HEADING);
  const inventory = normalized.slice(normalized.indexOf("PACKAGE INVENTORY"), textsStart);

  const packages: NoticePackage[] = inventory
    .split(/\n\s*\n/)
    .map((block) => block.trim().split("\n"))
    .filter((lines) => lines.length > 1 && lines[1].startsWith("License:"))
    .map((lines) => ({
      name: lines[0].trim(),
      license: lines[1].slice("License:".length).trim(),
    }));

  const texts: NoticeText[] = normalized
    .slice(textsStart)
    .split(SECTION_RULE)
    .slice(1)
    .map((section) => {
      const [header, ...body] = section.split(BODY_RULE);
      const appliesTo = header
        .split("Source files used")[0]
        .split("\n")
        .filter((line) => line.startsWith("- "))
        .map((line) => line.slice(2).trim());
      return { appliesTo, text: body.join("\n").trim() };
    })
    .filter((notice) => notice.appliesTo.length > 0);

  return { packages, texts };
}
