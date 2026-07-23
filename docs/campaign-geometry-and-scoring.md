# Campaign Geometry, Balance, and Scoring

## Deterministic battlefield geometry

The theater plate is compiled from the current campaign state. It is not a
geographic reconstruction and does not use decorative irregularity.

Inputs:

- Theater and sector terrain select the primitive family: rectangle,
  trapezoid, rhombus, or right isosceles triangle.
- Ground condition selects the obstacle treatment.
- Network and supply access determine whether the command/supply corridor is
  intact, degraded, or severed.
- Front mileage and sector control determine the front's horizontal position.
- The current or projected operational commitment determines active area.
- Active area is proportional to `committed force / useful frontage`.
- The daily mission determines mission-specific objects. A relay is rendered
  only for a relay or command-network mission.
- The campaign seed, player day, and current state provide deterministic
  tie-breaking entropy. Entropy may choose between valid equivalent layouts; it
  may not invent a battlefield fact.

Every polygon and route is made exclusively from horizontal, vertical, and
45-degree segments. Bisections are perpendicular or symmetrically quartered.
Arbitrary slopes and curves are invalid.

## Path regulation

Every daily campaign docket contains exactly three maneuver paths. The
deterministic calculus ranks their fit against the current mission, terrain,
ground, network, supply, and maneuver base confidence.

- One path occupies the advantage channel: `1 / 3` of the available path
  surface and `+8` execution-confidence points.
- Two paths occupy loss-exposure channels: `2 / 3` of the available path
  surface and `-4` execution-confidence points each.

A uniformly random path therefore enters the advantage channel one third of the
time and a loss-exposure channel two thirds of the time. The player is not
uniformly random: all contributing terms remain inspectable, so recognizing the
state-dependent advantage is skill.

## Campaign-duration distribution

The generator uses a discrete, truncated Gaussian design horizon:

`weight(day) = exp(-0.5 × ((day - 29) / 2.6)^2)`

for Days 15 through 30, normalized so all daily probabilities sum to one. Most
generated campaigns therefore concentrate around Days 28 through 30. A design
horizon of Day 15 is possible but has effectively negligible mass. The
generated horizon is the campaign's earliest victory-eligible day, not a
predetermined outcome. Reaching the victory threshold still requires the
player's orders, while failure to reach it pushes the result later. The seeded
horizon is disclosed on the theater plate.

An inert command receives `-1.10 km` base front pressure per day before other
disclosed pressures. The campaign loses as soon as the front reaches `-12 km`;
the seeded inert-collapse label is Day 8, 9, or 10. Victory is legal when the
front reaches `+12 km` and the seeded resolution horizon has opened. Any
campaign still active after Day 30 is resolved by the sign of the front.

## Campaign Score

`Campaign Score = completion + production range + casualty control + inflicted losses + early-victory acceleration`

The result is clamped to `0–10,000`.

- Completion: `3,200` for victory, `1,600` for defeat, or up to `900` partial
  credit for an abandoned campaign.
- Production range: `(minimum daily net output + maximum daily net output) ×
  0.012`, bounded from `-500` to `1,800`.
- Casualty control: `2,600 - (minimum daily suffered + maximum daily suffered)
  × 0.018`, bounded from `0` to `2,600`.
- Inflicted losses: `(minimum daily inflicted + maximum daily inflicted) ×
  0.018`, bounded from `0` to `2,200`.
- Early-victory acceleration: zero on Day 28 or later and zero for defeats or
  abandonment. For a victory before Day 28:

`2,600 × (exp((28 - days) / 5.2) - 1) / (exp(13 / 5.2) - 1)`

The term grows exponentially toward Day 15 because an early victory occupies a
rapidly thinning part of the generated campaign distribution. The complete
component calculation is exposed on the terminal score, the permanent Campaign
Record, and through Ava's current-score or service-record report.
