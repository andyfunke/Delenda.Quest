const choice = (
  id: string,
  label: string,
  flavor: string,
  exact: string[],
  risk: string[],
  extra: Record<string, unknown> = {},
) => ({ id, label, flavor, exact, risk, ...extra });

export const DIRECTIVE_CATEGORY_OVERRIDES: Record<string, string> = {
  "home-front": "Labor Mobilization",
  "casualty-politics": "Public Finance",
};

export const DIRECTIVE_CHOICE_ADDITIONS: Record<
  string,
  Array<ReturnType<typeof choice>>
> = {
  "tooling-policy": [
    choice(
      "floating-toolrooms",
      "Float Mobile Toolrooms",
      "Precision machinery travels to the broken line instead of waiting for the broken line to travel.",
      ["Treasury: -5.0 B", "Materiel condition: +4", "Maintenance debt: -4"],
      ["Mobile shops sacrifice depth and are vulnerable in transit"],
      { delta: { treasury: -5, materiel: 4, maintenanceDebt: -4 } },
    ),
  ],
  "procurement-pricing": [
    choice(
      "auction-scarcity",
      "Auction Scarce Contracts",
      "The state discovers the price of urgency by inviting every supplier to name it publicly.",
      ["Treasury: +4.0 B", "Materiel condition: -2", "Legitimacy: -1", "Resistance: +1"],
      ["Low bids externalize defects into the field"],
      { delta: { treasury: 4, materiel: -2, legitimacy: -1, resistance: 1 } },
    ),
  ],
  "shift-system": [
    choice(
      "maintenance-sabbath",
      "Mandate a Maintenance Sabbath",
      "One silent shift prevents a week of machines failing individually.",
      ["Materiel condition: +6", "Maintenance debt: -7", "Treasury: -3.0 B", "Workforce: -8,000"],
      ["Immediate output falls while the machinery is opened"],
      { delta: { materiel: 6, maintenanceDebt: -7, treasury: -3, workforce: -8000 } },
    ),
  ],
  "skilled-allocation": [
    choice(
      "women-technical-corps",
      "Commission a Women’s Technical Corps",
      "The labor category is widened before the tolerance category is.",
      ["Workforce: +32,000", "Training capacity: +3,000", "Materiel condition: +3", "Resistance: +1"],
      ["Entrenched guild authority resists the new commission"],
      { delta: { workforce: 32000, training: 3000, materiel: 3, resistance: 1 } },
    ),
  ],
  "depot-policy": [
    choice(
      "dummy-depots",
      "Build Dummy Depots",
      "The enemy spends reconnaissance and shells against warehouses containing only confidence.",
      ["Treasury: -3.0 B", "Intelligence: +4", "Materiel condition: +2"],
      ["Deception fails catastrophically if real traffic reveals the true depots"],
      { delta: { treasury: -3, intelligence: 4, materiel: 2 } },
    ),
  ],
  "transport-priority": [
    choice(
      "repair-trains",
      "Dispatch Repair Trains First",
      "The railway carries the means of becoming a railway again.",
      ["Treasury: -4.0 B", "Materiel condition: +5", "Maintenance debt: -5", "Readiness: -1"],
      ["Frontline deliveries wait behind infrastructure repair"],
      { delta: { treasury: -4, materiel: 5, maintenanceDebt: -5, readiness: -1 } },
    ),
  ],
  "mineral-output": [
    choice(
      "tailings-retreatment",
      "Retreat the Old Tailings",
      "Yesterday’s waste becomes today’s ore because the definition of economical has changed.",
      ["Treasury: -3.0 B", "Materiel condition: +4", "Workforce: -6,000"],
      ["Recovered grades decline rapidly after the first pass"],
      { delta: { treasury: -3, materiel: 4, workforce: -6000 } },
    ),
  ],
  "scrap-recovery": [
    choice(
      "sunken-tonnage",
      "Raise Sunken Tonnage",
      "The harbor returns ships as metal after refusing to return them as ships.",
      ["Treasury: -6.0 B", "Materiel condition: +5", "Equipment Coverage: +2", "Intelligence: +1"],
      ["Salvage crews and cranes leave current port work"],
      { delta: { treasury: -6, materiel: 5, equipment: 2, intelligence: 1 } },
    ),
  ],
  "energy-supply": [
    choice(
      "factory-microgrids",
      "Island the Factory Microgrids",
      "The arsenal remains lit by disconnecting it from everyone waiting for the same current.",
      ["Treasury: -7.0 B", "Materiel condition: +5", "Resistance: +2", "Dependency: -1"],
      ["Civil districts absorb the instability removed from war plants"],
      { delta: { treasury: -7, materiel: 5, resistance: 2, dependency: -1 } },
    ),
  ],
  "civilian-rationing": [
    choice(
      "heat-zones",
      "Concentrate Civilian Heat Zones",
      "Warmth is preserved by making the population travel to it.",
      ["Treasury: +3.0 B", "Materiel condition: +2", "Legitimacy: -2", "Resistance: +2"],
      ["Cold districts become politically legible"],
      { delta: { treasury: 3, materiel: 2, legitimacy: -2, resistance: 2 } },
    ),
  ],
  "civil-conversion": [
    choice(
      "cinema-optics",
      "Convert Cinema Optics",
      "Projection glass learns to look through sights instead of at screens.",
      ["Equipment Coverage: +4", "Intelligence: +2", "Treasury: -3.0 B", "Legitimacy: -1"],
      ["Civil information capacity contracts with the theaters"],
      { delta: { equipment: 4, intelligence: 2, treasury: -3, legitimacy: -1 } },
    ),
  ],
  "substitute-materials": [
    choice(
      "ceramic-bearings",
      "Authorize Ceramic Bearings",
      "A brittle solution is accepted because the unavailable metal is perfectly useless.",
      ["Materiel condition: +4", "Equipment Coverage: +2", "Treasury: -5.0 B", "Maintenance debt: +2"],
      ["Shock failure rises in heavy platforms"],
      { delta: { materiel: 4, equipment: 2, treasury: -5, maintenanceDebt: 2 } },
    ),
  ],
  "foreign-intelligence": [
    choice(
      "exchange-prisoner-files",
      "Exchange Prisoner Files",
      "Names, units, and absences become a map no aerial observer could photograph.",
      ["Vey Trust growth: +0.8/day", "Vey Leverage growth: +0.3/day", "Intelligence: +5", "Reciprocity: +3"],
      ["The exchange reveals what your own interrogators considered important"],
      { delta: { intelligence: 5, reciprocity: 3 }, duration: 4, actorEffects: [{ actorId: "vey", metric: "trust", perDay: 0.8 }, { actorId: "vey", metric: "leverage", perDay: 0.3 }] },
    ),
  ],
  "industrial-accords": [
    choice(
      "calibration-mission",
      "Host an Allied Calibration Mission",
      "Foreign metrologists arrive to explain which domestic tolerances were aspirations.",
      ["Orison Trust growth: +1.1/day", "Orison Obligation: +0.5/day", "Materiel condition: +5", "Treasury: -6.0 B"],
      ["Inspection authority becomes a precedent for procurement authority"],
      { delta: { materiel: 5, treasury: -6 }, duration: 5, actorEffects: [{ actorId: "orison", metric: "trust", perDay: 1.1 }, { actorId: "orison", metric: "obligation", perDay: 0.5 }] },
    ),
  ],
  "information-diplomacy": [
    choice(
      "neutral-film-reels",
      "Circulate Neutral Film Reels",
      "The war is edited for audiences whose governments still pretend distance is policy.",
      ["Vey Trust growth: +0.9/day", "Cineric Leverage decay: -0.3/day", "Legitimacy: +2", "Treasury: -2.0 B"],
      ["Every useful image also discloses something about your own army"],
      { delta: { legitimacy: 2, treasury: -2 }, duration: 4, actorEffects: [{ actorId: "vey", metric: "trust", perDay: 0.9 }, { actorId: "cineric", metric: "leverage", perDay: -0.3 }] },
    ),
  ],
  "burden-sharing": [
    choice(
      "casualty-pool",
      "Create a Coalition Casualty Pool",
      "The alliance agrees that replacement is collective immediately before counting who supplies the replacements.",
      ["Orison Trust growth: +1.3/day", "Orison Obligation: +1.2/day", "Replacement reserve: +7,000", "Treasury: -5.0 B", "Dependency: +2"],
      ["Shared replacement authority dilutes national control of formations"],
      { delta: { reserves: 7000, treasury: -5, dependency: 2 }, duration: 5, actorEffects: [{ actorId: "orison", metric: "trust", perDay: 1.3 }, { actorId: "orison", metric: "obligation", perDay: 1.2 }] },
    ),
  ],
};

const family = (
  id: string,
  module: "military" | "diplomacy",
  category: string,
  label: string,
  brief: string,
  lock: number,
  choices: Array<ReturnType<typeof choice>>,
) => ({ id, module, category, label, brief, lock, choices });

export const ADDITIONAL_DIRECTIVE_FAMILIES = [
  family(
    "specialist-schools",
    "military",
    "Training and Induction",
    "Commission Specialist Schools",
    "Choose which scarce competence is reproduced before casualties make the curriculum shorter.",
    3,
    [
      choice("combat-engineers", "Expand Combat Engineer Schools", "The army trains soldiers to change the ground before asking infantry to cross it.", ["Training capacity: +2,000", "Training quality: +5", "Materiel condition: +2", "Treasury: -5.0 B"], ["Engineer cadres replace fewer line infantry"], { delta: { training: 2000, quality: 5, materiel: 2, treasury: -5 } }),
      choice("signals-schools", "Expand Signals Schools", "Command receives more people capable of proving that an order arrived.", ["Training capacity: +3,000", "Training quality: +4", "Intelligence: +5", "Treasury: -4.0 B"], ["Technical instructors leave field relay units"], { delta: { training: 3000, quality: 4, intelligence: 5, treasury: -4 } }),
      choice("mechanic-cadres", "Raise Mechanic Cadres", "The replacement system begins producing the people who return equipment to the replacement system.", ["Training capacity: +2,000", "Equipment Coverage: +4", "Maintenance debt: -5", "Treasury: -6.0 B"], ["Mechanics consume industrial labor before reaching formations"], { delta: { training: 2000, equipment: 4, maintenanceDebt: -5, treasury: -6 } }),
      choice("forward-medics", "Accelerate Forward Medic Training", "The wounded receive a route out before the formation receives another rifle.", ["Training capacity: +4,000", "Readiness: +3", "Legitimacy: +2", "Treasury: -4.0 B"], ["Compressed medical training reduces depth of treatment"], { delta: { training: 4000, readiness: 3, legitimacy: 2, treasury: -4 } }),
    ],
  ),
  family(
    "combined-arms-command",
    "military",
    "Operations",
    "Set Combined-Arms Priority",
    "Decide which combat arm supplies the day’s tempo and which arms must synchronize around it.",
    2,
    [
      choice("infantry-clock", "March on the Infantry Clock", "Fire and vehicles move at the speed required to keep men attached to the plan.", ["Readiness: +3", "Equipment Coverage: +1", "Front position: -0.2 km"], ["Tempo is surrendered to cohesion"], { delta: { readiness: 3, equipment: 1, front: -0.2 } }),
      choice("armor-clock", "March on the Armor Clock", "The plan accepts gaps in exchange for mass arriving before caution.", ["Equipment Coverage: -4", "Readiness: -2", "Front position: +0.6 km", "Treasury: -4.0 B"], ["Recovery units inherit every mechanical failure"], { delta: { equipment: -4, readiness: -2, front: 0.6, treasury: -4 } }),
      choice("fire-plan-clock", "March on the Fire Plan", "Movement occurs when the barrage says the ground is survivable.", ["Materiel condition: -3", "Readiness: +2", "Front position: +0.4 km", "Intelligence: +2"], ["Late formations enter ground after protection has moved on"], { delta: { materiel: -3, readiness: 2, front: 0.4, intelligence: 2 } }),
      choice("air-window-clock", "March on the Air Window", "The entire operation compresses into the interval in which aircraft can still find it.", ["Equipment Coverage: -2", "Intelligence: +4", "Front position: +0.5 km", "Treasury: -5.0 B"], ["Weather can cancel coordination without canceling exposure"], { delta: { equipment: -2, intelligence: 4, front: 0.5, treasury: -5 } }),
    ],
  ),
  family(
    "medical-replacement",
    "military",
    "Personnel Sustainment",
    "Govern the Medical Replacement System",
    "Choose whether the casualty chain optimizes survival, return to duty, or visible political mercy.",
    3,
    [
      choice("forward-surgery", "Push Surgery Forward", "Operating tables move toward the wounds until both enter artillery range.", ["Readiness: +4", "Legitimacy: +2", "Treasury: -6.0 B", "Materiel condition: -2"], ["Medical infrastructure becomes tactically vulnerable"], { delta: { readiness: 4, legitimacy: 2, treasury: -6, materiel: -2 } }),
      choice("return-to-duty", "Create Return-to-Duty Battalions", "Recovery is organized as a formation rather than a sequence of individual permissions.", ["Replacement reserve: +8,000", "Readiness: -2", "Desertion pressure: +2"], ["Premature return transfers medical debt to unit commanders"], { delta: { reserves: 8000, readiness: -2, desertionPressure: 2 } }),
      choice("evacuation-priority", "Guarantee Evacuation Priority", "Every soldier is promised that transport will eventually move in his direction.", ["Legitimacy: +4", "Desertion pressure: -5", "Treasury: -5.0 B", "Deployable force: -4,000"], ["Ambulance and rail capacity displace replacement movement"], { delta: { legitimacy: 4, desertionPressure: -5, treasury: -5, deployable: -4000 }, delay: { days: 2, delta: { deployable: 4000 } } }),
      choice("convalescent-labor", "Assign Convalescent Labor", "The wounded remain inside the war economy even when removed from combat.", ["Workforce: +18,000", "Treasury: +3.0 B", "Legitimacy: -2", "Resistance: +2"], ["Recovery slows when usefulness becomes a discharge condition"], { delta: { workforce: 18000, treasury: 3, legitimacy: -2, resistance: 2 } }),
    ],
  ),
  family(
    "procurement-goal",
    "military",
    "Military Production Goals",
    "Set Strategic Procurement Goal",
    "Tell Production which missing class of war stock is allowed to become everyone else’s shortage.",
    1,
    [
      choice("shell-reserve-goal", "Build the Shell Reserve", "The army requests enough stored fire to survive a bad week without revising doctrine.", ["Production target: Munitions", "Materiel condition: +1"], ["Armor, flight, and drone output lose marginal allocation"], { target: "munitions", delta: { materiel: 1 } }),
      choice("armor-reserve-goal", "Build the Armor Reserve", "Replacement hulls wait behind the front so tactical mobility can fail more than once.", ["Production target: Armor", "Equipment Coverage: +2", "Treasury: -3.0 B"], ["Munitions coverage grows more slowly"], { target: "armor", delta: { equipment: 2, treasury: -3 } }),
      choice("airframe-reserve-goal", "Build the Airframe Reserve", "Aircraft are accumulated against the day weather and maintenance agree.", ["Production target: Flight", "Intelligence: +2", "Treasury: -4.0 B"], ["Ground equipment receives fewer precision components"], { target: "flight", delta: { intelligence: 2, treasury: -4 } }),
      choice("drone-reserve-goal", "Build the Drone Reserve", "Disposable reach is ordered in quantities large enough to become doctrine.", ["Production target: Drones", "Intelligence: +3", "Treasury: -2.0 B"], ["Electronics and operators become the new bottleneck"], { target: "drones", delta: { intelligence: 3, treasury: -2 } }),
    ],
  ),
  family(
    "equipment-standard",
    "military",
    "Military Production Goals",
    "Define the Field Equipment Standard",
    "Choose what every formation should possess before the word equipped is allowed into a report.",
    3,
    [
      choice("common-kit", "Issue the Common Infantry Kit", "Uniform mediocrity is made more useful than incompatible excellence.", ["Equipment Coverage: +5", "Materiel condition: +2", "Treasury: -5.0 B"], ["Specialist formations lose bespoke equipment"], { delta: { equipment: 5, materiel: 2, treasury: -5 } }),
      choice("heavy-kit", "Issue the Heavy Assault Kit", "Protection and breaching tools are concentrated where casualties are expected to become geometry.", ["Equipment Coverage: +4", "Readiness: +2", "Treasury: -8.0 B", "Materiel condition: -2"], ["Transport and repair demand rise sharply"], { delta: { equipment: 4, readiness: 2, treasury: -8, materiel: -2 } }),
      choice("light-kit", "Issue the Light Mobile Kit", "The formation is equipped to arrive with fewer things capable of delaying it.", ["Readiness: +4", "Equipment Coverage: -2", "Materiel condition: +2", "Treasury: -3.0 B"], ["Protection and staying power are deliberately omitted"], { delta: { readiness: 4, equipment: -2, materiel: 2, treasury: -3 } }),
      choice("night-kit", "Issue the Night Fighting Kit", "Darkness becomes equipment instead of weather.", ["Intelligence: +5", "Readiness: +3", "Treasury: -7.0 B", "Equipment Coverage: -1"], ["Optics and batteries are drawn away from other formations"], { delta: { intelligence: 5, readiness: 3, treasury: -7, equipment: -1 } }),
    ],
  ),
  family(
    "sustainment-goal",
    "military",
    "Military Production Goals",
    "Set the Sustainment Goal",
    "Choose which measure must remain true after the army has used today’s stock.",
    2,
    [
      choice("twelve-day-fire", "Demand Twelve Days of Fire", "Coverage is treated as a strategic position no less real than a ridge.", ["Production target: Munitions", "Treasury: -4.0 B", "Readiness: +2"], ["Current equipment replacement is deferred"], { target: "munitions", delta: { treasury: -4, readiness: 2 } }),
      choice("serviceable-fleet", "Demand a Serviceable Fleet", "Repairable vehicles are counted as future strength only after someone is assigned to repair them.", ["Production target: Armor", "Equipment Coverage: +4", "Maintenance debt: -4", "Treasury: -6.0 B"], ["Shell reserve growth slows"], { target: "armor", delta: { equipment: 4, maintenanceDebt: -4, treasury: -6 } }),
      choice("sortie-depth", "Demand Sortie Depth", "The air arm must be able to fly again after the first successful day.", ["Production target: Flight", "Readiness: +3", "Intelligence: +2", "Treasury: -7.0 B"], ["Fuel, engines, and runway repair consume common capacity"], { target: "flight", delta: { readiness: 3, intelligence: 2, treasury: -7 } }),
      choice("battery-depth", "Demand Battery Depth", "Power cells and replacement drones are stored as one operational endurance problem.", ["Production target: Drones", "Intelligence: +4", "Materiel condition: +2", "Treasury: -5.0 B"], ["Civil electronics procurement is subordinated"], { target: "drones", delta: { intelligence: 4, materiel: 2, treasury: -5 } }),
    ],
  ),
  family(
    "neutral-courtship",
    "diplomacy",
    "Neutral Powers",
    "Court the Nonaligned States",
    "Offer distance, prestige, or profit to governments whose neutrality is still under negotiation.",
    3,
    [
      choice("neutral-conference", "Convene a Neutral Conference", "Every delegation arrives to defend neutrality and leaves having priced its exceptions.", ["Vey Trust growth: +1.1/day", "Vey Leverage growth: +0.4/day", "Legitimacy: +2", "Treasury: -4.0 B"], ["The rival receives the same room and microphones"], { delta: { legitimacy: 2, treasury: -4 }, duration: 5, actorEffects: [{ actorId: "vey", metric: "trust", perDay: 1.1 }, { actorId: "vey", metric: "leverage", perDay: 0.4 }] }),
      choice("royal-honors", "Trade Royal Honors for Access", "Ceremony is converted into tonnage by people who insist the ceremony was the real transaction.", ["Vey Trust growth: +0.8/day", "Vey Aid Pipeline: +0.5/day", "Treasury: -2.0 B", "Legitimacy: -1"], ["Domestic audiences see purchased vanity"], { delta: { treasury: -2, legitimacy: -1 }, duration: 4, actorEffects: [{ actorId: "vey", metric: "trust", perDay: 0.8 }, { actorId: "vey", metric: "aidPipeline", perDay: 0.5 }] }),
      choice("grain-guarantee", "Guarantee Neutral Grain", "Food security buys policy from a cabinet that refuses to call itself allied.", ["Vey Trust growth: +1.4/day", "Vey Obligation: +0.6/day", "Treasury: -6.0 B", "Dependency: +2"], ["The guarantee competes with domestic food and freight"], { delta: { treasury: -6, dependency: 2 }, duration: 5, actorEffects: [{ actorId: "vey", metric: "trust", perDay: 1.4 }, { actorId: "vey", metric: "obligation", perDay: 0.6 }] }),
      choice("recognize-claims", "Recognize the Neutral Claims", "A line on their map becomes a line in your future diplomacy.", ["Vey Trust growth: +1.8/day", "Vey Leverage growth: +1.0/day", "Legitimacy: -2", "Treasury: +2.0 B"], ["Postwar freedom of action is sold for current liquidity"], { delta: { legitimacy: -2, treasury: 2 }, duration: 6, actorEffects: [{ actorId: "vey", metric: "trust", perDay: 1.8 }, { actorId: "vey", metric: "leverage", perDay: 1 }] }),
    ],
  ),
  family(
    "neutral-transit",
    "diplomacy",
    "Neutral Powers",
    "Secure Neutral Transit",
    "Turn officially civilian corridors into routes that repeatedly deliver military usefulness.",
    3,
    [
      choice("sealed-trains", "Charter Sealed Trains", "The cargo remains neutral because nobody authorized to inspect it is present.", ["Vey Trust growth: +0.6/day", "Vey Sanctions Exposure: +0.7/day", "Materiel condition: +4", "Treasury: -5.0 B"], ["Exposure can close the whole corridor"], { delta: { materiel: 4, treasury: -5 }, duration: 4, actorEffects: [{ actorId: "vey", metric: "trust", perDay: 0.6 }, { actorId: "vey", metric: "sanctionsExposure", perDay: 0.7 }] }),
      choice("flag-convenience", "Purchase Flags of Convenience", "Ownership is moved on paper until the cargo becomes someone else’s legal problem.", ["Kestrel Trust growth: +0.8/day", "Kestrel Leverage growth: +1.0/day", "Treasury: -4.0 B", "Dependency: +2"], ["Brokers acquire documentary control over the route"], { delta: { treasury: -4, dependency: 2 }, duration: 4, actorEffects: [{ actorId: "kestrel", metric: "trust", perDay: 0.8 }, { actorId: "kestrel", metric: "leverage", perDay: 1 }] }),
      choice("river-immunity", "Declare River Immunity", "A civil waterway is defended by treaty language and the enemy’s remaining appetite for reputation.", ["Vey Trust growth: +1.0/day", "Cineric Leverage decay: -0.5/day", "Materiel condition: +3", "Legitimacy: +1"], ["One strike can disprove the entire arrangement"], { delta: { materiel: 3, legitimacy: 1 }, duration: 5, actorEffects: [{ actorId: "vey", metric: "trust", perDay: 1 }, { actorId: "cineric", metric: "leverage", perDay: -0.5 }] }),
      choice("air-corridor", "Lease a Neutral Air Corridor", "Distance is purchased in minutes and paid for in sovereignty.", ["Orison Trust growth: +0.7/day", "Orison Obligation: +0.5/day", "Intelligence: +4", "Treasury: -7.0 B"], ["Foreign controllers learn the shape of every flight"], { delta: { intelligence: 4, treasury: -7 }, duration: 5, actorEffects: [{ actorId: "orison", metric: "trust", perDay: 0.7 }, { actorId: "orison", metric: "obligation", perDay: 0.5 }] }),
    ],
  ),
  family(
    "neutral-finance",
    "diplomacy",
    "Neutral Powers",
    "Shape Neutral Finance",
    "Move the war through banks that insist money has no nationality.",
    3,
    [
      choice("gold-swap", "Open a Gold Swap Window", "Stored metal is converted into immediate foreign belief.", ["Vey Trust growth: +0.7/day", "Treasury: +12.0 B", "Dependency: +3"], ["Reserve custody passes outside the state"], { delta: { treasury: 12, dependency: 3 }, duration: 4, actorEffects: [{ actorId: "vey", metric: "trust", perDay: 0.7 }] }),
      choice("war-bond-clearing", "Clear War Bonds Abroad", "Foreign savers purchase a claim on a future they do not have to defend.", ["Vey Trust growth: +0.5/day", "Vey Leverage growth: +0.8/day", "Treasury: +9.0 B", "Legitimacy: +1"], ["External creditors gain postwar priority"], { delta: { treasury: 9, legitimacy: 1 }, duration: 5, actorEffects: [{ actorId: "vey", metric: "trust", perDay: 0.5 }, { actorId: "vey", metric: "leverage", perDay: 0.8 }] }),
      choice("freeze-rival-assets", "Freeze Rival Assets", "The enemy’s money is stopped where its army cannot retrieve it.", ["Cineric Trust: -1.5/day", "Cineric Leverage growth: +0.8/day", "Treasury: +5.0 B", "Legitimacy: +2"], ["Reciprocal seizures threaten your foreign reserves"], { delta: { treasury: 5, legitimacy: 2 }, duration: 4, actorEffects: [{ actorId: "cineric", metric: "trust", perDay: -1.5 }, { actorId: "cineric", metric: "leverage", perDay: 0.8 }] }),
      choice("broker-credit", "Accept Broker Credit", "The loan arrives without ideology and with excellent memory.", ["Kestrel Trust growth: +1.0/day", "Kestrel Leverage growth: +1.4/day", "Treasury: +15.0 B", "Dependency: +5"], ["The broker’s claim survives every diplomatic realignment"], { delta: { treasury: 15, dependency: 5 }, duration: 6, actorEffects: [{ actorId: "kestrel", metric: "trust", perDay: 1 }, { actorId: "kestrel", metric: "leverage", perDay: 1.4 }] }),
    ],
  ),
  family(
    "prisoner-exchange",
    "diplomacy",
    "Humanitarian and Legal Warfare",
    "Negotiate Prisoner Exchange",
    "Treat custody as manpower, intelligence, reciprocity, and public evidence at once.",
    3,
    [
      choice("one-for-one", "Exchange One for One", "Equality is imposed on bodies whose military value was never equal.", ["Cineric Trust growth: +1.0/day", "Cineric Leverage decay: -0.3/day", "Replacement reserve: +6,000", "Reciprocity: +6"], ["Experienced enemy personnel return as well"], { delta: { reserves: 6000, reciprocity: 6 }, duration: 4, actorEffects: [{ actorId: "cineric", metric: "trust", perDay: 1 }, { actorId: "cineric", metric: "leverage", perDay: -0.3 }] }),
      choice("wounded-first", "Exchange the Wounded First", "Mercy is sequenced where it produces the clearest evidence.", ["Cineric Trust growth: +0.8/day", "Legitimacy: +4", "Reciprocity: +8", "Treasury: -3.0 B"], ["Few returned personnel are immediately deployable"], { delta: { legitimacy: 4, reciprocity: 8, treasury: -3 }, duration: 4, actorEffects: [{ actorId: "cineric", metric: "trust", perDay: 0.8 }] }),
      choice("officer-ledger", "Trade the Officer Ledger", "Rank is converted into information before it is converted into release.", ["Cineric Leverage growth: +1.2/day", "Intelligence: +6", "Reciprocity: +2", "Legitimacy: -1"], ["The enemy learns which officers you considered valuable"], { delta: { intelligence: 6, reciprocity: 2, legitimacy: -1 }, duration: 3, actorEffects: [{ actorId: "cineric", metric: "leverage", perDay: 1.2 }] }),
      choice("neutral-inspection", "Submit Camps to Neutral Inspection", "Custody becomes credible because strangers are permitted to count it.", ["Vey Trust growth: +1.3/day", "Cineric Trust growth: +0.5/day", "Legitimacy: +3", "Treasury: -2.0 B"], ["Inspectors record failures as carefully as compliance"], { delta: { legitimacy: 3, treasury: -2 }, duration: 5, actorEffects: [{ actorId: "vey", metric: "trust", perDay: 1.3 }, { actorId: "cineric", metric: "trust", perDay: 0.5 }] }),
    ],
  ),
  family(
    "relief-access",
    "diplomacy",
    "Humanitarian and Legal Warfare",
    "Open Humanitarian Access",
    "Choose where relief enters, whose flag protects it, and which military inconvenience proves sincerity.",
    3,
    [
      choice("hospital-trains", "Authorize Hospital Trains", "The same rail system proves it can carry bodies away from the front.", ["Vey Trust growth: +1.2/day", "Legitimacy: +4", "Treasury: -5.0 B", "Materiel condition: -1"], ["Strategic freight loses protected paths"], { delta: { legitimacy: 4, treasury: -5, materiel: -1 }, duration: 5, actorEffects: [{ actorId: "vey", metric: "trust", perDay: 1.2 }] }),
      choice("relief-port", "Open a Relief Port", "Civil cargo enters through a harbor every intelligence service now watches.", ["Vey Aid Pipeline: +0.8/day", "Vey Trust growth: +1.0/day", "Dependency: +2", "Legitimacy: +3"], ["Inspection slows military cargo and expands foreign access"], { delta: { dependency: 2, legitimacy: 3 }, duration: 6, actorEffects: [{ actorId: "vey", metric: "aidPipeline", perDay: 0.8 }, { actorId: "vey", metric: "trust", perDay: 1 }] }),
      choice("food-truce", "Propose a Food Truce", "The guns are asked to recognize calories as temporarily noncombatant.", ["Cineric Trust growth: +1.1/day", "Cineric Leverage decay: -0.5/day", "Legitimacy: +2", "Resistance: -2"], ["The enemy can use the interval to repair positions"], { delta: { legitimacy: 2, resistance: -2 }, duration: 3, actorEffects: [{ actorId: "cineric", metric: "trust", perDay: 1.1 }, { actorId: "cineric", metric: "leverage", perDay: -0.5 }] }),
      choice("child-evacuation", "Guarantee Child Evacuation", "The state gives transport priority to citizens who cannot repay it militarily.", ["Vey Trust growth: +1.4/day", "Legitimacy: +5", "Treasury: -6.0 B", "Workforce: -10,000"], ["Evacuation capacity leaves the military timetable"], { delta: { legitimacy: 5, treasury: -6, workforce: -10000 }, duration: 5, actorEffects: [{ actorId: "vey", metric: "trust", perDay: 1.4 }] }),
    ],
  ),
  family(
    "legal-war",
    "diplomacy",
    "Humanitarian and Legal Warfare",
    "Document Enemy Conduct",
    "Turn battlefield evidence into neutral pressure without pretending documentation stops shells.",
    2,
    [
      choice("forensic-commission", "Invite a Forensic Commission", "The crater acquires witnesses who cannot be ordered to forget it.", ["Vey Trust growth: +1.4/day", "Cineric Sanctions Exposure: +0.8/day", "Intelligence: +4", "Treasury: -3.0 B"], ["Investigators also document your own conduct"], { delta: { intelligence: 4, treasury: -3 }, duration: 5, actorEffects: [{ actorId: "vey", metric: "trust", perDay: 1.4 }, { actorId: "cineric", metric: "sanctionsExposure", perDay: 0.8 }] }),
      choice("publish-chain", "Publish the Chain of Command", "Names are attached to acts before the enemy can dissolve them into policy.", ["Cineric Trust: -1.2/day", "Cineric Leverage growth: +0.9/day", "Legitimacy: +3", "Intelligence: -2"], ["Publication consumes classified attribution work"], { delta: { legitimacy: 3, intelligence: -2 }, duration: 4, actorEffects: [{ actorId: "cineric", metric: "trust", perDay: -1.2 }, { actorId: "cineric", metric: "leverage", perDay: 0.9 }] }),
      choice("preserve-orders", "Preserve Captured Orders", "Paper is treated as a future weapon whose target has not yet been selected.", ["Intelligence: +6", "Legitimacy: +1", "Treasury: -2.0 B"], ["Immediate propaganda value is deliberately withheld"], { delta: { intelligence: 6, legitimacy: 1, treasury: -2 }, duration: 3 }),
      choice("universal-jurisdiction", "Recognize Universal Jurisdiction", "The state creates a legal route that may survive the military route.", ["Vey Trust growth: +1.0/day", "Cineric Sanctions Exposure: +1.1/day", "Legitimacy: +2", "Dependency: +1"], ["Foreign courts acquire authority over your officers as well"], { delta: { legitimacy: 2, dependency: 1 }, duration: 6, actorEffects: [{ actorId: "vey", metric: "trust", perDay: 1 }, { actorId: "cineric", metric: "sanctionsExposure", perDay: 1.1 }] }),
    ],
  ),
  family(
    "proxy-armament",
    "diplomacy",
    "Proxy and Clandestine Relations",
    "Arm the Proxy Forces",
    "Spend deniable stock to create pressure in terrain your army cannot reach.",
    2,
    [
      choice("small-arms-pipeline", "Open the Small-Arms Pipeline", "Crates cross the border carrying serial numbers from a government that denies counting them.", ["Kestrel Trust growth: +1.0/day", "Kestrel Leverage growth: +0.8/day", "Materiel condition: -3", "Treasury: -4.0 B"], ["Captured weapons expose the pipeline"], { delta: { materiel: -3, treasury: -4 }, duration: 5, actorEffects: [{ actorId: "kestrel", metric: "trust", perDay: 1 }, { actorId: "kestrel", metric: "leverage", perDay: 0.8 }] }),
      choice("drone-pipeline", "Open the Drone Pipeline", "Deniability is assigned to machines designed to transmit evidence.", ["Kestrel Trust growth: +0.8/day", "Kestrel Sanctions Exposure: +0.9/day", "Intelligence: +5", "Equipment Coverage: -2"], ["Telemetry can attribute custody"], { delta: { intelligence: 5, equipment: -2 }, duration: 4, actorEffects: [{ actorId: "kestrel", metric: "trust", perDay: 0.8 }, { actorId: "kestrel", metric: "sanctionsExposure", perDay: 0.9 }] }),
      choice("adviser-teams", "Insert Adviser Teams", "The proxy receives doctrine along with people whose uniforms were removed too recently.", ["Kestrel Trust growth: +1.2/day", "Kestrel Leverage growth: +1.1/day", "Readiness: +3", "Intelligence: +3"], ["Adviser casualties can collapse deniability"], { delta: { readiness: 3, intelligence: 3 }, duration: 5, actorEffects: [{ actorId: "kestrel", metric: "trust", perDay: 1.2 }, { actorId: "kestrel", metric: "leverage", perDay: 1.1 }] }),
      choice("cutout-funding", "Fund Through Cutouts", "Money travels through enough hands to become everyone’s plausible misunderstanding.", ["Kestrel Trust growth: +0.7/day", "Kestrel Leverage growth: +1.4/day", "Treasury: -7.0 B", "Dependency: +3"], ["Intermediaries own the evidence and the timetable"], { delta: { treasury: -7, dependency: 3 }, duration: 6, actorEffects: [{ actorId: "kestrel", metric: "trust", perDay: 0.7 }, { actorId: "kestrel", metric: "leverage", perDay: 1.4 }] }),
    ],
  ),
  family(
    "exile-government",
    "diplomacy",
    "Proxy and Clandestine Relations",
    "Manage the Exile Government",
    "Choose whether the displaced state is an ally, a claimant, a recruiting office, or a future liability.",
    3,
    [
      choice("recognize-exiles", "Recognize the Exile Cabinet", "A government receives territory in diplomatic grammar before receiving it on a map.", ["Orison Trust growth: +1.0/day", "Orison Obligation: +0.7/day", "Legitimacy: +2", "Treasury: -3.0 B"], ["Recognition creates a postwar claim you cannot quietly withdraw"], { delta: { legitimacy: 2, treasury: -3 }, duration: 6, actorEffects: [{ actorId: "orison", metric: "trust", perDay: 1 }, { actorId: "orison", metric: "obligation", perDay: 0.7 }] }),
      choice("exile-legion", "Raise an Exile Legion", "Citizenship, revenge, and replacement demand are assembled into one formation.", ["Orison Trust growth: +0.8/day", "Replacement reserve: +9,000", "Treasury: -5.0 B", "Legitimacy: +1"], ["Command loyalty remains politically divided"], { delta: { reserves: 9000, treasury: -5, legitimacy: 1 }, duration: 5, actorEffects: [{ actorId: "orison", metric: "trust", perDay: 0.8 }] }),
      choice("broadcast-exiles", "Give the Exiles a Transmitter", "The lost capital speaks from a room whose location is omitted from every sentence.", ["Orison Trust growth: +0.6/day", "Cineric Leverage decay: -0.4/day", "Intelligence: +4", "Legitimacy: +2"], ["Exile politics enter your information war"], { delta: { intelligence: 4, legitimacy: 2 }, duration: 4, actorEffects: [{ actorId: "orison", metric: "trust", perDay: 0.6 }, { actorId: "cineric", metric: "leverage", perDay: -0.4 }] }),
      choice("defer-recognition", "Defer Formal Recognition", "Support is delivered without admitting which future government it is building.", ["Kestrel Trust growth: +0.5/day", "Treasury: +3.0 B", "Legitimacy: -1", "Dependency: -1"], ["Ambiguity depresses recruitment and trust"], { delta: { treasury: 3, legitimacy: -1, dependency: -1 }, duration: 4, actorEffects: [{ actorId: "kestrel", metric: "trust", perDay: 0.5 }] }),
    ],
  ),
  family(
    "covert-purchases",
    "diplomacy",
    "Proxy and Clandestine Relations",
    "Run Covert Purchases",
    "Acquire prohibited capacity through markets whose invoices are written as alibis.",
    2,
    [
      choice("machine-tools", "Buy Embargoed Machine Tools", "Precision enters as agricultural equipment and immediately forgets farming.", ["Kestrel Trust growth: +0.8/day", "Kestrel Sanctions Exposure: +0.8/day", "Materiel condition: +6", "Treasury: -8.0 B"], ["Discovery widens sanctions exposure"], { delta: { materiel: 6, treasury: -8 }, duration: 5, actorEffects: [{ actorId: "kestrel", metric: "trust", perDay: 0.8 }, { actorId: "kestrel", metric: "sanctionsExposure", perDay: 0.8 }] }),
      choice("aviation-fuel", "Buy Aviation Fuel Through Brokers", "The fuel acquires three civilian owners before reaching a military tank.", ["Kestrel Trust growth: +0.7/day", "Kestrel Leverage growth: +1.0/day", "Equipment Coverage: +3", "Treasury: -7.0 B"], ["Broker control over delivery timing becomes operational leverage"], { delta: { equipment: 3, treasury: -7 }, duration: 4, actorEffects: [{ actorId: "kestrel", metric: "trust", perDay: 0.7 }, { actorId: "kestrel", metric: "leverage", perDay: 1 }] }),
      choice("cryptographic-stock", "Buy Cryptographic Stock", "Security is purchased from people whose first advantage is knowing who purchased it.", ["Kestrel Trust growth: +0.6/day", "Intelligence: +7", "Treasury: -6.0 B", "Dependency: +2"], ["The supplier may retain keys or customer records"], { delta: { intelligence: 7, treasury: -6, dependency: 2 }, duration: 5, actorEffects: [{ actorId: "kestrel", metric: "trust", perDay: 0.6 }] }),
      choice("liquidate-cache", "Liquidate the Foreign Cache", "Stored contraband is sold back into the market to finance a different emergency.", ["Kestrel Trust: -0.8/day", "Kestrel Leverage decay: -0.5/day", "Treasury: +10.0 B", "Materiel condition: -3"], ["Future covert supply loses its buffer"], { delta: { treasury: 10, materiel: -3 }, duration: 3, actorEffects: [{ actorId: "kestrel", metric: "trust", perDay: -0.8 }, { actorId: "kestrel", metric: "leverage", perDay: -0.5 }] }),
    ],
  ),
];

export const EXPANDED_DIRECTIVE_KEYS = [
  ...Object.entries(DIRECTIVE_CHOICE_ADDITIONS).flatMap(([familyId, choices]) =>
    choices.map((item) => `${familyId}/${item.id}`),
  ),
  ...ADDITIONAL_DIRECTIVE_FAMILIES.flatMap((item) =>
    item.choices.map((itemChoice) => `${item.id}/${itemChoice.id}`),
  ),
];
