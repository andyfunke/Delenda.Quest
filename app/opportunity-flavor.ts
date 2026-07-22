export type OpportunityResponseFlavor = {
  primary: string;
  alternate: string;
};

// Every authored situation owns its response language. These are not templates:
// the immediate action and the preserving action are written for the exact scene.
export const OPPORTUNITY_RESPONSE_FLAVOR: Record<
  string,
  OpportunityResponseFlavor
> = {
  "culvert-listener": {
    primary:
      "Splice the culvert pair under rain cover and drain the corps traffic before patrols move.",
    alternate:
      "Leave the signal untouched, shadow its maintainers, and find the relay that makes the leak valuable.",
  },
  "tram-spotter": {
    primary:
      "Transmit the conductor's full battery sequence now and let counterfire greet each gun in order.",
    alternate:
      "Keep her aboard for one more circuit, confirming relocations before the avenue realizes it is observed.",
  },
  "medic-courtyard": {
    primary:
      "Fight a litter team into the courtyard and recover both surveyors with their living interpretation.",
    alternate:
      "Transmit the grid immediately, preserving the target even if the wounded cannot be moved.",
  },
  "tanker-service-lane": {
    primary:
      "Keep the disabled tank in place and turn its surviving optic into a reserve warning post.",
    alternate:
      "Withdraw the crew and optic before counterfire arrives, preserving trained eyes for another hull.",
  },
  "sapper-unfired-ring": {
    primary:
      "Cut enemy firing control, splice our initiator, and reserve the bridge demolition for their crossing.",
    alternate:
      "Disarm the ring intact and move its charges into our engineering reserve before they remember it.",
  },
  "weather-clerk": {
    primary:
      "Release the twelve-minute window without committee delay and strike aircraft still exposed on the apron.",
    alternate:
      "Hold fire, watch the dispersal, and learn which shelters protect the machines command values most.",
  },
  "railwayman-chalk": {
    primary:
      "Throw the junction points and deliver the marked ammunition cars into friendly custody before separation.",
    alternate:
      "Mark both successor trains, sacrifice the easy seizure, and expose the supply branches they feed.",
  },
  "telephone-girl": {
    primary:
      "Join the waiting headquarters calls and record the command relationship before the exchange is traced.",
    alternate:
      "Keep the callers separated, log their rhythm, and map the staff network without announcing penetration.",
  },
  "drone-repairer": {
    primary:
      "Answer the recovery beacon with the captured transponder and pull its handlers into a prepared kill zone.",
    alternate:
      "Copy the authentication burst, preserve the beacon, and enter future recoveries as a trusted machine.",
  },
  "undertaker-route": {
    primary:
      "Hide two scouts in the empty return compartment and carry them through every checkpoint before curfew.",
    alternate:
      "Keep the cart innocent, record each relief, and preserve the route for the archive movement.",
  },
  "troyes-roundhouse": {
    primary:
      "Score six main bearings during one inspection cycle and let ordinary lubrication finish the locomotives.",
    alternate:
      "Poison the repair inventory instead, turning every replacement bearing into a delayed second failure.",
  },
  "lockkeeper-spillway": {
    primary:
      "Open the waste sluice between convoys and leave the next fuel barges resting on mud.",
    alternate:
      "Falsify depth gauges across the reach, preserving access while teaching every pilot the wrong canal.",
  },
  "repeater-coal-box": {
    primary:
      "Ignite the disguised repeater at battery change and cut three corps circuits with one cabinet.",
    alternate:
      "Install the faulty bank, preserving the disguise while intermittent failures corrupt every headquarters diagnosis.",
  },
  "nitration-batch": {
    primary:
      "Shift the stabilizer ratio inside the believable margin and condemn a week of propellant safely.",
    alternate:
      "Force a plant-wide retest, freezing output while the laboratory remains useful for another intervention.",
  },
  "ferry-governor": {
    primary:
      "Set the governor to seize only beneath armor, stranding the load where recovery cannot hide it.",
    alternate:
      "Misalign the vehicle deck, preserving the ferry while making every heavy crossing slow, dangerous, and scarce.",
  },
  "yard-clerk-red-card": {
    primary:
      "Authenticate the western diversion and send the siege train through delay, ambush country, and doubt.",
    alternate:
      "Separate escort orders from cargo orders, preserving the train as bait while its protection goes elsewhere.",
  },
  "mine-cage-brake": {
    primary:
      "Fuse the uninspected relay open and arrest tungsten movement without entombing the workers below.",
    alternate:
      "Destroy the control drawings, leaving the hoist repairable only by knowledge the occupation no longer possesses.",
  },
  "harbor-clock": {
    primary:
      "Launch through the seven-minute disagreement and strike the harbor boom before either watch owns the error.",
    alternate:
      "Sever boom control instead, preserving the boat while trapping harbor traffic inside its own schedule.",
  },
  "printing-press-gears": {
    primary:
      "Feed abrasive paste into the numbering press and halt authenticated movement orders for the day.",
    alternate:
      "Steal the unused serial blocks, preserving production while giving our forgeries the state's own sequence.",
  },
  "snowplow-pins": {
    primary:
      "Fit brittle shear pins before the storm and let the first buried drift close the pass.",
    alternate:
      "Drain both heated reservoirs, preserving the sabotage as weather damage and extending the blockage beyond repair.",
  },
  "schoolmaster-cells": {
    primary:
      "Supply radios, stipends, and strict limits, turning the attendance book into a disciplined courier service.",
    alternate:
      "Arm three villages for local defense, accepting a visible auxiliary and the political claim it creates.",
  },
  "smugglers-tide": {
    primary:
      "Contract seven captains as a coastal screen, paying for sightings without putting uniforms on their decks.",
    alternate:
      "Supply fuel and charges for maritime raids, trading quiet observation for damage the coast cannot ignore.",
  },
  "quarrymen-charges": {
    primary:
      "Fund legal blasting crews to close selected road cuts, then move their families before reprisals begin.",
    alternate:
      "Train the quarrymen as a mobile demolition auxiliary, gaining repeatable destruction at the cost of deniability.",
  },
  "dockers-slowdown": {
    primary:
      "Finance staggered safety stoppages, bleeding port throughput without giving police a single strike to crush.",
    alternate:
      "Recruit callers and tallymen into a port intelligence cell while the whistles continue masking their meetings.",
  },
  "border-shepherds": {
    primary:
      "Pay ridge families for patrol reports and guides, leaving their routes outside formal military command.",
    alternate:
      "Build a covert supply line through their crossings, risking the neutrality that currently keeps them invisible.",
  },
  "diaspora-radio": {
    primary:
      "Open the coded music channel and use sparse phrases to synchronize resistance without naming it.",
    alternate:
      "Recruit broadcasters and listeners into a political network, accepting greater reach and a larger betrayal surface.",
  },
  "dismissed-police": {
    primary:
      "Restore the detectives as a counter-network and let their old casework identify occupation informants.",
    alternate:
      "Arm selected officers for urban action, creating immediate pressure and a postwar claimant with weapons.",
  },
  "mountain-club": {
    primary:
      "Retain the club for high-country reconnaissance, using huts and route cards without violating its limits.",
    alternate:
      "Convert rescue huts into escape stations, preserving neutrality in public while moving fugitives in silence.",
  },
  "refugee-post": {
    primary:
      "Fund the midwives' courier chain and formalize secure passage without putting uniforms inside the camps.",
    alternate:
      "Use their crossings to map collaborator recruitment, preserving the humanitarian route until the network is understood.",
  },
  "prison-break-veterans": {
    primary:
      "Arm the twenty escapees around quarry knowledge and create a force search parties cannot easily corner.",
    alternate:
      "Send them back for prisoner exfiltration, preserving political control while converting memory into repeated recoveries.",
  },
  "bridging-train": {
    primary:
      "Drive the intact bridging train across our line before the crews recover from the air alarm.",
    alternate:
      "Strip workshop tools and recovery gear first, accepting lost pontoons to preserve what repairs future crossings.",
  },
  "recon-drone-orchard": {
    primary:
      "Recover the camera core before the patrol arrives and turn its last flight into our reconnaissance.",
    alternate:
      "Leave the wreck as bait, convert its beacon into a sensor, and count every recovery patrol.",
  },
  "bogged-tank": {
    primary:
      "Haul the tank from peat before dawn and make the enemy explain its newest machine to us.",
    alternate:
      "Remove gun and optics, abandoning the hull so tractors and roads remain available for living formations.",
  },
  "pontoon-drift": {
    primary:
      "Ground the complete park on our bank before enemy recovery boats enter the floodwater.",
    alternate:
      "Take powered sections only, sinking the rest before speed becomes greed and greed becomes encirclement.",
  },
  "cipher-truck": {
    primary:
      "Seize the live keying equipment before the burn detail arrives and read what command still trusts.",
    alternate:
      "Photograph the safe, leave the truck, and preserve uncertainty about whether the route was compromised.",
  },
  "shell-railcar": {
    primary:
      "Switch the unclaimed ammunition car into friendly custody before afternoon inventory gives it an owner.",
    alternate:
      "Replace shells with ballast and return the wagon, converting one theft into a future artillery failure.",
  },
  "hospital-generators": {
    primary:
      "Recover all three power trailers and restore surgical electricity where the next casualties will arrive.",
    alternate:
      "Strip regulators and sterile cable, abandoning weight so the essential parts cross the line before pursuit.",
  },
  "radar-van": {
    primary:
      "Take the processing rack under its own test transmission and withdraw before the crew climbs back.",
    alternate:
      "Copy the waveform library, leave the van apparently untouched, and preserve access to its future emissions.",
  },
  "fuel-bladders": {
    primary:
      "Seize pumps, bladders, and fuel inside the thirty-eight-minute gap, then deny the receiving unit its advance.",
    alternate:
      "Poison the filters and take the pumps, leaving bulk fuel to destroy the engines that trust it.",
  },
  "workshop-barge": {
    primary:
      "Bring the entire repair barge across tonight, accepting pursuit to acquire a workshop that moves with the front.",
    alternate:
      "Extract defecting crew and critical tools, leaving the hull so skills survive even if steel does not.",
  },
  "load-dispatcher": {
    primary:
      "Shift civilian demand clear, trip the military feeder, and make overload carry the blame.",
    alternate:
      "Preserve the feeder, map every emergency switch, and learn how the rail district repairs darkness.",
  },
  "turbine-bearing": {
    primary:
      "Withhold bearing oil after the arsenal shift begins and let controlled heat stop its only turbine.",
    alternate:
      "Force an emergency inspection instead, exposing spares, specialists, and bypasses before choosing what to break.",
  },
  "substation-relay": {
    primary:
      "Install the altered relay and wait for the next surge to detach air defense from power.",
    alternate:
      "Copy every protection setting, preserving the unsealed access for a later and broader grid failure.",
  },
  "coal-conveyor": {
    primary:
      "Fit the cracked coupling at lunch and stop both military boilers without touching civilian steam.",
    alternate:
      "Seed fragments into the crusher, preserving the coupling while spreading damage through the boiler feed.",
  },
  "penstock-gate": {
    primary:
      "Place charges at the military intake and break the turbine where water conceals the method.",
    alternate:
      "Instrument the load cycle for a week, preserving access while charting when the arsenal cannot tolerate interruption.",
  },
  "compressor-station": {
    primary:
      "Remove the sole controller during the picnic and leave the front's gas pressure without a governor.",
    alternate:
      "Corrupt its calibration table, preserving the hardware while making every repair reproduce the fault.",
  },
  "district-heating": {
    primary:
      "Close both basement valves and freeze the bunker while surrounding homes remain warm enough to watch.",
    alternate:
      "Mark the buried service tunnel, preserving the bypass as an unseen approach into command's foundations.",
  },
  "black-start-diesel": {
    primary:
      "Bleed the starting-air bottles and make the next blackout permanent inside the military district.",
    alternate:
      "Replace the governor spring, preserving apparent readiness until the machine fails under restart demand.",
  },
  "transformer-oil": {
    primary:
      "Substitute the contaminated sample and imprison the reserve transformer behind its own safety regulations.",
    alternate:
      "Track the transformer relocation, preserving the courier channel while revealing the grid's true emergency center.",
  },
  "pylon-survey": {
    primary:
      "Cut the stressed footing and let the next high wind drop the military transmission line.",
    alternate:
      "Follow the repair convoy, preserving the pylon long enough to expose depots, bypasses, and trained crews.",
  },
  "ration-ledger": {
    primary:
      "Publish every duplicate ration entry before the budget vote and make the cabinet defend its favored mouths.",
    alternate:
      "Offer silence to the official who identifies the diversion chain and its political beneficiaries.",
  },
  "casualty-printer": {
    primary:
      "Cut and distribute the suppressed rolls through veterans offices before the ministry can renumber the dead.",
    alternate:
      "Send the numbering sequence to selected governors and let provincial records expose the national omission.",
  },
  "price-decree": {
    primary:
      "Publish both sealed decrees together and force the ministries to betray either cities or farms.",
    alternate:
      "Deliver each decree to its natural enemy, then record which faction moves first.",
  },
  "governors-wire": {
    primary:
      "Supply the governors with secure coordination and turn provincial resistance into a bargaining bloc.",
    alternate:
      "Keep the wire open, identify every participant, and delay contact until the coalition reveals its price.",
  },
  "factory-council": {
    primary:
      "Fund timed safety stoppages at critical machines, denying output without presenting the state a single strike.",
    alternate:
      "Recruit ballot inspectors as production sources and map which workshops can be slowed without exposure.",
  },
  "newsreel-can": {
    primary:
      "Screen the retreat footage across trusted cinemas before the victory bulletin can establish another usable lie.",
    alternate:
      "Release selected frames tying the rout to the war minister while preserving the projectionist and full reel.",
  },
  "synod-letter": {
    primary:
      "Secure the remaining signature and circulate the condemnation through parish channels before conscription officers arrive.",
    alternate:
      "Seed unsigned copies through rural clergy, measuring compliance shifts while the archive remains deniable.",
  },
  "bond-auction": {
    primary:
      "Publish the true subscription book and force the treasury to admit who actually bought the war.",
    alternate:
      "Show separate creditor blocs different pages, then exchange their panic for concessions and names.",
  },
  "port-tariff": {
    primary:
      "Release the tariff schedule to neutral insurers and make priority passage too costly to conceal.",
    alternate:
      "Offer the port continued silence for guaranteed transit slots, manifests, and inspection access.",
  },
  "mayors-petition": {
    primary:
      "Contact the forty-two signatories, secure their communications, and convert a rejected petition into coordinated opposition.",
    alternate:
      "Warn each mayor before arrests begin, then map the security teams revealed by the sweep.",
  },
  "governor-motorcade": {
    primary:
      "Hold cross traffic, seal the printing house exits, and strike the governor at the repeated turn.",
    alternate:
      "Place the tracker during the slowdown and follow the motorcade to its continuity shelter.",
  },
  "finance-wedding": {
    primary:
      "Isolate the private dining room and remove the commissioner before his brokers can scatter.",
    alternate:
      "Wire the room, record every pledge, and preserve the guest list as a map of war finance.",
  },
  "broadcast-balcony": {
    primary:
      "Trap the broadcast director on the service stair and terminate the voice coordinating mobilization denial.",
    alternate:
      "Seize the transmitter long enough to broadcast false assembly orders under the director's authenticated cadence.",
  },
  "minister-vent": {
    primary:
      "Place the charge at the ministerial intake and accept attribution as the price of removing armaments command.",
    alternate:
      "Mount an acoustic pickup in the intake, preserve the maintenance cover, and record cabinet production disputes.",
  },
  "party-secretary-clinic": {
    primary:
      "Take the secretary before the clinic sweep and fracture the party machinery that enforces mobilization.",
    alternate:
      "Copy the appointments, release the patient untouched, and build the security pattern around each weekly visit.",
  },
  "procurement-inspection": {
    primary:
      "Trigger the drill, lock the fire doors, and collapse procurement leadership inside its own safety procedure.",
    alternate:
      "Lift the briefcase during isolation, then release the delegation before security understands what was taken.",
  },
  "occupation-mayor-rail": {
    primary:
      "Stop the dining car inside the tunnel and seize the mayor before his forward guard can reverse.",
    alternate:
      "Photograph the traveling archive at dinner, restore every seal, and leave the continuity chain ignorant.",
  },
  "chief-censor-premiere": {
    primary:
      "Raise the service lift, remove the censor in his private box, and let foreign witnesses carry the consequence.",
    alternate:
      "Place the banned reel in his possession and preserve the machinery room as an unexposed route.",
  },
  "militia-patron-funeral": {
    primary:
      "Take the patron alive beyond the chapel gate and extract the payrolls binding three militias.",
    alternate:
      "Mark every paymaster leaving the burial and follow the money until rival commands share one address.",
  },
  "cabinet-courier-villa": {
    primary:
      "Seize the courier with the succession orders intact and deny the cabinet its prepared continuity.",
    alternate:
      "Copy the seals and instructions overnight, return the bag, and let the succession chain remain compromised.",
  },
  "pad-reuse": {
    primary:
      "Read both exposed messages immediately and act before the stations receive a corrected key schedule.",
    alternate:
      "Preserve the reused pad, catalogue traffic rhythms, and wait until the larger command network declares itself.",
  },
  "dead-drop-milk": {
    primary:
      "Replace the bottle with a controlled report that turns the hospital route against its handlers.",
    alternate:
      "Shadow the receiving officer from the rented room and expose every stop beyond the laboratory gate.",
  },
  "inspection-stamps": {
    primary:
      "Intercept the stamped crate, arrest the linked saboteurs, and close all six maintenance breaches at once.",
    alternate:
      "Let the crate travel under surveillance until the controller reveals the cell's full supply chain.",
  },
  "biometric-cache": {
    primary:
      "Open the command annex before reconciliation and remove the records the cached officer was trusted to protect.",
    alternate:
      "Probe each shared facility with the cached identity and map the common security authority before it expires.",
  },
  "paymaster-ledger": {
    primary:
      "Freeze the identified accounts and arrest paid agents simultaneously before the decimal trail can be corrected.",
    alternate:
      "Continue the payments under control, then follow the acknowledgments backward to the national controller.",
  },
  "direction-finder-gap": {
    primary:
      "Use the eleven-minute blind interval to transmit the complete agent rollup without exposing the courier net.",
    alternate:
      "Plant a disciplined false headquarters during the gap and make enemy direction finding validate the deception.",
  },
  "mailbag-ash": {
    primary:
      "Rebuild the censorship network from routing slips and remove its officers before postal patterns change.",
    alternate:
      "Feed marked letters through the surviving chain and identify every censor, collector, and recipient by reaction.",
  },
  "hotel-register": {
    primary:
      "Detain the liaison delegation simultaneously, using the carbon register to prevent any room from warning another.",
    alternate:
      "Exploit the room pairings as a relationship map while the hotel and clerk remain untouched.",
  },
  "false-deserter": {
    primary:
      "Send the deserter back with a controlled signal and take the handler when the sunset contact opens.",
    alternate:
      "Isolate the password office, replace tomorrow's challenge, and watch who tries to use the compromised version.",
  },
  "camera-clock": {
    primary:
      "Seize the repair register before closing and identify the sabotage photographer from the seventeen-minute error.",
    alternate:
      "Watch the shop, preserve the clock defect, and follow the photographer to the next target team.",
  },
  "downed-observer": {
    primary:
      "Drive the recovery across the closing floodplain and bring back the observer with his counted batteries.",
    alternate:
      "Receive the grid by authenticated burst, then leave the observer concealed until water defeats the search.",
  },
  "surveyors-chimney": {
    primary:
      "Enter through the kiln works, extract all three surveyors, and preserve the instrument that fixed the junction.",
    alternate:
      "Leave the team concealed and withdraw the survey book through the chimney route before the dogs close.",
  },
  "partisan-courier": {
    primary:
      "Insert the courier into the scheduled prisoner transfer and move every memorized name beyond interrogation range.",
    alternate:
      "Break checkpoint attention elsewhere, burn the compromised route, and withdraw the courier through the confusion.",
  },
  "wounded-listener": {
    primary:
      "Carry the operator and recorder together; without his judgment, the captured net becomes enemy-written fiction.",
    alternate:
      "Transmit his authentication notes first, then decide whether flesh or recorder survives the closing search.",
  },
  "escaped-aircrew": {
    primary:
      "Open the full escape line, move all four aircrew, and deliver their missile-site sketches to campaign intelligence.",
    alternate:
      "Send the sketches with one trusted courier while the aircrew remain buried beneath the orchard system.",
  },
  "harbor-diver": {
    primary:
      "Force the boom with the fishing launch and recover the diver before his tracker betrays both networks.",
    alternate:
      "Send the diver through the intake tunnel, abandoning the tracker before its battery announces the command ship.",
  },
  "dam-engineer": {
    primary:
      "Drive an armored launch into the gatehouse and recover the engineer before scouts seize the flood controls.",
    alternate:
      "Hold the gatehouse with the engineer until the withdrawal clears, then surrender the machinery to the enemy.",
  },
  "sniper-pair": {
    primary:
      "Lift the pair from the tower roof before the search reaches their final stair.",
    alternate:
      "Authorize the staff shot, preserve observation until impact, then withdraw through the building as the search reorganizes.",
  },
  "interpreter-bus": {
    primary:
      "Take the interpreter through the front door during the agent's two-minute custody of the bus.",
    alternate:
      "Transmit her identifications before the rear search reaches her seat, preserving the bus route if possible.",
  },
  "demolition-team-quarry": {
    primary:
      "Run the quarry conveyor under search patrols and extract all five specialists with their remaining charges.",
    alternate:
      "Cache the explosives in separated lots and send each operator out alone through civilian routes.",
  },
  "ghost-battalion": {
    primary:
      "Erase the fictitious battalion, stop its allotments, and recover the transport priority consumed by dead names.",
    alternate:
      "Keep the payroll alive under audit and follow every false soldier to the offices drawing his share.",
  },
  "liaison-desks": {
    primary:
      "Collapse seven relay desks into one fires cell empowered to answer before the target moves.",
    alternate:
      "Place a forward authority team beside the guns and bypass the ministries without formally abolishing them.",
  },
  "shell-inspectors": {
    primary:
      "Give the master inspector final liability and release every serviceable shell from the redundant queue today.",
    alternate:
      "Send mobile inspection teams to depots and move acceptance forward until paperwork can no longer outpace ammunition.",
  },
  "rail-priority-board": {
    primary:
      "Revoke competing warrants and give theater command final priority over every military train.",
    alternate:
      "Publish one national schedule, expose every ceremonial obstruction, and make each ministry defend its delay openly.",
  },
  "officer-replacement": {
    primary:
      "Relieve the colonel before a fourth formation pays for patronage with men and ground.",
    alternate:
      "Send the signed failures to Personnel Command and remove every sponsor who kept him untouchable.",
  },
  "casualty-notices": {
    primary:
      "Build municipal casualty teams, use current local addresses, and clear the notices before payroll reveals another death.",
    alternate:
      "Join pay and notification records so no family learns a death from stopped money again.",
  },
  "procurement-twins": {
    primary:
      "Place all aircraft purchasing under one authority and cancel the contract that exists only to divide accountability.",
    alternate:
      "Seize the duplicate advance before sponsors can move it, then audit every directorate that approved both contracts.",
  },
  "signal-roster": {
    primary:
      "Centralize the operators under theater authority and move them from empty offices to failing frontline circuits.",
    alternate:
      "Form mobile relay detachments, rotate them by network failure, and leave headquarters to guard their own desks.",
  },
  "reserve-depot": {
    primary:
      "Break the seal, issue serviceable vehicles and radios now, and make the current battle consume the future reserve.",
    alternate:
      "Remove the depot command staff, preserve the reserve books, and reopen requisitions under field authority.",
  },
  "translation-bureau": {
    primary:
      "Reassign senior linguists from ceremonial speeches and clear battlefield intercepts before their intelligence dies unread.",
    alternate:
      "Attach linguists directly to operations cells and make each translation answer an active command question.",
  },
};
