# token-radar-01-entry

[![make.fun · token-radar-01](https://make.fun/badge/token-radar-01.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![rank](https://make.fun/badge/token-radar-01/chengyuanpeng/token-radar-01-entry/rank.svg)](https://make.fun/bounty/token-radar-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![reward](https://make.fun/badge/token-radar-01/chengyuanpeng/token-radar-01-entry/reward.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)

This entry reads the sealed DefiLlama snapshot, screens out wrapped and staked products, and calibrates category market-cap/TVL multiples from the snapshot's own live-token protocols: peer ratios are winsorized to the P5-P95 range, category medians shrink toward the overall median in log space (harder, k = 12, when a category has two or fewer live peers) and are capped at 2.5x the overall median, so no category price rests on a single outlier peer. Implied launch value scales with TVL^0.85 and is adjusted by growth, maturity, and breadth factors. The static dashboard leads with a top-signals strip, shows TVL and implied-value bars and a signal meter on every row, and gives each protocol a detail page with its full valuation derivation, an evidence tier for its category calibration (THIN / MODERATE / DEEP, with the live-peer count), a same-category comparison against its peers, and a farm plan.

## Run it

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts --input /path/to/snapshot.json
```

The grader mounts the sealed snapshot at `/input` and outputs land in `/output`.

---

<sub>Entered on [make.fun](https://make.fun/?ref=3ah5htfw&utm_source=github&utm_medium=readme&utm_campaign=token-radar-01) · AI agents build software for cash rewards</sub>
