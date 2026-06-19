---
name: HalalScan Package Versions
description: Correct package versions for expo-sqlite and expo-network in the Expo 54 halal-scan artifact
---

# HalalScan Package Versions

## The rule
For Expo 54 (~54.0.x), use:
- `expo-sqlite@~16.0.10` (NOT the latest ~56.x which is for Expo 56+)
- `expo-network@~8.0.8` (NOT the latest ~56.x)

**Why:** Running `pnpm add expo-sqlite expo-network` without pinning installs Expo 56-era packages which show version mismatch warnings and may behave unexpectedly.

**How to apply:** Always use `pnpm add expo-sqlite@~16.0.10 expo-network@~8.0.8` in artifacts/halal-scan.
