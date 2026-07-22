export type SubMissionContentDomain = "domestic" | "network";

export type SubMissionFrame = {
  id:string;
  archetypeId:string;
  domain:SubMissionContentDomain;
  title:string;
  brief:string;
  question:string;
  authority:string;
  aliases:string[];
};

export type SubMissionRealization = {
  id:"opening"|"recurrence"|"consequence";
  coda:string;
  questionCoda:string;
};

type FrameRow=readonly [
  id:string,
  title:string,
  brief:string,
  question:string,
  authority:string,
  aliases?:readonly string[],
];

const group=(domain:SubMissionContentDomain,archetypeId:string,rows:readonly FrameRow[]):SubMissionFrame[]=>rows.map(([id,title,brief,question,authority,aliases=[]])=>({
  id,archetypeId,domain,title,brief,question,authority,aliases:[...aliases],
}));

// A frame is an indivisible authored scene. The compiler chooses one compatible frame
// for a mechanical archetype and then binds live evidence and an operational anchor.
// It never recombines isolated nouns, actors, or consequences as a Mad Lib.
export const DOMESTIC_SUB_MISSION_FRAMES:SubMissionFrame[]=[
  ...group("domestic","induction-overhang",[
    ["tent-city","The induction queue has become a population","Canvas streets now extend beyond the induction grounds. The people waiting for uniforms already require food, sanitation, discipline, and an answer about whether waiting counts as service.","Where should the unconverted manpower go?","INDUCTION BUREAU",["induction camp","training queue"]],
    ["transit-depots","The recruit trains have nowhere left to arrive","Three transit depots are holding complete cohorts because the camps cannot receive them. Every train held for recruits is also unavailable to carry ammunition toward the active sector.","Which bottleneck should command convert into capacity?","MILITARY TRANSIT AUTHORITY",["recruit trains","transit backlog"]],
    ["requisitioned-schools","The schools are training soldiers before instructors arrive","Municipal schools were requisitioned as emergency classrooms. They can produce trained specialists, absorb the queue, or return to civilian use, but the same buildings cannot do all three.","What should these classrooms produce first?","EMERGENCY INSTRUCTION BOARD",["training schools","requisitioned classrooms"]],
    ["medical-screening","The medical queue is now longer than basic training","Screening stations are classifying recruits more slowly than the camps can train them. Lower standards clear bodies; better instruction recovers usable specialists; full screening preserves quality at the price of delay.","Which form of unfitness should the army accept?","SERVICE MEDICAL DIRECTORATE",["medical queue","screening stations"]],
  ]),
  ...group("domestic","replacement-standard",[
    ["veteran-cadre","Replacement quality has become an operational argument","Veteran cadres are spending more time repairing incomplete instruction than rebuilding their own formations. Faster graduation preserves headcount while transmitting omitted training directly to the front.","Which deficiency should the front inherit?","TRAINING INSPECTORATE",["replacement quality","veteran instructors"]],
    ["live-fire-ration","The replacement battalions have one live-fire allotment","The ammunition school can train every recruit badly or a smaller specialist cohort well. Cancelling the exercise preserves shells and sends the uncertainty forward in human form.","Who should receive the remaining proof of competence?","FIELD TRAINING COMMAND",["live fire","training ammunition"]],
    ["specialist-gap","The formations are receiving rifles without specialists","Replacement drafts contain infantry but too few medics, signalers, mechanics, and junior leaders. A compressed course fills ranks; a specialist course restores functions; a full cycle delays both.","Is the shortage one of bodies, functions, or time?","REPLACEMENT ALLOCATION STAFF",["specialist shortage","replacement drafts"]],
    ["replacement-march","The replacement march is graduating men by distance","Cohorts are learning movement discipline on the road because every fixed camp is full. The improvisation accelerates arrival while stripping out the instruction that cannot be taught while marching.","Which part of training may become movement?","MARCH REPLACEMENT COMMAND",["march training","replacement route"]],
  ]),
  ...group("domestic","personnel-flight",[
    ["embarkation-refusal","A replacement column has refused the embarkation order","The refusal remains organized and nonviolent. Amnesty may split it, patrols may contain it, and improved rations may remove its public justification while leaving the organizers intact.","What should make the column move?","PERSONNEL CONTROL",["embarkation refusal","refusing column"]],
    ["leave-overstay","Authorized leave is becoming an undeclared reserve","Thousands have not returned from household leave, but most remain at registered addresses. Command can invite return, police the stations, or make service materially easier than absence.","How should a missing soldier become present again?","RETURN-TO-SERVICE OFFICE",["leave overstay","absent soldiers"]],
    ["hospital-drift","The hospitals are discharging soldiers who never reach their units","Paper transfers are complete while bodies disappear between convalescent wards and replacement depots. The route can be made forgiving, coercive, or worth completing.","Where should custody resume after recovery?","MEDICAL PERSONNEL BOARD",["hospital drift","convalescent absence"]],
    ["station-desertions","The rear stations are producing more absences than trains","Men are leaving the transport system during delays long enough to resemble permission. Patrols can close exits, amnesty can reopen return, and rations can reduce the value of stepping outside.","Which part of the station should command control?","RAIL PERSONNEL PATROL",["station desertions","rail absences"]],
  ]),
  ...group("domestic","casualty-account",[
    ["duplicate-rolls","The casualty roll cannot remain both public and sealed","Households possess names that appear twice, late, or not at all. Command must decide whether the state supplies truth, ritual, or classification before private lists become the accepted record.","How should the dead enter public knowledge?","CASUALTY ACCOUNTING OFFICE",["casualty rolls","public losses"]],
    ["missing-names","The missing have acquired names before they have acquired status","Units report absence, hospitals report no admission, and families report last letters from positions now abandoned. Publishing uncertainty, mourning without status, and continued secrecy each create a different debt.","What does the state owe a family before it knows the answer?","MISSING PERSONS REGISTRY",["missing soldiers","household notices"]],
    ["burial-backlog","The burial details are now ahead of casualty accounting","Graves carry markers that the central ledger cannot reconcile. A public roll could expose the mismatch; public mourning could acknowledge it; a sealed ledger could preserve investigation and deepen suspicion.","Which record should become authoritative first?","FIELD BURIAL COMMISSION",["burial backlog","unreconciled graves"]],
    ["household-notices","The households are learning of losses from one another","Official notices arrive after unit letters, hospital rumors, and factory absences. The state can accelerate names, centralize ritual, or seal the sequence until certainty catches up.","Which kind of lateness can legitimacy survive?","HOUSEHOLD NOTIFICATION BUREAU",["loss notices","family notification"]],
  ]),
  ...group("domestic","civil-allocation",[
    ["bread-district","The bread districts and the arsenals share one rail allotment","Equal deliveries preserve consent, industrial priority preserves output, and local allocation preserves administrative reach. Every allocation leaves another queue visible.","Which civilian system receives priority?","HOME FRONT DIRECTORATE",["bread allocation","civil supply"]],
    ["heating-grid","The heating grid can preserve homes or the night shift","Fuel pressure is falling across the industrial wards. Central equality, factory priority, and municipal discretion each keep a different part of the state functional.","Where should the last reliable heat become capacity?","CIVIL ENERGY AUTHORITY",["heating grid","winter allocation"]],
    ["evacuation-corridor","The evacuation corridor is consuming the same trucks as production","Moving civilians preserves life and consent; moving workers preserves output; delegating the route preserves local authority while surrendering central sequence.","Who receives transport before the corridor closes?","EVACUATION AND LABOR BOARD",["evacuation route","civil transport"]],
    ["factory-canteens","The factory canteens have become the city's functioning ration system","Workers eat, nearby households queue, and local councils demand custody of the kitchens. The canteens can serve equality, output, or local legitimacy, not all three at once.","Who owns a meal when the canteen is public infrastructure?","INDUSTRIAL PROVISION OFFICE",["factory canteens","worker rations"]],
  ]),
  ...group("domestic","fiscal-mobilization",[
    ["bond-auction","The next bond auction requires a believable end to the war","Creditors will finance survival if command assigns the future revenue. Taxation, borrowing, and seizure each keep the present funded by choosing a different future opponent.","Who should receive the current cost of survival?","WAR FINANCE BOARD",["war bonds","bond auction"]],
    ["profit-ledger","The war-profit ledger contains enough money to become policy","Industrial gains can be taxed, borrowed against, or requisitioned directly. Each path purchases materiel while changing who believes the state will honor property after victory.","Which claim outranks wartime profit?","EXCESS PROFITS COMMISSION",["war profits","industrial tax"]],
    ["private-reserves","Private reserves now exceed the treasury's liquid balance","Banks and trading houses can subscribe voluntarily, surrender windfall income, or lose reserves by decree. The arithmetic is immediate; the political maturity date is not.","How should private liquidity become public force?","CENTRAL RESERVE DIRECTORATE",["bank reserves","fiscal reserves"]],
    ["currency-flight","The currency is leaving faster than the taxpayers","Merchants are converting balances into foreign claims before the next levy. Bonds reward remaining confidence, profit taxation captures visible gains, and seizure closes the exit by damaging the door.","Which form of confidence should command spend?","MONETARY DEFENSE OFFICE",["currency flight","capital controls"]],
  ]),
  ...group("domestic","industrial-labor",[
    ["bearing-failures","The factories have reached their human maintenance limit","Bearing failures, skipped inspections, and exhausted crews now describe the same system. Output can be accelerated, dispersed, or interrupted deliberately before breakdown chooses for command.","What should industry optimize before the next failure?","INDUSTRIAL CONTROL BOARD",["bearing failures","factory maintenance"]],
    ["night-shift","The night shift is producing tomorrow's maintenance debt","Output remains high because repairs are being signed as completed rather than performed. Overtime spends labor, dispersion spends coordination, and overhaul spends today's production.","Which debt should the night shift leave behind?","SHIFT SAFETY INSPECTORATE",["night shift","overtime"]],
    ["dispersed-workshops","The dispersed workshops are surviving and no longer agreeing","Small shops evade attack but duplicate scarce tools and improvise incompatible parts. Central overtime raises output, further dispersion preserves survival, and maintenance standardizes at the cost of tempo.","Should the workshop system optimize quantity, survivability, or interchangeability?","DISTRIBUTED INDUSTRY OFFICE",["dispersed factories","workshop network"]],
    ["overhaul-backlog","The overhaul queue is beginning to govern production","Finished weapons wait for repaired machines while production quotas continue counting them as output. Labor can work longer, plants can divide the queue, or the line can stop and restore itself.","Which number should the factory make true?","HEAVY OVERHAUL BOARD",["overhaul queue","machine repair"]],
  ]),
  ...group("domestic","service-bargain",[
    ["age-cohort","The next age cohort has become a public referendum","Voluntary service buys consent slowly, selective compulsion concentrates resentment, and universal obligation distributes both force and opposition.","Who owes the state a body?","SERVICE COMMISSION",["conscription cohort","service obligation"]],
    ["exemption-board","The exemption board is defining citizenship one file at a time","Every approval preserves a household or factory and transfers the obligation elsewhere. Command can price volunteering, narrow compulsion, or eliminate exemptions through universality.","Which exception should become the rule?","NATIONAL EXEMPTION BOARD",["draft exemptions","service board"]],
    ["regional-quota","The regional quotas are equal only on the central map","Some districts have workers, others refugees, and others graves. Volunteer incentives respect variation; selective levies exploit it; universal service denies that it matters.","How should unequal regions carry an equal war?","REGIONAL SERVICE AUTHORITY",["regional quotas","district levy"]],
    ["factory-deferments","Factory deferments have become an unofficial class system","Skilled workers remain outside uniform while their output arms those who enter it. Pay can attract volunteers, selection can protect skills, and universality can abolish the distinction by damaging production.","Which form of service counts as service?","MANPOWER ALLOCATION COUNCIL",["factory deferments","industrial exemptions"]],
  ]),
  ...group("domestic","ration-fracture",[
    ["dual-card-system","Two ration cards now describe two versions of citizenship","Priority cards preserve war production while ordinary cards preserve the claim of equality. Local councils and curfew enforcement offer different ways to keep the difference governable.","Which household receives the state's last credible promise?","CIVIL SUPPLY COMMISSION",["ration cards","household supply"]],
    ["military-households","Military households are entering civilian queues with military expectations","Families of serving soldiers demand priority without wanting a separate caste. Equal rationing, industrial priority, and curfew enforcement each define loyalty differently.","What material privilege should service create?","HOUSEHOLD PROVISION BOARD",["military families","ration priority"]],
    ["rural-councils","The rural councils are withholding grain from a distribution system they no longer trust","Central equality can requisition the stock, industrial priority can redirect it, and local custody can restore flow by conceding control.","Who must be trusted before the grain moves?","RURAL SUPPLY LIAISON",["grain councils","rural rationing"]],
    ["black-market","The black market is now the only distribution system with complete shelves","Its prices reveal scarcity more accurately than the ministry and distribute it less defensibly. Equality, production priority, or curfew enforcement can each break the market by breaking something else.","Which function of the illegal market must survive?","MARKET CONTROL OFFICE",["black market","illegal supply"]],
  ]),
  ...group("domestic","factory-junction",[
    ["single-switch","One surviving switch can clear one industrial priority","The railway can move shells, armor, aircraft, or cheap eyes before enemy fire revises the timetable. The marginal train will define which arm remains abundant tomorrow.","Which arm receives the marginal train?","RAIL AND OUTPUT AUTHORITY",["rail switch","priority train"]],
    ["bridge-load-limit","The industrial bridge can carry one heavy program before inspection","Gun forgings, armor plate, and drone components are waiting on opposite approaches. Crossing one first delays the others beyond the current production cycle.","Which capability is worth spending the bridge?","HEAVY TRANSPORT BOARD",["load limit","industrial bridge"]],
    ["rolling-stock","The last serviceable rolling stock is already assigned three times","Artillery, steel works, and reconnaissance assembly each possess a stamped priority. Command must choose which stamp becomes fact and which factories count inventory they cannot receive.","Which timetable should the railway obey?","ROLLING STOCK COMMISSION",["rail cars","rolling stock"]],
    ["dispatch-stoppage","A dispatch stoppage has frozen every finished weapon in place","The plants can load one emergency consist while clerks rebuild the schedule. Guns consume weight, armor consumes handling, and drones consume protected volume.","What should move while administration repairs itself?","EMERGENCY FREIGHT DESK",["dispatch stoppage","freight priority"]],
  ]),
  ...group("domestic","household-arrears",[
    ["missed-payday","The army has missed a payday that every household counted","Base pay restores the routine obligation, stipends target immediate need, and survivor guarantees purchase confidence with a liability that grows after every battle.","What should the state promise before the next name is posted?","SERVICE PAY OFFICE",["military pay","pay arrears"]],
    ["survivor-claims","Survivor claims are arriving before casualty status","Families need money while the ledger still distinguishes missing from dead. Pay, household stipends, and survivor priority each resolve time differently.","Which uncertainty should the treasury fund?","SURVIVOR CLAIMS BOARD",["survivor claims","missing pay"]],
    ["garrison-rents","Garrison rents are consuming the pay before soldiers receive it","Military households face eviction in towns whose landlords also finance local production. Raising pay, subsidizing households, or guaranteeing survivors shifts the burden without removing it.","Where should service compensation touch the household?","GARRISON HOUSING OFFICE",["garrison rent","military households"]],
    ["remittance-fraud","The remittance system is paying ghosts and missing living families","Fraud does not erase the arrears; it makes every repair look punitive. Broad pay, targeted stipends, and survivor preference each require a different tolerance for imperfect identity.","Which payment error is least corrosive?","MILITARY REMITTANCE INSPECTORATE",["remittance fraud","service payments"]],
  ]),
  ...group("domestic","continuity-threshold",[
    ["municipal-defiance","Several municipalities are obeying the war only by local amendment","Public truth may restore a shared record, delegation may legalize the deviation, and curfew may restore central sequence by spending consent.","Which institution should absorb the next shock?","CONTINUITY SECRETARIAT",["municipal defiance","state continuity"]],
    ["police-neutrality","The civil police have declared themselves neutral between decrees and crowds","They will protect food, hospitals, and records but no longer enforce open-ended emergency orders. Command can publish the stakes, delegate authority, or compel obedience.","What must remain governable if coercion stops being automatic?","CIVIL ORDER COMMISSION",["police neutrality","civil order"]],
    ["cabinet-relocation","The cabinet can relocate only by abandoning the offices that make it legible","A public record preserves legitimacy, local delegation preserves administration, and curfew preserves the route. The choice determines whether continuity means authority, function, or survival.","Which part of the state must arrive intact?","CABINET CONTINUITY OFFICE",["government relocation","continuity plan"]],
    ["broadcast-blackout","The national broadcast has failed during the first credible rumor of collapse","Publishing facts may arrest invention, local councils may carry authority without a center, and curfew may slow both panic and truth.","Who should speak for a state that cannot currently be heard?","PUBLIC CONTINUITY SERVICE",["broadcast blackout","public rumor"]],
  ]),
];

export const NETWORK_SUB_MISSION_FRAMES:SubMissionFrame[]=[
  ...group("network","relay-compromise",[
    ["captured-repeater","A captured repeater is still carrying friendly traffic","The frequencies remain useful because the enemy has not yet revealed whether it can read, imitate, or merely locate them. Speed, silence, and redundancy spend different parts of that uncertainty.","Should command travel quickly, secretly, or redundantly?","SIGNAL COMPANY",["captured relay","compromised repeater"]],
    ["civil-switchboard","The corps net is passing through a civilian switchboard","The exchange restores reach but exposes military rhythm to operators, taps, and every physical line entering the building. Cutting it preserves secrecy by isolating the formations it serves.","Which property of command should the switchboard preserve?","CIVIL SIGNAL LIAISON",["switchboard","civil telephone"]],
    ["hilltop-relay","The hilltop relay can transmit once before displacement","Enemy direction finding has narrowed the transmitter to one ridge. A powerful burst restores tempo, darkness preserves the package, and distributed bursts sacrifice coherence for survival.","What should the final transmission accomplish?","MOBILE RELAY COMMAND",["hilltop relay","direction finding"]],
    ["reused-frequency","Yesterday's frequency is the only one every formation still monitors","Changing it improves secrecy and guarantees missed traffic. Reusing it restores command quickly and extends the enemy's pattern; distributing it makes every receiver part of the repair.","How much familiarity can the network afford?","FREQUENCY CONTROL OFFICE",["reused frequency","signal compromise"]],
  ]),
  ...group("network","authentication-drift",[
    ["artillery-window","Authentication has become slower than the artillery window","Every additional challenge protects the net while consuming the interval in which the fire order remains useful. Delegation and rolling codes preserve tempo by moving trust elsewhere.","Which authority may declare an order authentic?","NETWORK SECURITY OFFICE",["authentication delay","artillery window"]],
    ["expired-keys","Half the formations are operating on keys that expired correctly","The replacement set reached headquarters and not the front. Strict challenge rejects real units, delegated keys accept local custody, and rolling codes rebuild agreement while orders wait.","When does an expired credential remain more trustworthy than the alternative?","CRYPTOGRAPHIC DISTRIBUTION CELL",["expired keys","key distribution"]],
    ["challenge-backlog","The challenge queue contains more orders than the network can verify","Authenticity has become a throughput limit. Central review preserves proof, delegation preserves tempo, and rolling codes preserve neither without disciplined synchronization.","Which orders deserve to exist before verification catches up?","ORDER VALIDATION DESK",["challenge queue","verification backlog"]],
    ["clock-desync","The command clocks disagree by enough to invalidate valid orders","Time windows are rejecting authentic traffic and accepting stale traffic at different headquarters. Additional challenge, delegated judgment, and rolling codes each define the present differently.","Who is allowed to decide what time the war is?","NETWORK TIME AUTHORITY",["clock drift","time synchronization"]],
  ]),
  ...group("network","courier-loss",[
    ["shelled-road","Courier routes now overlap the artillery map","Silence preserves secrecy only while messengers survive the distance between headquarters and action. Central custody, field copies, and destruction after reading allocate that risk differently.","Where should custody live when the relay dies?","FIELD COURIER SERVICE",["courier route","shelled road"]],
    ["flooded-route","The river has erased the authenticated courier route","Alternative crossings require local guides and expose the archive to custody the staff did not approve. Central retention delays orders; field copies multiply them; destruction preserves deniability by ending reference.","Which loss is safer: time, control, or memory?","RIVER DISPATCH SERVICE",["flooded courier route","dispatch crossing"]],
    ["checkpoint-chain","Every checkpoint is validating the courier and invalidating the timetable","The seals remain intact while the order becomes obsolete in transit. Moving custody forward restores speed; retaining it centrally preserves chain; burn instructions preserve secrecy after use.","Which checkpoint should be the last one that matters?","ROUTE AUTHENTICATION OFFICE",["checkpoint chain","courier delay"]],
    ["drop-capsule","The air-dropped order capsule landed between both lines","Recovery may expose the route, contents, and intended formation. Central custody argues for abandonment, field custody for retrieval, and destruction protocols for making possession irrelevant.","What must survive if the message itself cannot?","AERIAL DISPATCH SECTION",["order capsule","air dispatch"]],
  ]),
  ...group("network","spectrum-saturation",[
    ["corps-net-collision","Two corps nets are issuing different wars on the same frequency","Bandwidth remains available, but overlapping command has made every clear transmission ambiguous. Power, rolling codes, and distributed routing each recover clarity by revealing something else.","What should the network reveal in exchange for speed?","SPECTRUM CONTROL",["frequency collision","corps net"]],
    ["direction-finding","Every useful transmission now improves the enemy firing solution","The net still carries orders; it also carries a map of who matters. Broadcast restores tempo, code rotation raises friction, and distribution turns one target into many weaker ones.","Which signature can command afford to teach?","EMISSION SECURITY OFFICE",["direction finding","emitter signature"]],
    ["civilian-overlap","Civil emergency traffic is occupying the military spectrum","Hospitals, fire brigades, and formations are now authenticating over adjacent channels. Priority power, rolling separation, and distributed custody each preserve a different public obligation.","Whose emergency defines the channel?","JOINT SPECTRUM BOARD",["civil radio","spectrum overlap"]],
    ["drone-control-spill","Drone control traffic is drowning the order net","Remote platforms consume continuous bandwidth while human formations require short authoritative bursts. Broadcast, code discipline, and distribution disagree about which traffic may wait.","What kind of control deserves continuity?","UNMANNED SYSTEMS NETWORK CELL",["drone control","bandwidth saturation"]],
  ]),
  ...group("network","false-order",[
    ["dead-headquarters","A valid order has arrived from a headquarters that no longer exists","The syntax is correct, the seal is current, and the originating office ceased to exist yesterday. Proof, archive custody, and delegated judgment now disagree.","Which proof outranks a correct message?","ORDER PROVENANCE CELL",["false order","dead headquarters"]],
    ["duplicate-seal","Two incompatible orders carry the same authentic seal","Either custody failed or authority divided without telling the recipients. Additional challenge, central comparison, and field delegation each decide authenticity at a different layer.","Where can one seal become two truths?","COMMAND SEAL REGISTRY",["duplicate seal","conflicting orders"]],
    ["replayed-window","An old order has re-entered the network inside a valid window","The message is authentic and operationally obsolete. Strict challenge may detect sequence, archive custody may expose repetition, and delegated judgment may reject it without proof.","Can an authentic order become hostile through time alone?","MESSAGE SEQUENCE OFFICE",["replayed order","stale command"]],
    ["wrong-formation","A correct order has reached a formation it would destroy","Every credential validates except the recipient. The mismatch may be clerical, compromised, or deliberate; the response determines whether formations trust central syntax or local reality.","Which fact may invalidate command intent?","FORMATION PROVENANCE DESK",["misrouted order","wrong recipient"]],
  ]),
  ...group("network","archive-latency",[
    ["map-version","The archive and the front are fighting from different map versions","Headquarters possesses every instruction except the one formations can still execute in time. Central truth, field custody, and disposable copies each preserve a different war.","Should the archive preserve truth, speed, or deniability?","GENERAL STAFF ARCHIVE",["map version","archive lag"]],
    ["amended-order","The amendment reached the archive before the original reached the front","The official sequence is complete and the operational sequence is reversed. Central custody can wait, field custody can reconcile, and burn-after-use can prevent a second contradiction by destroying both references.","Which sequence should become authoritative?","ORDER AMENDMENT OFFICE",["amended order","message sequence"]],
    ["burned-annex","The only current annex was destroyed under a valid security order","The archive can prove why it is missing and cannot reproduce what formations need. Field copies restore function; central custody preserves doctrine; disposable custody limits further exposure.","What does an archive owe the war after obeying destruction?","CLASSIFIED RECORDS BOARD",["burned annex","destroyed orders"]],
    ["carbon-copy-queue","The carbon-copy queue is preserving every obsolete instruction","Clerks can certify history faster than signalers can distribute change. Central retention increases certainty, field custody increases speed, and destruction narrows the number of contradictions that survive.","How much accurate history can current command afford?","DISTRIBUTION ARCHIVE",["copy queue","order archive"]],
  ]),
  ...group("network","relay-custody",[
    ["contractor-keys","No headquarters can prove it owns the contractor-operated relay","The hardware is friendly, the keys are current, and the technicians answer to a contract written before the emergency. Field custody, code rotation, and central archive control each claim legitimacy.","Who should own the relay long enough to make it trustworthy?","SIGNAL CUSTODY BOARD",["contractor relay","relay ownership"]],
    ["captured-hardware","Captured hardware has become the fastest path through the network","Its channels work because the enemy expects them to. Field custody can exploit it, rolling codes can domesticate it, and central custody can quarantine what makes it useful.","When does captured equipment become friendly infrastructure?","TECHNICAL EXPLOITATION OFFICE",["captured relay","enemy hardware"]],
    ["disputed-technicians","Two commands claim the technicians who hold the only current keys","The relay follows people rather than organizational charts. Assigning them forward restores tempo, rotating keys restores abstraction, and centralizing them restores custody by removing local competence.","Who owns expertise when expertise owns access?","SIGNAL PERSONNEL COMMISSION",["signal technicians","key custody"]],
    ["abandoned-switch","An abandoned switch is still routing the eastern formations","No unit admits responsibility because accepting custody also accepts every prior compromise. Field ownership, rolling replacement, and central seizure each make the network legible by changing it.","Which command should inherit an unclaimed dependency?","RELAY RECOVERY SECTION",["abandoned switch","unowned relay"]],
  ]),
  ...group("network","emitter-pattern",[
    ["mobile-radar","A mobile radar pattern is visible and its owner is not","Foreign partners can enrich the track, compartmentation can preserve custody, and unilateral collection can spend time to classify it alone.","Who should be permitted to complete the estimate?","PATTERN ANALYSIS DIRECTORATE",["mobile radar","emitter pattern"]],
    ["ghost-battery","A battery that no observer can locate keeps appearing in the emitter ledger","The signature may be deception, relay leakage, or a foreign track stripped of provenance. Fusion, compartmentation, and national collection assign confidence differently.","Which uncertainty may enter the firing solution?","COUNTERBATTERY FUSION CELL",["ghost battery","unlocated guns"]],
    ["foreign-transponder","A foreign transponder is answering inside the enemy formation","It may be an ally, a captured platform, or a deliberate borrowed identity. Shared intelligence, compartmented verification, and unilateral collection each risk a different diplomatic error.","Whose identity is required before the track becomes a target?","AIR IDENTITY OFFICE",["foreign transponder","identity track"]],
    ["drone-swarm","The drone swarm has one control pattern and no stable airframe count","Partners can correlate it quickly, compartmentation can protect collection methods, and unilateral analysis can preserve custody while the pattern migrates.","Which fact matters more: who controls it, how many exist, or what the source reveals?","UNMANNED PATTERN DESK",["drone swarm","control emitter"]],
  ]),
  ...group("network","coalition-provenance",[
    ["redacted-grid","The coalition grid is precise where its provenance is blank","The estimate is useful because several partners removed the parts they cannot share. Fusion, compartmentation, and repeated challenge each define acceptable ignorance.","How much foreign filtering should enter command truth?","COALITION FUSION CELL",["redacted intelligence","coalition grid"]],
    ["fused-track","A fused track is more confident than any contributing source","Agreement may represent corroboration or one copied error moving through several partners. Broad exchange, compartmented source review, and authentication challenge test different failure modes.","When does consensus become evidence?","ALLIED TRACKING BOARD",["fused track","shared intelligence"]],
    ["source-conflict","Two trusted partners have classified the same movement in opposite ways","Neither can disclose enough provenance to resolve the conflict. Fusion averages it, compartmentation preserves both, and challenge delays action while testing custody.","Which disagreement should remain visible to command?","COALITION SOURCE OFFICE",["source conflict","partner intelligence"]],
    ["delayed-feed","The coalition feed is accurate one operational interval late","It describes the enemy that existed before the current order window. Faster exchange increases dependency, compartmentation preserves source boundaries, and authentication spends more of the remaining time.","How old may truth become before it is only history?","ALLIED DISSEMINATION CELL",["delayed feed","coalition latency"]],
  ]),
  ...group("network","autonomous-cells",[
    ["isolated-brigade","An isolated brigade is acting faster than headquarters can authenticate","Delegated authority restores tempo, central custody preserves coherence, and disposable keys preserve deniability after separation.","How much command may survive separation from command?","FORMATION NETWORK OFFICE",["isolated brigade","local authority"]],
    ["fires-cell","A fires cell has targets, ammunition, and no current permission","The opportunity will expire before the relay is restored. Delegation risks incoherence, central custody accepts delay, and disposable authority permits one act without building a precedent.","Which permission should outlive the connection?","DISTRIBUTED FIRES OFFICE",["fires cell","local targeting"]],
    ["engineer-route","Local engineers have opened a route headquarters still classifies as closed","Their map is current and unauthenticated. Delegated keys can publish it, central custody can verify it too late, and disposable credentials can use it once without making it doctrine.","When may local fact outrank central proof?","ENGINEER NETWORK LIAISON",["local route","engineer cell"]],
    ["local-air-defense","A local air-defense cell has begun assigning its own identities","Autonomy prevents hesitation and increases the cost of misclassification. Central control preserves a common picture; disposable keys constrain authority to the current raid.","Who may declare an aircraft hostile when the network is absent?","AIR DEFENSE AUTHORITY",["local air defense","identification authority"]],
  ]),
  ...group("network","restoration-corridor",[
    ["fiber-vs-shells","One corridor can carry relay fiber or artillery shells, not both","Restoring command consumes the route that could supply the orders it intends to carry. Distribution, transit priority, and deliberate darkness each protect a different dependency.","Which dependency should the corridor relieve?","JOINT ROUTING BOARD",["fiber corridor","shell convoy"]],
    ["batteries-vs-fuel","The relay batteries and the fuel convoy have the same truck allocation","Power restores the network; fuel restores movement. Distributed carriage, supply priority, and dark posture decide whether the army should know, move, or survive interception.","What should the trucks make possible first?","MOTOR TRANSPORT ALLOCATION",["relay batteries","fuel convoy"]],
    ["technicians-vs-replacements","Signal technicians and infantry replacements are waiting for one protected train","The specialists restore conversion; the replacements restore mass. Distributed deployment, transit priority, and radio silence allocate risk between capability and headcount.","Which absence is more dangerous at the active sector?","PERSONNEL ROUTING COMMAND",["signal technicians","replacement train"]],
    ["relays-vs-ambulances","Relay trucks and ambulances require the same cleared road","One restores future coordination; the other removes present casualties. Distribution can divide protection, transit priority can choose, and darkness can preserve both by slowing them.","What should the road return to the army?","MEDICAL-SIGNAL MOVEMENT BOARD",["relay trucks","ambulance route"]],
  ]),
  ...group("network","key-compromise",[
    ["answered-challenge","The enemy has begun answering yesterday's challenges","The compromise is proven. Rolling codes, disposable custody, and compartmented corroboration replace lost trust with speed, memory loss, or foreign dependence.","Which new cost should purchase authentication?","CRYPTOGRAPHIC EMERGENCY OFFICE",["answered challenge","key compromise"]],
    ["stolen-codebook","A stolen codebook remains current because replacement would isolate the front","Continuing it risks imitation; rolling replacement risks silence; disposable custody and foreign corroboration each narrow the exposure differently.","How long may a compromised language remain command?","CODEBOOK REPLACEMENT BOARD",["stolen codebook","compromised codes"]],
    ["technician-defection","A defecting technician knows the next authentication sequence","The claim may be genuine, planted, or already obsolete. Code rotation spends continuity, burn-after-use spends institutional memory, and compartmented allies spend sovereignty to test it.","Which part of the defector's knowledge should command believe?","PERSONNEL SECURITY CELL",["signal defector","authentication leak"]],
    ["captured-terminal","A captured terminal is still receiving authenticated traffic","The machine proves access and may be proving that the enemy wants it found. Rolling codes close the channel, disposable custody exploits it once, and compartmented partners can test it without owning the network.","Should access be closed, spent, or shared?","CAPTURED SYSTEMS OFFICE",["captured terminal","live enemy terminal"]],
  ]),
];

export const SUB_MISSION_FRAMES=[...DOMESTIC_SUB_MISSION_FRAMES,...NETWORK_SUB_MISSION_FRAMES];

const realization=(opening:readonly [string,string],recurrence:readonly [string,string],consequence:readonly [string,string]):SubMissionRealization[]=>[
  {id:"opening",coda:opening[0],questionCoda:opening[1]},
  {id:"recurrence",coda:recurrence[0],questionCoda:recurrence[1]},
  {id:"consequence",coda:consequence[0],questionCoda:consequence[1]},
];

// These are schema-specific temporal overlays. They compose only with frames owned by
// the same archetype, so recurrence changes the authored situation without permitting
// incoherent cross-category fragment mixing.
export const SUB_MISSION_REALIZATIONS:Record<string,SubMissionRealization[]>={
  "induction-overhang":realization(
    ["The backlog is still administrative; no cohort has yet been permanently assigned to waiting.","What capacity should be created before waiting becomes the institution?"],
    ["Earlier expansion moved the queue without eliminating it, and the displaced pressure has returned at a different intake point.","Which earlier assumption should command now abandon?"],
    ["The queue is now changing transport, public health, and civilian labor whether command issues an order or not.","Which consequence may become permanent so the others do not?"],
  ),
  "replacement-standard":realization(
    ["The first deficient drafts can still be corrected by the receiving formations.","Which omission is recoverable after arrival?"],
    ["Receiving units have begun designing around predictable gaps in replacement training.","Should command preserve that adaptation or repair the standard behind it?"],
    ["The omitted instruction is now visible in readiness, maintenance, and casualty conversion.","Which accumulated deficiency must stop compounding today?"],
  ),
  "personnel-flight":realization(
    ["Most absences remain reversible and have not yet become organized opposition.","What should make return easier than disappearance?"],
    ["The routes, households, and brokers supporting absence now understand the state's previous response.","Which learned evasion should policy invalidate?"],
    ["Flight is now outpacing parts of the replacement system and changing deployable force directly.","Which retention cost is cheaper than replacing the missing force?"],
  ),
  "casualty-account":realization(
    ["The discrepancy remains small enough for one authoritative account to recover public trust.","Which record should speak first?"],
    ["Families now compare official language against earlier omissions rather than against silence.","How should the state correct itself without making correction another concealment?"],
    ["The casualty account has become evidence about the government, not only the battlefield.","Which truth must be conceded to preserve authority over the next loss?"],
  ),
  "civil-allocation":realization(
    ["One allocation cycle can still be revised before households and factories reorganize around it.","Which temporary priority deserves the first interval?"],
    ["Local institutions have begun routing around the last central allocation.","Should command formalize that workaround or restore a single sequence?"],
    ["The allocation pattern now determines both production output and the legitimacy available to spend it.","Which system must remain solvent after today's transfer?"],
  ),
  "fiscal-mobilization":realization(
    ["The treasury can still choose among instruments without appearing unable to pay.","Which claimant should carry the first explicit war charge?"],
    ["Markets and households have priced the state's prior method into their behavior.","Which expectation must the next instrument reverse?"],
    ["Financing choices are now changing dependency, production, and domestic tolerance simultaneously.","Which future liability is acceptable to keep the present campaign funded?"],
  ),
  "industrial-labor":realization(
    ["The failure remains preventable if command identifies what the current output figure conceals.","Which concealed cost should be made explicit?"],
    ["Workers and managers have adapted to the last production posture, including its loopholes.","Which adaptation should become policy and which should be broken?"],
    ["Maintenance debt is now converting directly into unavailable equipment and lost output.","What must stop so the industrial system can continue?"],
  ),
  "service-bargain":realization(
    ["The new obligation has not yet become part of household planning or organized resistance.","Which bargain can still be explained before it is enforced?"],
    ["Citizens are comparing this levy with the exceptions created by the last one.","Which inconsistency should command now own?"],
    ["The service rule is now altering intake, legitimacy, resistance, and industrial labor together.","Which constituency may be spent to preserve replacement depth?"],
  ),
  "ration-fracture":realization(
    ["The distribution split is visible but has not yet hardened into separate markets.","Which principle should govern the first correction?"],
    ["Households now plan around the exceptions and enforcement patterns created earlier.","Which learned workaround should remain legal?"],
    ["Scarcity has become a political boundary as well as a material one.","Which population must still believe the next ration promise?"],
  ),
  "factory-junction":realization(
    ["The first deferred load can still move in the following production interval.","Which delay remains recoverable?"],
    ["Factories have begun producing around the transport priority command chose previously.","Which improvised production sequence should the railway now recognize?"],
    ["Repeated deferral has converted one marginal train into a structural armament shortage.","Which capability should command stop pretending will arrive later?"],
  ),
  "household-arrears":realization(
    ["The missed obligation can still be described as delay rather than policy.","Which payment restores the original bargain most directly?"],
    ["Households now discount official promises by the state's prior payment behavior.","Which promise can still purchase belief?"],
    ["Arrears are now appearing in enlistment, retention, rent, and survivor claims at once.","Which liability must be funded before it becomes a force-generation loss?"],
  ),
  "continuity-threshold":realization(
    ["Institutional disagreement remains containable inside ordinary authority.","Which institution should receive the first concession?"],
    ["Local authorities are treating the previous emergency response as precedent.","Which precedent should be ratified and which should be ended?"],
    ["The next shock may decide which parts of the state remain capable of issuing credible orders.","What must survive even if central control does not?"],
  ),
  "relay-compromise":realization(
    ["The enemy's access remains suspected rather than demonstrated, preserving several safe interpretations.","Which uncertainty should the first posture exploit?"],
    ["The opponent has now observed how the network responded to the prior compromise.","Which recognizable pattern must disappear?"],
    ["Compromise is affecting force conversion and enemy classification at the active sector.","Which network property is worth exposing to restore command?"],
  ),
  "authentication-drift":realization(
    ["The authentication delay is still shorter than most operational windows.","Which messages justify changing the rule first?"],
    ["Formations have begun anticipating which valid orders the authentication system will delay.","Should that local anticipation become delegated authority?"],
    ["Proof is now consuming enough time to alter execution confidence directly.","Which trust cost is cheaper than another obsolete order?"],
  ),
  "courier-loss":realization(
    ["Alternative routes remain available and the first missing dispatch has not been exploited.","Where should the next copy enter custody?"],
    ["Enemy fires and checkpoints have adapted to the routes used after the previous loss.","Which part of the courier pattern should change?"],
    ["Physical message loss is now fragmenting plan versions across the front.","What must remain common when delivery cannot?"],
  ),
  "spectrum-saturation":realization(
    ["Interference is degrading clarity without yet preventing command.","Which traffic deserves the cleanest first channel?"],
    ["The enemy and friendly formations have both adapted to the last spectrum allocation.","Which recognizable rhythm should command now break?"],
    ["Spectrum use is now changing enemy classification, order latency, and drone control simultaneously.","Which function may be degraded so the network remains governable?"],
  ),
  "false-order":realization(
    ["The contradiction is isolated enough to test without suspending the whole command chain.","Which proof should adjudicate the first conflict?"],
    ["Recipients now know that a formally valid message may be hostile or obsolete.","How much local doubt should command authorize?"],
    ["Provenance failure is now reducing obedience to authentic orders at the active sector.","Which authority must be restored before syntax becomes meaningful again?"],
  ),
  "archive-latency":realization(
    ["The archive and field record differ by one recoverable revision.","Which copy should govern until reconciliation?"],
    ["Staff branches now plan around the delay between official and executable truth.","Should that workaround become a formal distribution rule?"],
    ["Version drift is now producing incompatible operations rather than merely incomplete records.","Which history may be discarded to restore one present plan?"],
  ),
  "relay-custody":realization(
    ["Ownership is disputed, but the relay still answers one recognizable chain of technicians.","Who should accept the first accountable custody?"],
    ["Every claimant has adapted keys and procedures around the unresolved ownership dispute.","Which shadow custody should be made official?"],
    ["The relay's legal and technical owners now produce different operational realities.","Which ownership must yield so the network can become authoritative?"],
  ),
  "emitter-pattern":realization(
    ["The track is suggestive enough to investigate and uncertain enough to withhold from action.","Which source should improve it first?"],
    ["The pattern has survived prior collection and may now include deliberate enemy shaping.","Which earlier inference should be retested?"],
    ["The unresolved emitter now changes force estimates and targeting confidence at the active sector.","Which uncertainty can the next operation afford to carry?"],
  ),
  "coalition-provenance":realization(
    ["The shared estimate can still be separated into its contributing claims.","Which source boundary should the first decision preserve?"],
    ["Partners have adjusted what they share in response to the last use of coalition intelligence.","Which omission is itself now evidence?"],
    ["Foreign filtering is now changing dependency and the enemy estimate used for local force ratio.","Which sovereign uncertainty is worth a more accurate picture?"],
  ),
  "autonomous-cells":realization(
    ["Local action remains exceptional and can still be bounded to one operational window.","Which authority may be delegated without becoming doctrine?"],
    ["Separated cells have begun interpreting earlier delegation as a standing mandate.","Which local initiative should command ratify or revoke?"],
    ["Autonomous decisions are now shaping the campaign faster than central command can reconstruct them.","Which part of coherence may be sacrificed to retain tempo?"],
  ),
  "restoration-corridor":realization(
    ["One protected movement can still restore either command or supply before both become critical.","Which first delivery prevents the second shortage?"],
    ["The route has acquired enemy attention and institutional claimants since its previous use.","Which prior priority should now be reversed?"],
    ["Command restoration and material delivery are now mutually limiting the operation at the active sector.","Which dependency should remain unsatisfied tonight?"],
  ),
  "key-compromise":realization(
    ["The compromised credential can still be isolated without replacing the entire command language.","Which trust boundary should close first?"],
    ["The enemy has had time to study the replacement behavior triggered by the earlier compromise.","Which recovery pattern must not repeat?"],
    ["Key failure is now reducing confidence in valid traffic across multiple formations.","Which part of continuity should be burned to restore belief?"],
  ),
};

export const framesForArchetype=(archetypeId:string)=>SUB_MISSION_FRAMES.filter(frame=>frame.archetypeId===archetypeId);

export const realizationsForArchetype=(archetypeId:string)=>SUB_MISSION_REALIZATIONS[archetypeId]??[];

export const subMissionFrameById=(frameId:string)=>SUB_MISSION_FRAMES.find(frame=>frame.id===frameId);

export const auditSubMissionContent=()=>({
  domesticFrames:DOMESTIC_SUB_MISSION_FRAMES.length,
  networkFrames:NETWORK_SUB_MISSION_FRAMES.length,
  totalFrames:SUB_MISSION_FRAMES.length,
  archetypes:[...new Set(SUB_MISSION_FRAMES.map(frame=>frame.archetypeId))].length,
  realizationLayers:Object.values(SUB_MISSION_REALIZATIONS).reduce((sum,items)=>sum+items.length,0),
  compiledVariants:SUB_MISSION_FRAMES.reduce((sum,frame)=>sum+(SUB_MISSION_REALIZATIONS[frame.archetypeId]?.length??0),0),
});
