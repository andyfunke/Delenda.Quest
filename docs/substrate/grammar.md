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
```

## Authenticated debug turnover

`daily unlock on` and `daily unlock off` compile to one typed account-turn
intent. The authenticated turn service persists the setting. It is deliberately
not campaign state and does not create a second day-resolution implementation.

## Aliases

| Alias | Canonical |
|---|---|
| daily brief / campaign brief | brief |
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
