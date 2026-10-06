# The Infinite Lattice

How Terminalator's world is generated, why the previous design could not be
infinite, and what the contract is now.

## The problem

The project advertised seed-based generation of an unbounded world. It had the
right shape for that — `IUniverseStrategy` describing lazy generation, a
seeded PRNG, a hydration pipeline — but three defects sat between the seed and
the player.

**1. Derivation was not pure.** `WorldSeed` is a stateful PRNG, and
`findNodeByHostname` drew from it directly. A node's contents therefore
depended on how many *other* nodes had been queried first:

```
getNodeDetails('srv-1')  ->  cpuPower 88
getNodeDetails('srv-1')  ->  cpuPower 62
```

A world cannot be re-derived from its seed if asking about it changes it. This
is the root defect — everything else follows from it.

**2. Every derived node collided on one id.** Ids were built from the node's
IP, and the lazy path passed a `'10.x.x.x'` placeholder it never filled in, so
every lazily derived node was `node_10_x_x_x`.

**3. Commands could not see the lattice.** `net-scan` listed
`NetworkMap.getAllHosts()` — the hosts booted at startup — so it printed the
same three hardcoded machines forever, with a `Math.random()` latency column
that disagreed with itself between scans.

## The design

Generation is a **behaviour**, not a stored graph. Nothing is generated ahead
of time; every question is answered by hashing a coordinate against the world
seed at the moment it is asked.

### Addresses

```
[sector:]A.B.C.D
```

`A.B.C.D` is an IPv4-style quad — 2³² nodes of "near space". `sector` is an
unbounded non-negative integer, reached only via long-haul gateway links.

The sector is what makes the space genuinely unbounded rather than merely
large: a 32-bit quad alone would cap the universe at ~4.3 billion nodes.

### Pure sub-seeding

`WorldSeed.derive(...parts)` returns a new, independent `WorldSeed` whose state
depends only on the parent's seed string and the given parts — never on how
many numbers have already been drawn. `hash`, `hashRange` and `hashPick` build
on it.

This is the cornerstone. It is why node #4,000,000,000 costs the same to derive
as node #1: there is no cursor to advance and no prefix of the world to build
first.

> **Rule:** content generation must use a *derived* seed, never the root
> generator's stream. Drawing from the root reintroduces order-dependence and
> silently breaks reproducibility.

### Layers

| Layer | Responsibility |
|---|---|
| `WorldSeed` | Deterministic PRNG + pure sub-seeding |
| `LatticeAddress` | Coordinate value object, parse/format |
| `FactionForge` | Unbounded faction names from a syllable grammar |
| `InfiniteLattice` | Pure `nodeAt` / `neighbors` / `factionAt` / `slice` |
| `IUniverseStrategy` | `getNodeDetails` / `expand` / `mountFilesystem` / `deriveHome` |
| `NetworkMap` | Projection: what the player has **discovered** |

`NetworkMap` is deliberately *not* the world. The strategy is the sole
authority on what **exists**; `NetworkMap` remembers what has been **found**.
Existence is derived and unbounded; discovery is knowledge, and is small enough
to serialise into a save.

### Topology

Intra-subnet shape follows the owning faction's character rather than a
topology table:

- **Government** and others — star (everything reaches the hub)
- **Megacorp** — tree (adjacent rungs of the hierarchy)
- **DAO** — mesh (peers sideways with 2–4 neighbours)

Gateways additionally emit 2–5 long-haul links to other subnets, roughly one in
eight of which leaves the sector entirely. That is the escape hatch that keeps
the reachable set open.

### Hostnames vs addresses

An **address** always resolves — anywhere in the lattice, without having been
there. A **hostname** resolves only once discovered.

That asymmetry is deliberate: it is what gives `net-scan` a reason to exist.
You learn names by scanning; you can always fall back to a coordinate.

## The contract

`scripts/InfiniteLattice.test.ts` encodes five promises, each phrased so that
breaking it breaks the build:

1. **Purity** — a coordinate derives identically regardless of what else was queried.
2. **Reproducibility** — the same seed rebuilds the same universe exactly, latency included.
3. **Distinctness** — different seeds are different worlds; faction names do not exhaust.
4. **Unboundedness** — no walk exhausts the reachable set; expansion crosses sectors.
5. **Discovery** — scanning yields hosts outside the initial set.

## Player-facing commands

```
net-scan [host|addr] [-d n] [-k]   expand the lattice; -k lists known hosts only
net-link [user@]host|addr          connect to any resolvable coordinate
net-conf [host]                    interface data derived from that node
gen                                universe summary
gen seed                           the world seed (share it to reproduce this world)
gen node <host|addr>               derive one coordinate
gen expand <host> [r]              derive a neighbourhood
gen probe [n]                      walk outward and report that the frontier stays open
```

## Observed behaviour

From a cold boot on seed `prime-station-seed`:

```
known hosts                 2
net-scan (r2)              18 nodes — 15 local, 3 uplink
net-link an uplink, scan  375 known hosts, 14 further uplinks open
```

A 3000-step walk visited 6291 distinct nodes across 8 sectors (max sector
11766) without a single dead end.

## Extending it

- **New node property** — derive it in `InfiniteLattice.deriveNode` from
  `seed.hash*(..., key)`. Never from the root stream.
- **New topology** — add a `LatticeFactionType` branch in `neighbors`.
- **Bigger space** — already unbounded; nothing to raise.

## Known gaps

- `WorldGenerator.generateWorld` (the eager path) still exists for legacy
  `UIGameManager` entity mapping. It is deprecated; consumers should move to
  `createUniverse`.
- `NetworkMap` keeps a legacy `SystemGenerator` fallback for when no universe
  is attached. Once every composition root attaches one, that branch can go.
- `Math.random` remains in mission//NPC generation outside the lattice; those
  paths are not yet part of the determinism contract.
