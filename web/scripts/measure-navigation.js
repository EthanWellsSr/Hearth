// Hearth navigation latency harness (v0.4.2 acceptance).
//
// Paste into the DevTools Console while signed in on the production site. It
// clicks through 20 real in-app transitions and reports, per transition:
//   ack   - time until the UI visibly responds (URL change or loading state)
//   ready - time until the destination is rendered with its data
//   from  - "server" when the page was fetched, "cache" when the client router
//           reused a recently visited page (staleTimes)
// Targets from docs/design/v0.4.2-performance-architecture.md: ack <= 100ms,
// ready median <= 500ms and p95 <= 1,000ms.
(async () => {
  const TRANSITIONS = 20;
  const TIMEOUT_MS = 10000;
  const PAUSE_MS = 400;

  const loop = [
    { label: "Home → Calendar", find: () => document.querySelector('main a[href="/calendar"]') },
    { label: "Calendar → Month", find: () => linkByText("Month") },
    { label: "Month → Week", find: () => linkByText("Week") },
    { label: "Week → Upcoming", find: () => linkByText("Upcoming") },
    { label: "Calendar → Home", find: home },
    { label: "Home → To-dos", find: () => document.querySelector('main a[href="/todos"]') },
    { label: "To-dos → Home", find: home },
    { label: "Home → Groceries", find: () => document.querySelector('main a[href="/groceries"]') },
    { label: "Groceries → Home", find: home },
    { label: "Home → Chores", find: () => document.querySelector('main a[href="/chores"]') },
    { label: "Chores → Home", find: home },
  ];

  function home() {
    return document.querySelector('header a[href="/"]');
  }
  function linkByText(text) {
    return [...document.querySelectorAll("main a")].find((a) => a.textContent.trim() === text);
  }
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const frame = () => new Promise((r) => requestAnimationFrame(() => r()));
  const loading = () => document.querySelector('[aria-label="Loading page"]');
  const here = () => location.pathname + location.search;

  async function measure(link) {
    const target = new URL(link.href);
    const targetPath = target.pathname + target.search;
    const before = here();
    const start = performance.now();
    let ack = null;
    link.click();
    for (;;) {
      await frame();
      const now = performance.now() - start;
      if (ack === null && (here() !== before || loading())) ack = now;
      if (here() === targetPath && !loading()) break;
      if (now > TIMEOUT_MS) throw new Error(`Timed out waiting for ${targetPath}`);
    }
    const ready = performance.now() - start;
    const fetched = performance
      .getEntriesByType("resource")
      .some((e) => e.startTime >= start && e.name.includes("_rsc="));
    return { ack: Math.round(ack ?? ready), ready: Math.round(ready), from: fetched ? "server" : "cache" };
  }

  const pct = (values, p) => {
    if (!values.length) return null;
    const sorted = [...values].sort((a, b) => a - b);
    return sorted[Math.max(0, Math.ceil(p * sorted.length) - 1)];
  };

  if (location.pathname !== "/") {
    const link = home();
    if (!link) throw new Error("Open a signed-in Hearth page first.");
    await measure(link);
    await sleep(PAUSE_MS);
  }

  const rows = [];
  for (let i = 0; rows.length < TRANSITIONS; i++) {
    const step = loop[i % loop.length];
    const link = step.find();
    if (!link) throw new Error(`Could not find the link for "${step.label}" on ${here()}`);
    rows.push({ transition: step.label, ...(await measure(link)) });
    await sleep(PAUSE_MS);
  }

  const region = (await fetch(location.href, { method: "HEAD", cache: "no-store" })).headers.get("x-vercel-id");
  const all = rows.map((r) => r.ready);
  const server = rows.filter((r) => r.from === "server").map((r) => r.ready);
  const summary = {
    "function region (x-vercel-id)": region,
    transitions: rows.length,
    "served by server / cache": `${server.length} / ${rows.length - server.length}`,
    "ack max (target ≤100ms)": Math.max(...rows.map((r) => r.ack)),
    "ready median (target ≤500ms)": pct(all, 0.5),
    "ready p95 (target ≤1000ms)": pct(all, 0.95),
    "server-only median": pct(server, 0.5),
    "server-only p95": pct(server, 0.95),
  };
  summary.verdict =
    summary["ack max (target ≤100ms)"] <= 100 &&
    summary["ready median (target ≤500ms)"] <= 500 &&
    summary["ready p95 (target ≤1000ms)"] <= 1000
      ? "PASS"
      : "FAIL";

  console.table(rows);
  console.table(summary);
  return summary;
})();
