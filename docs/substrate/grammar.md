# Substrate grammar

Copyable grammar source for clients and future agents.

## Canonical operations

`HELP`, `BRIEF`, `STATUS`, `SHOW_DOCKET`, `SHOW_CHOICE`, `ASK_AVA`, `ADVISE`,
`COMPARE`, `RANK`, `PREPARE`, `CONFIRM`, `CANCEL`, `INTERRUPTS`, `MISSIONS`,
`SERVICE_RECORD`, `RECENT_DISPATCHES`, `WHOAMI`, `LOGOUT`, `QUIT`
and the local presentation operation `EXPORT_CHAT`.

## Deterministic surface commands

```
help
brief
status
production
military
diplomacy
diplomacy <actor>
show <choice-id>
ask ava <question>
advise
advise production
advise military
advise diplomacy <actor>
compare <choice-id> <choice-id> [<choice-id>]
rank production
rank military
rank diplomacy <actor>
prepare <choice-id>
confirm <proposal-token>
cancel <proposal-token>
interrupts
missions
service record
recent dispatches
whoami
logout
quit
export chat
export ava chat
export ava chat log
export ava log
daily briefing
brief me
```

## Interaction and realization

The compiler labels every utterance as `open-ended` or `explicit` before
realization. In concise mode, explicit commands render their operational result
without an ornamental field-note preface. Open-ended requests may be narrated,
but an unscoped next-action request is bounded to the Main Campaign so Ava
answers one module at a time. The answer contains a situation summary, one
recommendation, and the three canonical M1/M2/M3 declarations; it does not
prepare or issue an order.

`storyteller mode` permits narrative expansion for both reads and explicit
commands. `concise mode` restores the interaction-sensitive default.

The daily briefing has two read-only realizations:

| Surface | Realization |
|---|---|
| `daily` / `daily brief` / `daily briefing` | Exact authored headline, complete multi-paragraph morning dispatch, command question, and maneuver flavor |
| `brief` / `brief me` / `summarize the daily briefing` | Deterministic Ava paraphrase with a route back to the exact text |

Canonical briefing text is never decorated or paraphrased, even while
storyteller mode is active.

On the first active game view for each campaign day in a browser session, the
web adapter invokes the same Nexus `brief` read automatically and opens Ava on
that paraphrase. This is a presentation trigger only; the text and discourse
transition remain canonical Nexus output.

The reviewed hard-coded utterance corpus, permutations, and assimilation rules
are recorded append-only in `docs/substrate/assimilation-ledger.md`.

## Target-of-opportunity lifecycle

Organic targets of opportunity use one deterministic face of a three-sided
daily roll on eligible campaign days. Day 1 is never eligible. A debug override
may still force the current day, including Day 1, without changing the organic
schedule.

Once an opportunity is visible, the disclosure projection pins that exact
packet before replacing the private campaign seed. Browser, Ava, and SSH
therefore plan and execute against one visible action identity. Responses pass
through the typed Nexus planning gate, resolve immediately, and spend no
strategic order.

## Authenticated debug turnover

`daily unlock on` and `daily unlock off` compile to one typed account-turn
intent. The authenticated turn service persists the setting. It is deliberately
not campaign state and does not create a second day-resolution implementation.
`godmode on/off`, `god mode on/off`, and `enable/disable god mode` are exact
aliases over that same account-turn intent.

## Module discourse and ordinal wrappers

When Ava displays a Production, Military, or actor-bound Diplomacy docket, she
stores the visible ordered entity identities in session discourse. Conversational
module wrappers such as `anything useful in production` reopen the canonical
docket. Follow-ups such as `production 1`, `more on production 1`, and `advise
1` resolve against the last displayed docket, never against catalog order.
Daily rotation replaces the binding when the next docket is displayed.

## Good-faith player needs

Common read-only remarks compile through a bounded player-needs grammar before
generic clarification. The exact utterance index is the high-confidence
rainbow table; a short compositional pass then recognizes the same semantic
need when polite framing or filler changes the surface.

| Need | Canonical operation | Examples |
|---|---|---|
| Next action | `ADVISE` | `what next`, `where do we go from here` |
| How to play | `HELP` | `how to play`, `explain how this game works` |
| Current position | `STATUS` | `catch me up`, `what is going on` |
| Recent actions | retrospective `REPORT` | `what did I do`, `recap our last turn` |

This recovery layer may be generous because every output is read-only. It may
not infer `PREPARE`, `CONFIRM`, `COMMIT`, `ISSUE`, or `RESOLVE_DAY`; those
operations retain exact targets and fail-closed parsing.

Raw player remarks remain in the local Ava session and its explicit chat
export. They are not added to telemetry. An exported miss can therefore become
a reviewed regression fixture without silently creating a player-language
archive.

## Aliases

| Alias | Canonical |
|---|---|
| daily | daily brief (canonical authored text) |
| campaign brief | brief (Ava paraphrase) |
| situation / campaign status | status |
| prod | production |
| mil | military |
| diplo | diplomacy |
| orders | show docket (actionable channels; initial surface uses production) |
| options | show docket for active channel |
| recommend / recommendation | advise |
| evaluate | advise for one supplied choice |
| versus / vs | compare |
| execute / issue / choose | prepare |
| accept | confirm only with active proposal token |
| yes / no | confirm/cancel only with single active prepared proposal + rendered phrase |
| record | service record |
| history | recent dispatches |
| exit | quit |

## Channels

`campaign`, `production`, `military`, `diplomacy`, `upgrade`, `domestic`, `network`

## Strategic dimensions

`production_integrity`, `supply_integrity`, `veteran_preservation`,
`force_preservation`, `territorial_control`, `civil_stability`,
`treasury_preservation`, `diplomatic_autonomy`, `intelligence_advantage`,
`infrastructure_preservation`, `initiative`, `long_term_capacity`

## Tolerance dimensions

`territorial_loss`, `conscript_attrition`, `veteran_attrition`, `civil_unrest`,
`dependency`, `treasury_expenditure`, `supply_disruption`, `short_term_exposure`

## Weights / levels / horizons / objectives

- Weights: `ignore`, `low`, `moderate`, `high`, `critical`
- Tolerance levels: `none`, `low`, `moderate`, `high`, `unrestricted`
- Horizons: `immediate`, `short`, `medium`, `long`
- Objectives: `survive`, `stabilize_front`, `recover_territory`,
  `preserve_industrial_capacity`, `restore_supply`,
  `preserve_experienced_forces`, `build_long_term_capacity`,
  `reduce_foreign_dependency`, `gain_initiative`

## Gate operators

`always`, `all`, `any`, `none`, `not`, `fact`, `band`, `scalar`, `phase`,
`theater`, `history`, `module`, `actor`, `clade`, `active`, `used`, `seen`,
`cooldown`, `orders`, `priority`, `tolerance`, `relationship`, `dependency`,
`exclusion`, `campaignAge`, `surface`

Empty `all`/`none` are true. Empty `any` is false. Unknown operators fail
validation. Missing scalar/relationship/priority/tolerance inputs do not coerce
to zero.

## Semantic response statuses

`OK`, `PREPARED`, `EXECUTED`, `REJECTED`, `EXPIRED`, `ALREADY_EXECUTED`,
`STATE_CHANGED`, `CONFIRMATION_REQUIRED`, `AMBIGUOUS`, `NOT_FOUND`, `FORBIDDEN`
