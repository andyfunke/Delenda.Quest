import { executeCircuit, productionCircuit, type ProductionLedger } from "./circuits";

export type Module = "dashboard" | "campaign" | "national" | "military" | "diplomacy" | "doctrine" | "wiki";
export type Resource = "munitions" | "armor" | "flight" | "drones";
export type Tempo = "hold" | "methodical" | "surge" | "human-wave";
export type Tone = "good" | "warn" | "bad";
export const DAILY_ORDERS = 4;

export type GameState = {
  day: number; actions: number; status: "active" | "victory" | "defeat";
  population: number; workforce: number; armed: number; deployable: number;
  voluntary: number; forced: number; queue: number; training: number; duration: number; quality: number;
  readiness: number; equipment: number; materiel: number; treasury: number; legitimacy: number; resistance: number;
  dependency: number; intelligence: number; front: number; enemy: number;
  doctrine: number; doctrineEarned: number; doctrineWinAwards: { day:number; action:string; verified:string; reward:number }[]; affinityProofs: Record<string,number>; atrocityExposure: number; reciprocity: number; desertionPressure: number;
  deserters: number; intercepted: number; patrolCommitment: number;
  target: Resource | "balanced"; pendingTarget: Resource | "balanced" | null; tempo: Tempo; maneuver: string | null;
  maintenanceDebt: number; productionLedger: ProductionLedger | null;
  production: Record<Resource, { allocation: number; stock: number; output: number; use: number }>;
  active: Record<string, string>; locks: Record<string, number>; scheduled: Scheduled[];
  unlocked: string[]; decisions: { day: number; family: string; choice: string }[];
  reports: { day: number; title: string; body: string; tone: Tone; epigraph?: string }[];
};

type NumberKey = { [K in keyof GameState]: GameState[K] extends number ? K : never }[keyof GameState];
type Delta = Partial<Record<NumberKey, number>>;
type Scheduled = { day: number; source: string; delta: Delta };

export type Choice = {
  id: string; label: string; flavor: string; exact: string[]; risk: string[];
  delta?: Delta; tick?: Delta; delay?: { days: number; delta: Delta };
  target?: GameState["target"]; tempo?: Tempo; doctrine?: number;
};

export type Family = {
  id: string; module: Exclude<Module, "dashboard" | "campaign" | "doctrine" | "wiki">; category: string;
  label: string; brief: string; lock: number; choices: Choice[];
};

export type Maneuver = {
  id: string; label: string; flavor: string; exact: string[]; risk: string[];
  success: number; casualty: number; supply: number; successPressure: number; failurePressure: number;
  doctrine: [number, number]; vector: string; readiness?: number; reciprocity?: number;
};

export type Situation = {
  id: string; sector: string; headline: string; briefing: string; question: string;
  terrain: string; ground: string; network: string; supply: string; intelligence: string;
  windowHours: number; quote: string; attribution: string; maneuvers: string[];
};

export type DoctrineStage = { id: string; label: string; cost: number; description: string; effect: string; output?: string; affects?: string; delta?: Delta };
export type DoctrineVector = { id: string; label: string; authority: string; quote: string; forbidden?: boolean; stages: DoctrineStage[] };

const c = (id: string, label: string, flavor: string, exact: string[], risk: string[], extra: Partial<Choice> = {}): Choice => ({ id, label, flavor, exact, risk, ...extra });

export const FAMILIES: Family[] = [
  { id: "production", module: "national", category: "Industrial Command", label: "Set Production Target", brief: "Put the marginal factory, worker, and shipment behind one arm of the war machine.", lock: 2, choices: [
    c("guns", "Feed the Guns", "The front consumes arithmetic by the trainload.", ["Munitions allocation becomes 46% at resolution", "Armor, Flight, and Drones become 18% each", "Retooling output: -28% for the conversion day"], ["Front pressure: +0.2 to +0.8 km while coverage exceeds 3 days"], { target: "munitions" }),
    c("steel", "Steel the Spearhead", "A tank is a factory learning to move.", ["Armor allocation becomes 46% at resolution", "Other production lines become 18% each", "Retooling output: -28% for the conversion day"], ["Breakthrough chance: 14% to 29% at readiness above 65"], { target: "armor" }),
    c("air", "Contest the Air", "Every quiet sky is merely unaccounted violence.", ["Flight allocation becomes 46% at resolution", "Other production lines become 18% each", "Retooling output: -28% for the conversion day"], ["Enemy attrition reduction: 4% to 11% after two days"], { target: "flight" }),
    c("eyes", "Automate the Horizon", "Cheap eyes first. Cheap explosives immediately after.", ["Drones allocation becomes 46% at resolution", "Other production lines become 18% each", "Retooling output: -28% for the conversion day", "Intelligence: +3"], ["Targeting efficiency: +3% to +9%"], { target: "drones", delta: { intelligence: 3 }, doctrine: 2 }),
    c("balance", "Balance the Ledger", "Nothing starves. Nothing arrives in decisive quantity.", ["All production allocations become 25% at resolution", "Retooling output: -28% for the conversion day"], ["No breakthrough bonus; shortage risk falls 8% to 15%"], { target: "balanced" }),
  ]},
  { id: "industry", module: "national", category: "Industrial Command", label: "Organize Industry", brief: "Choose what factories optimize for when the requisition office stops pretending this is temporary.", lock: 4, choices: [
    c("war-economy", "Declare War Economy", "The civilian economy will be remembered fondly by survivors.", ["Treasury: -8.0 B", "Training capacity: +8,000 on Day +2", "Legitimacy: -2"], ["Military output: +8% to +14%"], { delta: { treasury: -8, legitimacy: -2 }, delay: { days: 2, delta: { training: 8000 } } }),
    c("disperse", "Disperse Production", "A thousand small targets are still a strategy.", ["Treasury: -5.0 B", "Materiel condition: +5 on Day +2"], ["Enemy strike losses: -20% to -35%"], { delta: { treasury: -5 }, delay: { days: 2, delta: { materiel: 5 } } }),
    c("overtime", "Mandate Overtime", "The eighth day of the week has been discovered by decree.", ["Treasury: +3.0 B", "Resistance: +6", "Materiel condition: -3"], ["Output gain: +12% to +20% for four days"], { delta: { treasury: 3, resistance: 6, materiel: -3 } }),
    c("maintenance", "Schedule Maintenance", "A stopped line looks like cowardice until the bearings fail.", ["Treasury: -4.0 B", "Materiel condition: +9 on Day +1", "Readiness: -2"], ["Breakdown losses: -25% to -40%"], { delta: { treasury: -4, readiness: -2 }, delay: { days: 1, delta: { materiel: 9 } } }),
  ]},
  { id: "finance", module: "national", category: "Public Finance", label: "Finance Mobilization", brief: "Move the war bill through time, class, or fiction.", lock: 3, choices: [
    c("bonds", "Issue War Bonds", "Patriotism, now bearing interest.", ["Treasury: +24.0 B", "Legitimacy: +1", "Treasury: -1.2 B per day"], ["Debt event after Day +8: 10% to 18%"], { delta: { treasury: 24, legitimacy: 1 }, tick: { treasury: -1.2 } }),
    c("profit-tax", "Levy Excess Profits", "Sacrifice will be progressive for exactly one quarter.", ["Treasury: +12.0 B", "Legitimacy: +3", "Resistance: +2"], ["Industrial output loss: 2% to 6%"], { delta: { treasury: 12, legitimacy: 3, resistance: 2 } }),
    c("print", "Print with Confidence", "Ink is a strategic reserve if nobody asks what it buys.", ["Treasury: +18.0 B", "Legitimacy: -2", "Resistance: +3"], ["Procurement cost growth: 2% to 5%"], { delta: { treasury: 18, legitimacy: -2, resistance: 3 } }),
    c("seize", "Requisition Private Reserves", "Ownership has been temporarily clarified.", ["Treasury: +15.0 B", "Materiel: +4", "Legitimacy: -5", "Resistance: +9"], ["Sabotage risk: 8% to 16% per day"], { delta: { treasury: 15, materiel: 4, legitimacy: -5, resistance: 9 } }),
  ]},
  { id: "service", module: "military", category: "Force Generation", label: "Define Service Obligation", brief: "Define who owes the state a body and what the state owes in return.", lock: 4, choices: [
    c("volunteer", "Maintain a Volunteer Force", "The uniform is a career until the casualty lists lengthen.", ["Voluntary intake becomes 6,200 per day", "Forced intake becomes 0", "Legitimacy: +1", "Treasury: -2.0 B per day"], ["Replacement coverage: 42% to 68%"], { delta: { legitimacy: 1, voluntary: -2800 }, tick: { treasury: -2 } }),
    c("selective", "Implement Selective Service", "Universal duty, selectively administered.", ["Voluntary intake becomes 5,600 per day", "Forced intake becomes 6,000 per day", "Legitimacy: -1", "Resistance: +1 per day"], ["Evasion: 5% to 12% of forced intake"], { delta: { voluntary: -3400, forced: 6000, legitimacy: -1 }, tick: { resistance: 1, legitimacy: -.5 } }),
    c("universal", "Mandate Universal Service", "The nation has become a queue outside an induction office.", ["Voluntary intake becomes 4,200 per day", "Forced intake becomes 15,000 per day", "Legitimacy: -3", "Resistance: +2.5 per day"], ["Training congestion: +12% to +28%"], { delta: { voluntary: -4800, forced: 15000, legitimacy: -3 }, tick: { resistance: 2.5, legitimacy: -1 } }),
    c("levy", "Declare an Emergency Levy", "Standards are luxuries purchased with time.", ["Forced intake becomes 28,000 per day", "Training quality: -12", "Legitimacy: -5", "Resistance: +6 per day", "Doctrine: +4"], ["Levy exhaustion begins after three days"], { delta: { voluntary: -6500, forced: 28000, quality: -12, legitimacy: -5 }, tick: { resistance: 6, legitimacy: -2 }, doctrine: 4 }),
    c("auxiliary", "Contract Auxiliary Manpower", "Citizenship is fastest when approached from the front.", ["Voluntary intake becomes 5,000 per day", "Forced intake becomes 10,000 per day", "Treasury: -8.0 B", "Dependency: +3 per day"], ["Desertion: 4% to 13%"], { delta: { voluntary: -4000, forced: 10000, treasury: -8 }, tick: { treasury: -10, dependency: 3 } }),
  ]},
  { id: "price", module: "military", category: "Force Generation", label: "Price Enlistment", brief: "Adjust the price, story, and household bargain attached to enlistment.", lock: 3, choices: [
    c("base-pay", "Raise Base Pay", "A recurring answer to a recurring shortage.", ["Voluntary intake: +3,000 per day", "Treasury: -5.0 B per day", "Legitimacy: +0.5 per day"], ["Public salary parity claim after three days"], { delta: { voluntary: 3000 }, tick: { treasury: -5, legitimacy: .5 } }),
    c("bonus", "Offer Joining Bonuses", "A signing ceremony with a survivor benefit in the fine print.", ["Treasury: -10.0 B", "Voluntary intake: +5,500 per day"], ["Intake falls 1,500 below baseline when offer closes"], { delta: { treasury: -10, voluntary: 5500 } }),
    c("stipends", "Guarantee Family Stipends", "The household joins before the soldier does.", ["Voluntary intake: +2,500 per day", "Legitimacy: +1", "Treasury: -4.0 B per day"], ["Arrears event if treasury becomes negative"], { delta: { voluntary: 2500, legitimacy: 1 }, tick: { treasury: -4 } }),
    c("survivors", "Pay Survivors First", "The dead have become the most reliable recruiters.", ["Voluntary intake: +1,500 per day", "Legitimacy: +2", "Treasury: -3.0 B per day"], ["Obligation grows with each casualty report"], { delta: { voluntary: 1500, legitimacy: 2 }, tick: { treasury: -3 } }),
  ]},
  { id: "training-capacity", module: "military", category: "Training and Induction", label: "Provision Training Capacity", brief: "A recruit is not a soldier. Decide where that conversion is allowed to occur.", lock: 4, choices: [
    c("camps", "Expand Temporary Camps", "Canvas, mud, and a curriculum measured in urgency.", ["Training capacity: +28,000 on Day +2", "Treasury: -8.0 B", "Training quality: -2"], ["Disease loss: 1% to 4% of queue"], { delta: { treasury: -8, quality: -2 }, delay: { days: 2, delta: { training: 28000 } } }),
    c("academy", "Build Permanent Academies", "Build for the next war while losing the present one.", ["Training capacity: +18,000 on Day +5", "Training quality: +6 on Day +5", "Treasury: -14.0 B"], ["Construction delay: 0 to 2 additional days"], { delta: { treasury: -14 }, delay: { days: 5, delta: { training: 18000, quality: 6 } } }),
    c("schools", "Convert Civilian Schools", "The timetable now includes entrenchment and casualty handling.", ["Training capacity: +20,000 on Day +1", "Workforce: -15,000", "Legitimacy: -3"], ["Regional resistance: +1 to +5"], { delta: { workforce: -15000, legitimacy: -3 }, delay: { days: 1, delta: { training: 20000 } } }),
    c("field", "Train in the Field", "The enemy will provide the final examination.", ["Training duration: -2 days", "Training quality: -12", "Readiness: -3", "Doctrine: +3"], ["First-week casualties: +8% to +22%"], { delta: { duration: -2, quality: -12, readiness: -3 }, doctrine: 3 }),
  ]},
  { id: "training-standard", module: "military", category: "Training and Induction", label: "Set Training Standard", brief: "Determine which deficiencies become the front's problem.", lock: 4, choices: [
    c("full", "Full Standard", "The calendar is held responsible for battlefield quality.", ["Training duration becomes 7 days", "Training quality: +8"], ["Replacement shortfall: 8,000 to 22,000 per day"], { delta: { duration: 1, quality: 8 } }),
    c("compressed", "Compressed Standard", "Every omitted lesson is converted into tempo.", ["Training duration becomes 4 days", "Training quality: -5", "Doctrine: +2"], ["Graduate casualties: +4% to +12%"], { delta: { duration: -2, quality: -5 }, doctrine: 2 }),
    c("specialist", "Branch-Specific Tracks", "Specialization is efficiency until the wrong shortage arrives.", ["Training duration remains 6 days", "Training quality: +4", "Equipment coverage: +3"], ["Cross-branch replacement loss: 5% to 12%"], { delta: { quality: 4, equipment: 3 } }),
    c("marginal", "Accept Marginal Candidates", "The requirement is now the ability to satisfy the requirement.", ["Training capacity: +25,000", "Training quality: -10", "Legitimacy: -2"], ["Medical discharge: 8% to 18%"], { delta: { training: 25000, quality: -10, legitimacy: -2 } }),
  ]},
  { id: "tempo", module: "military", category: "Operations", label: "Set Operational Tempo", brief: "Choose how quickly men, stock, and legitimacy enter the slaughterhouse.", lock: 1, choices: [
    c("hold", "Hold the Line", "Preserve the army. Explain the map.", ["Soldier attrition multiplier: 0.55", "Supply use multiplier: 0.65"], ["Front movement: -0.8 to +0.3 km"], { tempo: "hold" }),
    c("method", "Methodical Advance", "Convert shells into ground at the approved exchange rate.", ["Soldier attrition multiplier: 1.0", "Supply use multiplier: 1.0"], ["Front movement: -0.4 to +1.2 km"], { tempo: "methodical" }),
    c("surge", "Local Surge", "Concentrate the bill where the map is weakest.", ["Soldier attrition multiplier: 1.35", "Supply use multiplier: 1.4", "Doctrine: +2"], ["Front movement: -0.2 to +2.0 km"], { tempo: "surge", doctrine: 2 }),
    c("wave", "Human Wave", "The state has identified the shortest route between population and terrain.", ["Soldier attrition multiplier: 2.1", "Supply use multiplier: 1.2", "Legitimacy: -3", "Doctrine: +5"], ["Front movement: -0.5 to +3.2 km"], { tempo: "human-wave", delta: { legitimacy: -3 }, doctrine: 5 }),
  ]},
  { id: "desertion", module: "military", category: "Personnel Sustainment", label: "Process Desertion", brief: "Decide whether absence is a personnel problem, a police problem, or a truth problem.", lock: 2, choices: [
    c("amnesty", "Issue Limited Amnesty", "Return is permitted once. The record is not erased.", ["Desertion pressure: -8", "Legitimacy: +2", "Readiness: -1"], ["Returned personnel: 12% to 28% of confirmed deserters"], { delta: { desertionPressure: -8, legitimacy: 2, readiness: -1 } }),
    c("patrols", "Establish Desertion Patrols", "The rear acquires a front of its own.", ["Patrol commitment: +4,800", "Resistance: +4", "Treasury: -2.0 B per day"], ["Interception: 35% to 62% of new deserters"], { delta: { patrolCommitment: 4800, resistance: 4 }, tick: { treasury: -2 } }),
    c("stations", "Seal Rail Stations", "Mobility has been reclassified as evidence.", ["Desertion pressure: -4", "Workforce: -9,000", "Resistance: +6"], ["Civilian throughput loss: 4% to 9%"], { delta: { desertionPressure: -4, workforce: -9000, resistance: 6 } }),
    c("rations", "Guarantee Family Rations", "The household is secured behind the formation.", ["Desertion pressure: -6", "Legitimacy: +3", "Treasury: -3.0 B per day"], ["Voluntary return: 8% to 19%"], { delta: { desertionPressure: -6, legitimacy: 3 }, tick: { treasury: -3 } }),
    c("reclassify", "Reclassify Missing as Casualties", "The ledger has restored discipline without locating a man.", ["Reported desertions: -2,000", "Legitimacy: -2", "Doctrine: +2"], ["Audit exposure: 14% to 31%"], { delta: { deserters: -2000, legitimacy: -2 }, doctrine: 2 }),
  ]},
  { id: "supply", module: "diplomacy", category: "External Supply", label: "Secure External Supply", brief: "Trade independence, access, or future policy for things that explode today.", lock: 4, choices: [
    c("credit", "Request Allied Credit", "The friendship has a floating rate.", ["Treasury: +20.0 B", "Dependency: +8", "Legitimacy: +1"], ["Repayment event: 12.0 to 28.0 B"], { delta: { treasury: 20, dependency: 8, legitimacy: 1 } }),
    c("port", "Lease Port Access", "Sovereignty will resume after the final automatic renewal.", ["Treasury: +12.0 B", "Materiel: +5 on Day +2", "Dependency: +12"], ["Blockade resistance: +8% to +18%"], { delta: { treasury: 12, dependency: 12 }, delay: { days: 2, delta: { materiel: 5 } } }),
    c("shadow", "Buy on the Shadow Market", "Plausible deniability has excellent margins.", ["Equipment: +8 on Day +1", "Treasury: -16.0 B", "Legitimacy: -2", "Doctrine: +2"], ["Interdiction risk: 18% to 32%"], { delta: { treasury: -16, legitimacy: -2 }, delay: { days: 1, delta: { equipment: 8 } }, doctrine: 2 }),
    c("transit", "Guarantee Neutral Transit", "Neutrality now includes a handling fee and rail priority.", ["Materiel: +3", "Treasury: -5.0 B", "Intelligence: +2"], ["Supply use reduction: 4% to 9%"], { delta: { materiel: 3, treasury: -5, intelligence: 2 } }),
  ]},
  { id: "statecraft", module: "diplomacy", category: "Statecraft", label: "Conduct Statecraft", brief: "Alter what the opponent believes, what allies tolerate, or what tomorrow will cost.", lock: 2, choices: [
    c("summit", "Summit Photo-Op", "A table, two flags, and the disciplined absence of agreement.", ["Legitimacy: +4", "Treasury: -1.0 B", "Intelligence: +1"], ["Ceasefire channel: 8% to 18%"], { delta: { legitimacy: 4, treasury: -1, intelligence: 1 } }),
    c("backchannel", "Open Back Channel", "Officially, nobody has spoken. Unofficially, nobody has agreed.", ["Intelligence: +6", "Legitimacy: -1"], ["Enemy tempo disclosure: 35% to 65%"], { delta: { intelligence: 6, legitimacy: -1 } }),
    c("ultimatum", "Issue Public Ultimatum", "A deadline is policy with a clock attached.", ["Legitimacy: +2", "Enemy strength: +4,000", "Resistance: -1"], ["Enemy concession: 5% to 12%"], { delta: { legitimacy: 2, enemy: 4000, resistance: -1 } }),
    c("denial", "Maintain Plausible Deniability", "The policy does not exist outside the budget line that funds it.", ["Intelligence: +3", "Legitimacy: -2", "Enemy strength: -2,200"], ["Covert disruption: 1,000 to 5,000 enemy strength"], { delta: { intelligence: 3, legitimacy: -2, enemy: -2200 } }),
  ]},
];

export const MANEUVERS: Maneuver[] = [
  { id: "reinforce", label: "Reinforce the Salient", flavor: "The reserve enters through the route the enemy has already selected for fire.", exact: ["Commit 31,000 deployable soldiers", "Munitions use: +18%", "Readiness: -2"], risk: ["Hold probability: 68%", "Loss exposure: 5,000 to 11,000"], success: .68, casualty: 1.22, supply: 1.18, successPressure: .9, failurePressure: -.7, doctrine: [3,7], vector: "Force Reconstitution", readiness: -2 },
  { id: "interdict", label: "Clear the Interdiction Zone", flavor: "Find the batteries by surviving long enough to make them fire twice.", exact: ["Commit Strategic Fires and Drone patrols", "Munitions use: +31%", "Drone use: +24%"], risk: ["Suppression probability: 47%", "Salient remains understrength during fires"], success: .47, casualty: .86, supply: 1.31, successPressure: 1.25, failurePressure: -.45, doctrine: [7,14], vector: "Strategic Fires" },
  { id: "route", label: "Establish a Southern Route", flavor: "The engineer changes what the map permits while the infantry pays for the time.", exact: ["Withdraw 8,000 engineers and guards", "Materiel condition: -3", "Supply modifier begins tomorrow"], risk: ["Route completion: 54%", "Today’s front movement: -0.3 to -1.2 km"], success: .54, casualty: .72, supply: .8, successPressure: .15, failurePressure: -.8, doctrine: [6,12], vector: "Operational Engineering" },
  { id: "abandon", label: "Abandon the Salient", flavor: "Preserve the formation. Reclassify the ground as an earlier misunderstanding.", exact: ["Casualty multiplier: 0.44", "Recover 3 Equipment", "Cede at least 0.8 km"], risk: ["Withdrawal cohesion: 76%", "Enemy pursuit may extend the loss to 2.4 km"], success: .76, casualty: .44, supply: .62, successPressure: -.8, failurePressure: -2.4, doctrine: [2,5], vector: "Force Reconstitution" },
  { id: "exploit", label: "Exploit Their Concentration", flavor: "The mission begins where protection stops being guaranteed.", exact: ["Commit unprotected operators and mobile reserve", "Readiness: -5", "Minimum Doctrine observation: +14"], risk: ["Operational success: 18%", "Loss exposure: 9,000 to 21,000", "Observation survival: 71%"], success: .18, casualty: 1.65, supply: 1.16, successPressure: 3.2, failurePressure: -1.1, doctrine: [14,30], vector: "Assault Geometry", readiness: -5 },
  { id: "breach", label: "Force the Wire", flavor: "The wire has done its work if the assault arrives one man at a time.", exact: ["Commit assault engineers", "Munitions use: +26%", "Doctrine observation: Assault Geometry"], risk: ["Breach probability: 33%", "Loss exposure: 7,000 to 16,000"], success: .33, casualty: 1.48, supply: 1.26, successPressure: 2.2, failurePressure: -.9, doctrine: [10,22], vector: "Assault Geometry" },
  { id: "network", label: "Restore the Command Net", flavor: "Cut the fiber and every order must cross the ground again.", exact: ["Commit relay drones and signal companies", "Drone use: +32%", "Intelligence: +3 on success"], risk: ["Restoration probability: 61%", "Exposed signal losses: 1,000 to 4,000"], success: .61, casualty: .78, supply: .92, successPressure: .75, failurePressure: -.65, doctrine: [7,15], vector: "Networked Command" },
];

export const SITUATIONS: Situation[] = [
  { id: "kesh", sector: "Kesh Corridor", headline: "The Kesh Corridor Cannot Remain Open", briefing: "Enemy fires have interdicted the northern road and severed two command relays. The 18th Formation can still reach the salient through Kesh, but the corridor will become untenable before the day resolves.", question: "Where should the reserve be spent?", terrain: "Cratered lowland", ground: "Saturated", network: "Intermittent", supply: "Interdicted", intelligence: "Estimated // 78%", windowHours: 11, quote: "A corridor exists only because somebody maintains it.", attribution: "Oren Hale, Command Network Authority", maneuvers: ["reinforce", "interdict", "route", "abandon", "exploit"] },
  { id: "thorne-line", sector: "Thorne Line", headline: "The Wire Is Intact and the Timetable Is Not", briefing: "Three assault waves have reached the obstacle belt without opening a vehicle lane. Enemy reserves are moving behind the ridge. A breach attempted after dusk will lose artillery observation and gain nothing else.", question: "What should cross first?", terrain: "Prepared ridge", ground: "Mined", network: "Degraded", supply: "Adequate", intelligence: "Observed // 84%", windowHours: 8, quote: "The minefield is defeated only when someone crosses it.", attribution: "Col. Aris Thorne, Lectures on Assault Geometry", maneuvers: ["breach", "interdict", "network", "abandon", "exploit"] },
  { id: "hollow-net", sector: "Hollow Relay District", headline: "The Army Beyond the Relay Is Armed, At Least", briefing: "The eastern formation has not acknowledged an order in ninety-three minutes. Reconnaissance sees movement but cannot classify its direction. Every new instruction must now be carried across contested ground.", question: "Which uncertainty receives the army?", terrain: "Industrial basin", ground: "Dry", network: "Severed", supply: "Rationed", intelligence: "Contradictory // 49%", windowHours: 6, quote: "The map is obedient only where the network holds.", attribution: "Oren Hale, Command Network Authority", maneuvers: ["network", "reinforce", "route", "abandon", "exploit"] },
];

export const DOCTRINES: DoctrineVector[] = [
  { id: "drone", label: "Drone War", authority: "Pattern Analysis Directorate", quote: "Classification is power.", stages: [
    { id: "drone-war", label: "Drone War", cost: 0, output:"Allocation Rule", affects:"Drone formations", description: "Treat uncrewed systems as a permanent allocation layer rather than a special asset.", effect: "Unlock drone reconnaissance and strike allocation." },
    { id: "autonomous", label: "Autonomous Drones", cost: 120, output:"Operator Modifier", affects:"Drone formations", description: "Permit assigned missions to continue after command-network degradation.", effect: "Network failure no longer cancels Drone output.", delta: { intelligence: 2 } },
    { id: "long-range", label: "Long-Range Drones", cost: 180, output:"Workshop Module", affects:"Reconnaissance and strike drones", description: "Move observation and interdiction behind the immediate battle zone.", effect: "Strategic Interdiction gains +9% success.", delta: { intelligence: 3 } },
    { id: "mass-drones", label: "Mass-Producible Drones", cost: 260, output:"Production Rule", affects:"Drone industry", description: "Replace airframe quality thresholds with repeatable industrial loss.", effect: "Drone production output +18%." },
    { id: "reusable", label: "Reusable Drones", cost: 340, output:"Recovery Rule", affects:"Drone formations", description: "Recover capability after missions instead of pricing every sortie as terminal.", effect: "Drone daily use -22%." },
    { id: "specialized", label: "Specialized Drones", cost: 450, output:"Unit Buttons", affects:"Specialist drone units", description: "Separate relay, engineering, counter-battery, anti-armor, and contamination roles.", effect: "Unlock specialist Drone situation choices.", delta: { equipment: 2 } },
  ]},
  { id: "assault", label: "Assault Geometry", authority: "Col. Aris Thorne", quote: "A gap is not safe because it is open.", stages: [
    { id: "assault-observation", label: "Observed Passage", cost: 80, output:"Resolution Rule", affects:"Breach maneuvers", description: "Preserve the sequence in which an obstacle consumes an assault.", effect: "Failed breaches preserve observation and expose their casualty sequence." },
    { id: "suppression", label: "Liquidate Courage", cost: 160, output:"Firing Pattern", affects:"Assault support", description: "Synchronize passage with suppression rather than preceding it.", effect: "Breach casualty multiplier -8%." },
    { id: "forced-passage", label: "Forced Passage", cost: 280, output:"Campaign Maneuver", affects:"Engineers and assault formations", description: "Concentrate engineers, fires, and reserves against one geometric problem.", effect: "Breach success +12%.", delta: { readiness: 2 } },
  ]},
  { id: "networked", label: "Networked Command", authority: "Oren Hale", quote: "Command is the art of eliminating distances.", stages: [
    { id: "relay-discipline", label: "Relay Discipline", cost: 90, output:"Operator Modifier", affects:"Signal companies", description: "Make every formation capable of restoring one lost command edge.", effect: "Severed-network penalty -10%." },
    { id: "redundant-orders", label: "Redundant Orders", cost: 190, output:"Resolution Rule", affects:"All formations", description: "Transmit intent through several systems before the first fails.", effect: "Daily Intelligence floor becomes 35.", delta: { intelligence: 3 } },
    { id: "autonomous-command", label: "Autonomous Command", cost: 310, output:"Unit Behavior", affects:"Isolated formations", description: "Permit formations to continue doctrine without receiving permission.", effect: "Network situations unlock exploitation orders." },
  ]},
  { id: "force-procedures", label: "Force Procedures", authority: "General Staff Codification Office", quote: "Control over sacrifice is still control.", stages: [
    { id:"modularized",label:"Modularized Forces",cost:100,output:"Workshop Rule",affects:"All eligible units",description:"Standardize multi-package formations without collapsing training and maintenance.",effect:"Eligible units gain a second workshop module slot." },
    { id:"disintermediation",label:"Disintermediation",cost:150,output:"Army Button",affects:"Concentrated armies",description:"Break a concentrated army into adjacent legal positions without optimizing the terrain.",effect:"Unlock Disintermediate Army. Reduces concentration risk and imposes disorder." },
    { id:"casualty-table",label:"Priority Casualty Table",cost:220,output:"Resolution Rule",affects:"Stacked combat",description:"Override the default order in which formation categories absorb losses.",effect:"Unlock manual casualty-priority control before resolution." },
    { id:"vanguard",label:"Vanguard Designation",cost:260,output:"Unit Module",affects:"Screens and expendable units",description:"Mark one formation as first-contact absorber for mines, ambush, and opening fire.",effect:"Unlock Designate Vanguard in eligible situations." },
    { id:"shoot-scoot",label:"Shoot-and-Scoot",cost:390,output:"Unit Button",affects:"Mobile batteries",description:"Fire and displace before counterfire at the expense of sustained accuracy.",effect:"Counterbattery losses fall; immediate fire output is reduced." },
  ]},
  { id: "fieldcraft", label: "Fieldcraft and Emplacement", authority: "Engineer Directorate", quote: "The ground becomes doctrine when somebody is ordered to alter it.", stages: [
    { id:"entrench",label:"Hasty Entrenchment",cost:90,output:"Unit Button",affects:"Infantry and engineers",description:"Convert unused movement into a temporary defensive posture.",effect:"Unlock Entrench; benefit ends when the formation moves." },
    { id:"camouflage",label:"Camouflage Discipline",cost:140,output:"Workshop Module",affects:"Infantry, batteries, operators",description:"Degrade enemy classification until movement, fire, transmission, or close scouting.",effect:"Enemy intelligence treats eligible formations as uncertain contacts." },
    { id:"sensor-disrupt",label:"Disrupt Sensor",cost:210,output:"Operator Modifier",affects:"Operators and saboteurs",description:"Interfere with non-visual detection while remaining visible to direct sight.",effect:"Sensor-only targeting becomes unavailable against equipped operators." },
    { id:"pioneer",label:"Pioneer Kit",cost:270,output:"Workshop Module",affects:"Infantry",description:"Permit infantry to cut wire, clear minor obstacles, and perform light demolition.",effect:"Unlock limited engineering actions without creating full Engineers." },
    { id:"terrain-emplacement",label:"Terrain Emplacement",cost:360,output:"Engineer Buttons",affects:"Engineer formations",description:"Deform terrain into kill pits, ramparts, defoliated lanes, and earthen parapets.",effect:"Unlock advanced battlefield-shaping situation choices." },
  ]},
  { id: "atrocities", label: "Atrocities", authority: "Custody and Reciprocity Directorate", quote: "The next surrender is negotiated with the last prisoner.", forbidden: true, stages: [
    { id: "gas", label: "Gas Warfare", cost: 10, description: "Correct the enemy belief that contaminated ground can be occupied.", effect: "Pressure +0.25. Reciprocity -8. Atrocity Exposure +12.", delta: { reciprocity: -8, atrocityExposure: 12, legitimacy: -3 } },
    { id: "mines", label: "Persistent Mine Denial", cost: 14, description: "Make the ground remain hostile after the front has moved.", effect: "Withdrawal pressure improves. Materiel Condition -2.", delta: { atrocityExposure: 9, materiel: -2 } },
    { id: "deny-reciprocity", label: "Deny Reciprocity", cost: 20, description: "Remove exchange from the surrender economy.", effect: "Prisoner burden falls. Enemy surrender expectancy collapses.", delta: { reciprocity: -25, atrocityExposure: 18, legitimacy: -4 } },
    { id:"stimulants",label:"Administer Stimulants",cost:26,output:"Unit Button",affects:"Biological formations",description:"Purchase one emergency movement interval with accumulated exhaustion debt.",effect:"Unlock emergency reinforcement; next-day Readiness penalty applies.",delta:{atrocityExposure:6,readiness:-3} },
    { id: "deny-quarter", label: "Deny Quarter", cost: 32, description: "Destroy the expectation that surrender remains available.", effect: "Enemy cohesion hardens. Friendly desertion pressure +12.", delta: { reciprocity: -45, atrocityExposure: 30, desertionPressure: 12, legitimacy: -8 } },
  ]},
];

export const initialState = (): GameState => ({
  day: 1, actions: DAILY_ORDERS, status: "active", population: 18420000, workforce: 11200000, armed: 620000, deployable: 431000,
  voluntary: 9000, forced: 0, queue: 76000, training: 48000, duration: 6, quality: 78,
  readiness: 64, equipment: 71, materiel: 68, treasury: 220, legitimacy: 58, resistance: 14, dependency: 9, intelligence: 42,
  front: -3.4, enemy: 590000, doctrine: 0, doctrineEarned: 0, doctrineWinAwards: [], affinityProofs: {}, atrocityExposure: 0, reciprocity: 100, desertionPressure: 18, deserters: 0, intercepted: 0, patrolCommitment: 0,
  target: "balanced", pendingTarget: null, tempo: "methodical", maneuver: null, maintenanceDebt: 22, productionLedger: null,
  production: { munitions: { allocation: 34, stock: 152000, output: 18400, use: 21000 }, armor: { allocation: 24, stock: 1180, output: 62, use: 74 }, flight: { allocation: 18, stock: 286, output: 14, use: 17 }, drones: { allocation: 24, stock: 3640, output: 310, use: 355 } },
  active: {}, locks: {}, scheduled: [], unlocked: ["drone-war"], decisions: [], reports: [{ day: 1, title: "Third Division Will Exhaust Its Ready Reserve Before Dusk", body: "At the present rate of expenditure, 4,218 additional soldiers will be lost before Day 1 resolves. The Kesh corridor remains open. Munitions coverage has fallen below six days. Two training cohorts will arrive too late to replace the morning’s losses.", tone: "warn", epigraph: "The purpose of a reserve is not to remain intact." }],
});

const clone = (state: GameState): GameState => JSON.parse(JSON.stringify(state));
const add = (state: GameState, delta: Delta = {}) => Object.entries(delta).forEach(([key, value]) => { (state[key as NumberKey] as number) += value as number; });
const normalize = (s: GameState) => {
  ["readiness","equipment","materiel","legitimacy","resistance","dependency","intelligence","quality","atrocityExposure","reciprocity","desertionPressure","maintenanceDebt"].forEach((key) => { (s[key as NumberKey] as number) = Math.max(0, Math.min(100, s[key as NumberKey] as number)); });
  s.deployable = Math.max(0, Math.min(s.armed, Math.round(s.deployable))); s.queue = Math.max(0, Math.round(s.queue)); s.training = Math.max(1000, Math.round(s.training)); s.duration = Math.max(2, Math.min(12, Math.round(s.duration))); s.deserters = Math.max(0, Math.round(s.deserters));
};
const hash = (text: string) => { let h = 2166136261; for (let i=0;i<text.length;i++) { h ^= text.charCodeAt(i); h = Math.imul(h,16777619); } return (h>>>0)/4294967295; };

export const situationForDay = (day: number) => SITUATIONS[(day - 1) % SITUATIONS.length];
export const maneuverById = (id: string | null) => MANEUVERS.find((m) => m.id === id);
export const maneuverChance = (s: GameState, m: Maneuver) => {
  const intelligence = (s.intelligence - 42) * .002;
  const readiness = (s.readiness - 64) * .0015;
  const equipment = (s.equipment - 71) * .0015;
  const shortages = Object.values(s.production).filter(line => line.stock < line.use * 2).length * -.03;
  const fieldProof = Math.min(.08,(s.affinityProofs[m.vector]??0)*.02);
  return Math.max(.05, Math.min(.95, m.success + intelligence + readiness + equipment + shortages + fieldProof));
};
export const doctrineStage = (id: string) => DOCTRINES.flatMap((v) => v.stages.map((stage,index) => ({ vector:v,stage,index }))).find((x) => x.stage.id === id);

export const commit = (state: GameState, family: Family, choice: Choice) => {
  if (state.actions < 1 || state.status !== "active" || (state.locks[family.id] ?? 0) > state.day) return state;
  const s = clone(state); add(s, choice.delta);
  if (choice.delay) s.scheduled.push({ day: s.day + choice.delay.days, source: choice.label, delta: choice.delay.delta });
  if (choice.target) s.pendingTarget = choice.target;
  if (choice.tempo) s.tempo = choice.tempo;
  s.active[family.id] = choice.id; s.locks[family.id] = s.day + family.lock; s.actions -= 1; s.decisions.unshift({ day: s.day, family: family.label, choice: choice.label }); normalize(s); return s;
};

export const commitManeuver = (state: GameState, maneuver: Maneuver) => {
  if (state.actions < 1 || state.status !== "active" || state.maneuver) return state;
  const s = clone(state); s.maneuver = maneuver.id; s.actions -= 1; s.readiness += maneuver.readiness ?? 0; s.reciprocity += maneuver.reciprocity ?? 0;
  s.decisions.unshift({ day: s.day, family: `Operational Direction // ${situationForDay(s.day).sector}`, choice: maneuver.label }); normalize(s); return s;
};

export const unlockDoctrine = (state: GameState, stageId: string) => {
  const found = doctrineStage(stageId); if (!found || state.unlocked.includes(stageId) || state.doctrine < found.stage.cost) return state;
  if (found.index > 0 && !state.unlocked.includes(found.vector.stages[found.index-1].id)) return state;
  const s = clone(state); s.doctrine -= found.stage.cost; s.unlocked.push(stageId); add(s, found.stage.delta); normalize(s); return s;
};

const tempoProfile = (tempo: Tempo) => ({ hold: [.55,.65,-.25], methodical: [1,1,.35], surge: [1.35,1.4,.85], "human-wave": [2.1,1.2,1.25] }[tempo]);
export const estimateDay = (s: GameState) => {
  const maneuver = maneuverById(s.maneuver); const [tempoCasualty,tempoSupply] = tempoProfile(s.tempo);
  const power = s.deployable * s.readiness / 100 * s.equipment / 100; const ratio = Math.max(.45, Math.min(1.7, power / Math.max(1, s.enemy * .52)));
  const casualty = Math.round((4200 + s.day * 38) * tempoCasualty * (maneuver?.casualty ?? 1) * (s.production.munitions.stock < 42000 ? 1.15 : 1) / Math.max(.6, ratio));
  const desertion = Math.round((260 + s.desertionPressure * 31 + s.forced * .018) * (s.reciprocity < 45 ? 1.25 : 1));
  const intercepted = Math.min(desertion, Math.round(desertion * Math.min(.62, s.patrolCommitment / 9000)));
  return { casualty, desertion, intercepted, netDesertion: desertion - intercepted, supply: tempoSupply * (maneuver?.supply ?? 1) };
};

export const liveProjection = (s: GameState, fraction: number) => {
  const f = Math.max(0, Math.min(1, fraction)); const estimate = estimateDay(s); const losses = Math.floor(estimate.casualty * f); const deserted = Math.floor(estimate.desertion * f); const intercepted = Math.floor(estimate.intercepted * f); const netDesertion = deserted - intercepted;
  const production: Record<Resource,number> = { munitions:0,armor:0,flight:0,drones:0 };
  const projected=executeCircuit(productionCircuit,s,{supplyMultiplier:tempoProfile(s.tempo)[1],maneuverMultiplier:maneuverById(s.maneuver)?.supply??1});
  projected.ledger.lines.forEach(line=>production[line.resource]=Math.max(0,Math.round(line.opening+line.net*f)));
  return { losses, deserted, intercepted, netDesertion, deployable: Math.max(0, s.deployable - losses - netDesertion), armed: Math.max(0,s.armed-losses-netDesertion), production };
};

export const projectProduction = (s:GameState) => executeCircuit(productionCircuit,s,{supplyMultiplier:tempoProfile(s.tempo)[1],maneuverMultiplier:maneuverById(s.maneuver)?.supply??1}).ledger;

export const resolve = (state: GameState) => {
  if (state.status !== "active") return state; const s = clone(state); const situation = situationForDay(s.day); const maneuver = maneuverById(s.maneuver);
  const arrivals = s.scheduled.filter((x) => x.day <= s.day); s.scheduled = s.scheduled.filter((x) => x.day > s.day); arrivals.forEach((x) => add(s, x.delta));
  Object.entries(s.active).forEach(([familyId, choiceId]) => { const f = FAMILIES.find((x) => x.id === familyId); const ch = f?.choices.find((x) => x.id === choiceId); add(s, ch?.tick); });
  const [tempoCasualty,tempoSupply,tempoPressure] = tempoProfile(s.tempo); const maneuverSupply = maneuver?.supply ?? 1;
  const productionResult=executeCircuit(productionCircuit,s,{supplyMultiplier:tempoSupply,maneuverMultiplier:maneuverSupply});Object.assign(s,productionResult.state);s.productionLedger=productionResult.ledger;
  const intake=Math.max(0,s.voluntary+s.forced); s.workforce-=Math.round(intake*.64); s.queue+=intake; const admitted=Math.min(s.queue,s.training); s.queue-=admitted; const grads=Math.round(admitted/s.duration*Math.max(.35,(s.quality-20)/80));
  const power=s.deployable*s.readiness/100*s.equipment/100; const ratio=Math.max(.45,Math.min(1.7,power/Math.max(1,s.enemy*.52))); const shortages=Object.values(s.production).filter((x)=>x.stock<x.use*2).length;
  const successRoll=hash(`${s.day}:${situation.id}:${maneuver?.id ?? "standing"}`); const succeeded=maneuver?successRoll<maneuverChance(s,maneuver):true; const maneuverPressure=maneuver?(succeeded?maneuver.successPressure:maneuver.failurePressure):0;
  const atrocities=(s.unlocked.includes("gas")?.25:0)+(s.unlocked.includes("mines")?.12:0); const losses=Math.round((4200+s.day*38)*tempoCasualty*(maneuver?.casualty??1)*(s.production.munitions.stock<42000?1.15:1)/Math.max(.6,ratio)); const enemyLoss=Math.round((3600+s.day*31)*ratio*(.8+(tempoPressure+maneuverPressure+atrocities)*.3));
  const desert=estimateDay(s); s.deserters+=desert.desertion; s.intercepted+=desert.intercepted; s.armed+=grads-losses-desert.netDesertion; s.deployable+=Math.max(0,grads-Math.round(losses*.16))-losses-desert.netDesertion; s.enemy+=7900+s.day*55-enemyLoss; s.population-=Math.round(losses*.72);
  const move=tempoPressure+maneuverPressure+atrocities+(ratio-1)*1.5+(s.intelligence-42)/120+(1-shortages*.18)*.25-.25; s.front+=move;
  let doctrineGain=0; if(maneuver&&succeeded){doctrineGain=Math.max(10,Math.round(enemyLoss/1000*8+Math.max(0,move)*20));s.doctrine+=doctrineGain;s.doctrineEarned+=doctrineGain;s.affinityProofs[maneuver.vector]=(s.affinityProofs[maneuver.vector]??0)+1;s.doctrineWinAwards.unshift({day:s.day,action:maneuver.label,verified:`${enemyLoss.toLocaleString()} enemy losses // ${move>=0?"+":""}${move.toFixed(1)} km`,reward:doctrineGain});}
  s.readiness+=(grads>losses?.7:-1.2)-shortages*.55; s.equipment-=losses/18000+shortages*.35; s.maintenanceDebt+=tempoSupply*.6; s.treasury+=3.4-s.armed/185000; s.legitimacy-=losses/8500+s.atrocityExposure/180; s.resistance+=s.forced/28000-s.legitimacy/180; s.desertionPressure+=losses/4500+(s.readiness<45?3:0)-s.legitimacy/120;
  const resultTitle=maneuver?`${maneuver.label} ${succeeded?"Opened the Day":"Was Collected in Casualties"}`:(move>=0?`The Line Moved ${Math.abs(move).toFixed(1)} km Forward`:`The Line Fell Back ${Math.abs(move).toFixed(1)} km`);
  const doctrineText=doctrineGain?` ${doctrineGain} Insight Points were awarded for the verified battlefield result.`:" No Insight Points were awarded because the maneuver did not produce a verified win."; const desertText=` ${desert.desertion.toLocaleString()} deserted; ${desert.intercepted.toLocaleString()} were intercepted.`;
  const productionText=` Production closed with ${productionResult.ledger.shortages} critical line${productionResult.ledger.shortages===1?"":"s"}; maintenance debt is ${productionResult.ledger.maintenanceDebtAfter.toFixed(0)}.`;
  s.day+=1; s.actions=DAILY_ORDERS; s.maneuver=null; s.reports.unshift({ day:s.day, title:resultTitle, body:`${losses.toLocaleString()} soldiers were lost. ${grads.toLocaleString()} recruits graduated. The front moved ${move>=0?"+":""}${move.toFixed(1)} km.${productionText}${desertText}${doctrineText}`, tone:move>.6?"good":move<-.4?"bad":"warn", epigraph:maneuver?`Experience is waste until it is made transmissible.`:`The map is never empty. It contains roads not yet cut, fields not yet denied, and men not yet counted.` });
  if(s.front>=12||(s.day>30&&s.front>0))s.status="victory"; if(s.front<=-12||s.legitimacy<=0||s.deployable<75000||(s.day>30&&s.front<=0))s.status="defeat"; normalize(s); return s;
};

export const fmt = (n: number, full=false) => full?Math.round(n).toLocaleString():new Intl.NumberFormat("en",{notation:"compact",maximumFractionDigits:1}).format(n);
export const coverage = (s: GameState, r: Resource) => s.production[r].stock/Math.max(1,s.production[r].use);
export const assessment = (s: GameState) => { const ratio=(s.deployable*s.readiness/100*s.equipment/100)/Math.max(1,s.enemy*.52); return ratio>1.15?["Local advantage","good"]:ratio>.9?["Contested","warn"]:["Enemy advantage","bad"] as [string,Tone]; };
