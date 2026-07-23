# DELENDA.QUEST textual information hierarchy

## Finding

The interface did not have a font problem. It had a role problem: family, size,
weight, color, punctuation, and spacing changed without consistently announcing
what kind of information the player was reading.

Carbon distinguishes compact, productive typography for controls from expressive
typography for moments of reading and emphasis, and warns that mixing styles
inside one component can scramble hierarchy. GOV.UK likewise recommends a
consistent heading hierarchy. USWDS connects readable text to both micro-level
type choices and macro-level content arrangement and gives 66 characters as a
useful long-text line target. DELENDA uses large running text on reading
surfaces, but a terminal is a compact instrument: Ava uses a crisp sans-serif
scale with no sub-12 px text and no ornamental family changes.

Sources:

- https://carbondesignsystem.com/elements/typography/style-strategies/
- https://design-system.service.gov.uk/styles/headings/
- https://designsystem.digital.gov/components/typography/
- https://www.w3.org/TR/WCAG22/
- https://learn.microsoft.com/en-us/gaming/accessibility/xbox-accessibility-guidelines/101
- https://learn.microsoft.com/en-us/gaming/accessibility/xbox-accessibility-guidelines/102

## Semantic roles

| Role | Typeface | Default treatment | Meaning |
|---|---|---|---|
| Ava voice | Sans | 15 px, medium, sentence case, 1.5 line height | Authored judgment and diegetic authority |
| Display | Serif | 32–38 px, bold | One narrative or strategic proposition |
| Heading / answer | Sans | 18–20 px, semibold or bold | Task structure and direct answer |
| Body | Sans | 18 px, regular | Explanation intended to be read continuously |
| Data | Mono | 16–18 px, medium | Values, equations, provenance, handles, time, and state |
| Grammar | Mono | 15–16 px, medium | Commands the player can enter verbatim |
| Label | Mono | 12–14 px, bold uppercase | Short scannable category labels only, never continuous copy |

Within Ava specifically, Body/Answer is 14 px, narrative is 15 px, data is
13 px, and grammar/labels are 12 px. All use the interface sans-serif. This is a
deliberate dense terminal scale, not permission to shrink dashboard copy.

No component may change typeface merely for decoration. A change of family must
mean a change of information authority.

## Ava response order

1. `FIELD NOTE / TOPIC`: one precise, state-bound authored observation.
2. `ANSWER` or `SITUATION`: the direct response in sans.
3. `CALCULATION` and `CUMULATIVE INTELLIGENCE`: evidence only when explicitly requested.
4. `JUDGMENT`, `WARNING`, or `RECOMMENDATION`: the decision layer.
5. `GRAMMAR`: executable examples, never generic help filler.

The opening is generated like the war dispatch: choose an authored sentence role
from live state and topic, then render authoritative facts beneath it. Prose never
owns the calculation. Ordinary counsel is narrative and consequential; detailed
calculus belongs to an explicit request or an exported workbook.

## Punctuation grammar

| Mark | Reserved meaning | Example |
|---|---|---|
| `:` | Label bound to value | `Readiness: 61%` |
| `+` / `−` | Arithmetic only | `−420 personnel` |
| `→` | Navigation or causal consequence | `Shortage → lower output` |
| `/` | Hierarchy | `Military / Personnel / Service` |
| `·` | Peer facts, at most three | `Day 12 · 2 orders · active` |
| `[M2]` | Executable handle | `[M2] Envelopment` |
| `>` | Player-entered command | `> report losses` |
| `…` | Withheld or unresolved information only | `Enemy countermeasure …` |

## Color grammar

- Amber: executable choice or recommendation.
- Cyan: intelligence, link, or inspectable dependency.
- Red: loss, danger, or rejection.
- Green: gain, confirmation, or completed receipt.
- Off-white / white: readable content fields.
- Black: title bars, selected states, and critical authority—not entire menus.

Color is always paired with a word, sign, border, or state; it is never the only
carrier of meaning.

## Measure and spacing

- Ava running text targets 66 characters and never exceeds 80 characters.
- Running prose uses approximately 1.5 line height.
- Blank lines separate semantic blocks, not individual sentences.
- Labels stay short enough to scan without wrapping; explanations live in the
  inspector, not the navigation rail.

## Accessibility contract

- Ordinary reading surfaces target at least 18 px at PC/1080p viewing distance.
  Dense terminal text stays between 12 and 15 px with high contrast and generous
  line height.
- Ordinary text maintains at least 4.5:1 contrast. Large text and non-text
  controls maintain at least 3:1. High-contrast presentation targets 7:1.
- Meaning never depends on color alone. Status color is paired with an explicit
  word, marker, border, or receipt state.
- Player-controlled text scaling to 200%, with reflow or single-axis scrolling,
  remains a requirement. This fixed-token typography pass does not claim that
  scaling control is implemented.
