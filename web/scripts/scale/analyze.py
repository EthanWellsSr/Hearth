"""Summarize a scale run: page latency per script, errors, and database load.

Page database work = pgbench latency - schedule lag - statements x round trip.
pgbench sends each statement separately from this machine, while Vercel
Functions sit beside the database, so the network share is removed.
"""
import glob
import statistics
import sys

out, seconds = sys.argv[1], float(sys.argv[2])
scripts = ["home", "todos", "groceries", "chores", "calendar", "toggle_todo", "add_grocery"]
# Round trips per page: BEGIN, claims, context, page queries, COMMIT.
statements = [7, 7, 5, 7, 5, 5, 5]


def pct(values, p):
    values = sorted(values)
    return values[min(len(values) - 1, int(p / 100 * len(values)))] if values else float("nan")


rtts = [int(line.split()[2]) / 1000 for f in glob.glob(f"{out}/rtt*") if not f.endswith(".txt")
        for line in open(f)]
rtt = statistics.median(rtts)

pages = {i: [] for i in range(len(scripts))}
lags = []
for f in glob.glob(f"{out}/load*"):
    for line in open(f):
        cols = line.split()
        if cols[2] == "skipped":
            continue
        script, total_ms, lag_ms = int(cols[3]), int(cols[2]) / 1000, int(cols[6]) / 1000
        lags.append(lag_ms)
        pages[script].append(max(0.0, total_ms - lag_ms - statements[script] * rtt))

print(f"Round trip to staging: median {rtt:.1f} ms")
print(f"Schedule lag: p95 {pct(lags, 95):.0f} ms, max {max(lags):.0f} ms (queueing when the database falls behind)")
print(f"{'page':<12}{'count':>7}{'p50 ms':>9}{'p95 ms':>9}{'max ms':>9}")
everything = []
for i, name in enumerate(scripts):
    v = pages[i]
    everything += v
    print(f"{name:<12}{len(v):>7}{pct(v, 50):>9.0f}{pct(v, 95):>9.0f}{max(v, default=0):>9.0f}")
print(f"{'all pages':<12}{len(everything):>7}{pct(everything, 50):>9.0f}{pct(everything, 95):>9.0f}{max(everything):>9.0f}")

text = open(f"{out}/pgbench.txt").read().splitlines()
for key in ("number of failed transactions", "number of transactions skipped", "aborted"):
    found = [line.strip() for line in text if line.startswith(key) or key == "aborted" and key in line]
    if found:
        print(found[0])

total_ms = 0.0
rows = [r for r in open(f"{out}/statements.tsv").read().splitlines() if r[:1].isdigit()]
for row in rows:
    total_ms += float(row.split("\t")[1])
print(f"Database execution time: {total_ms / 1000:.0f} s over {seconds:.0f} s "
      f"= {total_ms / 1000 / seconds:.2f} queries executing at once on average; above 2 (staging's shared cores) means queries wait for CPU")
print(f"Database time per page (server side): {total_ms / max(1, len(everything)):.1f} ms average; "
      "client-side page figures near 0 are below the round-trip noise, so trust this line and the "
      "statement maxima below once the database is fast.")
print("Slowest statements by total time:")
for row in rows[:6]:
    calls, total, mean, mx, query = row.split("\t")
    print(f"  {calls:>6} calls  mean {mean:>8} ms  max {mx:>8} ms  {query[:90]}")
