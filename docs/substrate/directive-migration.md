# Directive migration inventory

Source catalogs: `app/game.ts` (`FAMILIES`) and `app/directive-expansion.ts`.

Inventory snapshot (pre-migration counts):

| Metric | Count |
|---|---|
| Families | 56 |
| Executable choices | 237 |
| Production (national) families | 20 |
| Military families | 18 |
| Diplomacy families | 18 |

Channel mapping: existing module `national` maps to substrate channel `production`.

Clade IDs are derived from existing family categories so every executable choice
is retained exactly once. Diplomacy actor bindings are explicit metadata, not
unrestricted defaults. Families marked `shared` are shared mechanics with
actor-specific realization registers.

| Existing family ID | Channel | New clade ID | Family ID | Actor binding | Mechanic IDs | Gate notes | Migrated |
|---|---|---|---|---|---|---|---|
| production | production | production-clade-industrial-command | production | — | guns; steel; air; eyes; balance; common-spares | family.lock=2; existing lock/rejection gates | yes |
| industry | production | production-clade-industrial-command | industry | — | war-economy; disperse; overtime; maintenance; shop-councils | family.lock=4; existing lock/rejection gates | yes |
| finance | production | production-clade-public-finance | finance | — | bonds; profit-tax; print; seize; customs-future | family.lock=3; existing lock/rejection gates | yes |
| service | military | military-clade-force-generation | service | — | volunteer; selective; universal; levy; auxiliary | family.lock=4; existing lock/rejection gates | yes |
| price | military | military-clade-force-generation | price | — | base-pay; bonus; stipends; survivors | family.lock=3; existing lock/rejection gates | yes |
| training-capacity | military | military-clade-training-and-induction | training-capacity | — | camps; academy; schools; field | family.lock=4; existing lock/rejection gates | yes |
| training-standard | military | military-clade-training-and-induction | training-standard | — | full; compressed; specialist; marginal | family.lock=4; existing lock/rejection gates | yes |
| tempo | military | military-clade-operations | tempo | — | hold; method; surge; wave | family.lock=1; existing lock/rejection gates | yes |
| desertion | military | military-clade-personnel-sustainment | desertion | — | amnesty; patrols; stations; rations; reclassify | family.lock=2; existing lock/rejection gates | yes |
| home-front | production | production-clade-labor-mobilization | home-front | — | ration-equally; priority-industry; curfew; local-councils; salvage-bureaus | family.lock=3; existing lock/rejection gates | yes |
| casualty-politics | production | production-clade-public-finance | casualty-politics | — | publish-rolls; sealed-ledger; public-mourning; victory-accounting; survivor-estates | family.lock=2; existing lock/rejection gates | yes |
| supply | diplomacy | diplomacy-clade-access-and-exchange | supply | orison | credit; port; shadow; transit | family.lock=4; existing lock/rejection gates | yes |
| statecraft | diplomacy | diplomacy-clade-influence-and-coercion | statecraft | cineric | summit; backchannel; ultimatum; denial | family.lock=2; existing lock/rejection gates | yes |
| treaties | diplomacy | diplomacy-clade-commitments-and-alliances | treaties | shared | mutual-defense; intel-pact; transit-treaty; nonaggression; secret-annex | family.lock=4; existing lock/rejection gates | yes |
| sanctions | diplomacy | diplomacy-clade-influence-and-coercion | sanctions | cineric | total-embargo; targeted-controls; secondary-sanctions; humanitarian-exemption; lift-sanctions | family.lock=3; existing lock/rejection gates | yes |
| alliance-obligations | diplomacy | diplomacy-clade-commitments-and-alliances | alliance-obligations | orison | send-munitions; accept-liaison; refuse-call; request-corps | family.lock=2; existing lock/rejection gates | yes |
| network-posture | military | military-clade-command-network | network-posture | — | broadcast; dark; distributed; burst-windows | family.lock=1; existing lock/rejection gates | yes |
| network-authentication | military | military-clade-command-network | network-authentication | — | triple-challenge; delegated-keys; rolling-codes; one-time-pads | family.lock=2; existing lock/rejection gates | yes |
| network-custody | military | military-clade-command-network | network-custody | — | central-archive; field-custody; burn-after-use; split-archive | family.lock=3; existing lock/rejection gates | yes |
| foreign-intelligence | diplomacy | diplomacy-clade-access-and-exchange | foreign-intelligence | kestrel | fused-exchange; compartmented; unilateral-collection; exchange-prisoner-files | family.lock=3; existing lock/rejection gates | yes |
| expenditure | production | production-clade-public-finance | expenditure | — | frontline-procurement; civil-payrolls; defer-capital; audit-contracts; empty-ceremonial | family.lock=3; existing lock/rejection gates | yes |
| war-labor | production | production-clade-labor-mobilization | war-labor | — | recall-skilled-reservists; displaced-labor; equal-war-wages; shift-discipline; protected-rest | family.lock=3; existing lock/rejection gates | yes |
| strategic-freight | production | production-clade-strategic-distribution | strategic-freight | — | rail-priority; night-convoys; river-barges; civilian-fleet; distributed-depots | family.lock=2; existing lock/rejection gates | yes |
| tooling-policy | production | production-clade-industrial-command | tooling-policy | — | master-dies; standard-components; tooling-to-failure; floating-toolrooms | family.lock=3; existing lock/rejection gates | yes |
| procurement-pricing | production | production-clade-public-finance | procurement-pricing | — | cost-plus; fixed-price; open-book; auction-scarcity | family.lock=3; existing lock/rejection gates | yes |
| shift-system | production | production-clade-labor-mobilization | shift-system | — | twelve-hour-shifts; rotating-crews; blackout-shifts; maintenance-sabbath | family.lock=2; existing lock/rejection gates | yes |
| skilled-allocation | production | production-clade-labor-mobilization | skilled-allocation | — | reserve-toolmakers; field-repair; apprentice-dilution; women-technical-corps | family.lock=3; existing lock/rejection gates | yes |
| depot-policy | production | production-clade-strategic-distribution | depot-policy | — | forward-depots; buried-depots; mobile-depots; dummy-depots | family.lock=2; existing lock/rejection gates | yes |
| transport-priority | production | production-clade-strategic-distribution | transport-priority | — | ammunition-first; machine-tools-first; food-and-coal; repair-trains | family.lock=2; existing lock/rejection gates | yes |
| mineral-output | production | production-clade-resource-extraction | mineral-output | — | deepen-mines; strip-mines; foreign-concentrate; tailings-retreatment | family.lock=4; existing lock/rejection gates | yes |
| scrap-recovery | production | production-clade-resource-extraction | scrap-recovery | — | battlefield-salvage; household-drive; raze-obsolete-plant; sunken-tonnage | family.lock=2; existing lock/rejection gates | yes |
| energy-supply | production | production-clade-resource-extraction | energy-supply | — | grid-priority; emergency-coal; hydro-reserve; factory-microgrids | family.lock=3; existing lock/rejection gates | yes |
| civilian-rationing | production | production-clade-civilian-conversion | civilian-rationing | — | durable-goods; transport-fuel; protect-essentials; heat-zones | family.lock=3; existing lock/rejection gates | yes |
| civil-conversion | production | production-clade-civilian-conversion | civil-conversion | — | appliance-fuses; bus-carriers; press-shells; cinema-optics | family.lock=3; existing lock/rejection gates | yes |
| substitute-materials | production | production-clade-civilian-conversion | substitute-materials | — | wood-fabric; low-grade-steel; synthetic-feedstocks; ceramic-bearings | family.lock=2; existing lock/rejection gates | yes |
| operational-reserve | military | military-clade-operations | operational-reserve | — | central-reserve; release-reserve; rotate-battalions; strip-rear | family.lock=2; existing lock/rejection gates | yes |
| unit-recovery | military | military-clade-personnel-sustainment | unit-recovery | — | scheduled-rotation; walking-wounded; rebuild-cadres; convalescent-leave | family.lock=3; existing lock/rejection gates | yes |
| branch-priority | military | military-clade-force-generation | branch-priority | — | infantry-cadres; armored-crews; battery-schools; drone-operators | family.lock=3; existing lock/rejection gates | yes |
| industrial-accords | diplomacy | diplomacy-clade-access-and-exchange | industrial-accords | orison | licensed-tooling; component-clearing; reverse-engineering; calibration-mission | family.lock=3; existing lock/rejection gates | yes |
| information-diplomacy | diplomacy | diplomacy-clade-influence-and-coercion | information-diplomacy | kestrel | publish-captured-orders; embed-correspondents; broadcast-surrender; neutral-film-reels | family.lock=2; existing lock/rejection gates | yes |
| burden-sharing | diplomacy | diplomacy-clade-commitments-and-alliances | burden-sharing | orison | joint-procurement; air-defense-host; refugee-rail; casualty-pool | family.lock=3; existing lock/rejection gates | yes |
| specialist-schools | military | military-clade-training-and-induction | specialist-schools | — | combat-engineers; signals-schools; mechanic-cadres; forward-medics | family.lock=3; existing lock/rejection gates | yes |
| combined-arms-command | military | military-clade-operations | combined-arms-command | — | infantry-clock; armor-clock; fire-plan-clock; air-window-clock | family.lock=2; existing lock/rejection gates | yes |
| medical-replacement | military | military-clade-personnel-sustainment | medical-replacement | — | forward-surgery; return-to-duty; evacuation-priority; convalescent-labor | family.lock=3; existing lock/rejection gates | yes |
| procurement-goal | military | military-clade-military-production-goals | procurement-goal | — | shell-reserve-goal; armor-reserve-goal; airframe-reserve-goal; drone-reserve-goal | family.lock=1; existing lock/rejection gates | yes |
| equipment-standard | military | military-clade-military-production-goals | equipment-standard | — | common-kit; heavy-kit; light-kit; night-kit | family.lock=3; existing lock/rejection gates | yes |
| sustainment-goal | military | military-clade-military-production-goals | sustainment-goal | — | twelve-day-fire; serviceable-fleet; sortie-depth; battery-depth | family.lock=2; existing lock/rejection gates | yes |
| neutral-courtship | diplomacy | diplomacy-clade-neutral-powers | neutral-courtship | vey | neutral-conference; royal-honors; grain-guarantee; recognize-claims | family.lock=3; existing lock/rejection gates | yes |
| neutral-transit | diplomacy | diplomacy-clade-neutral-powers | neutral-transit | vey | sealed-trains; flag-convenience; river-immunity; air-corridor | family.lock=3; existing lock/rejection gates | yes |
| neutral-finance | diplomacy | diplomacy-clade-neutral-powers | neutral-finance | vey | gold-swap; war-bond-clearing; freeze-rival-assets; broker-credit | family.lock=3; existing lock/rejection gates | yes |
| prisoner-exchange | diplomacy | diplomacy-clade-humanitarian-and-legal-warfare | prisoner-exchange | shared | one-for-one; wounded-first; officer-ledger; neutral-inspection | family.lock=3; existing lock/rejection gates | yes |
| relief-access | diplomacy | diplomacy-clade-humanitarian-and-legal-warfare | relief-access | vey | hospital-trains; relief-port; food-truce; child-evacuation | family.lock=3; existing lock/rejection gates | yes |
| legal-war | diplomacy | diplomacy-clade-humanitarian-and-legal-warfare | legal-war | cineric | forensic-commission; publish-chain; preserve-orders; universal-jurisdiction | family.lock=2; existing lock/rejection gates | yes |
| proxy-armament | diplomacy | diplomacy-clade-proxy-and-clandestine-relations | proxy-armament | kestrel | small-arms-pipeline; drone-pipeline; adviser-teams; cutout-funding | family.lock=2; existing lock/rejection gates | yes |
| exile-government | diplomacy | diplomacy-clade-proxy-and-clandestine-relations | exile-government | cineric | recognize-exiles; exile-legion; broadcast-exiles; defer-recognition | family.lock=3; existing lock/rejection gates | yes |
| covert-purchases | diplomacy | diplomacy-clade-proxy-and-clandestine-relations | covert-purchases | kestrel | machine-tools; aviation-fuel; cryptographic-stock; liquidate-cache | family.lock=2; existing lock/rejection gates | yes |

## Validation rules

1. Every existing executable choice appears exactly once above.
2. No choice was deleted to fit the daily docket.
3. Duplicate display names do not imply duplicate mechanics.
4. Diplomacy choices have explicit actor eligibility or shared-mechanic status.
5. Tests compare inventory counts before and after adapters.
6. Orphaned mechanics, unreachable gates, empty clades, and actors without a valid tree fail validation.
