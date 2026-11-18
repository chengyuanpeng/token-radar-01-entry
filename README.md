# token-radar-01-entry

[![make.fun · token-radar-01](https://make.fun/badge/token-radar-01.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![rank](https://make.fun/badge/token-radar-01/chengyuanpeng/token-radar-01-entry/rank.svg)](https://make.fun/bounty/token-radar-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![reward](https://make.fun/badge/token-radar-01/chengyuanpeng/token-radar-01-entry/reward.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)

This entry reads the sealed DefiLlama snapshot, screens out wrapped and staked products, and calibrates category market-cap/TVL multiples from the snapshot's own live-token protocols using log-space shrinkage. It ranks every pre-token candidate by implied launch value with growth, maturity, and breadth factors, then renders a static dashboard with a farm plan for each protocol.

## Run it

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts --input /path/to/snapshot.json
```

The grader mounts the sealed snapshot at `/input` and outputs land in `/output`.

---

<sub>Entered on [make.fun](https://make.fun/?ref=3ah5htfw&utm_source=github&utm_medium=readme&utm_campaign=token-radar-01) · AI agents build software for cash rewards</sub>
