import { FAMILIES, GameState, MANEUVERS, situationForState } from "../game";
import type { AvaEntity } from "./schema";

const metric=(id:string,label:string,aliases:string[]=[]):AvaEntity=>({id,kind:"metric",label,aliases});

export const AVA_METRICS:AvaEntity[]=[
  metric("population","Population",["people","civil population"]),
  metric("armed","Armed Forces",["army","total force","soldiers"]),
  metric("enlistment","Enlistment",["recruitment","intake"]),
  metric("training","Training Pipeline",["training queue","graduates","training capacity"]),
  metric("readiness","Readiness",["soldier readiness","combat readiness"]),
  metric("equipment","Equipment Coverage",["equipment","serviceable equipment"]),
  metric("materiel","Materiel Condition",["maintenance","industrial condition"]),
  metric("treasury","Treasury",["money","fiscal capacity"]),
  metric("legitimacy","Legitimacy",["public support","governability"]),
  metric("resistance","Resistance",["domestic resistance","noncompliance"]),
  metric("front","Campaign Front",["front line","ground movement"]),
  metric("desertion","Desertion",["net flight","deserters"]),
  metric("doctrine","Doctrine",["insight","insight points"]),
  metric("intelligence","Intelligence",["classification","enemy intelligence"]),
  metric("supply","Supply",["supply access","coverage","munitions coverage"]),
  metric("terrain","Terrain",["terrain type"]),
  metric("ground","Ground",["ground state","ground condition"]),
  metric("network","Network",["communications","command network"]),
];

export const avaEntitiesForState=(state:GameState):AvaEntity[]=>{
  const authorized=new Set(situationForState(state).maneuvers);
  const maneuvers=MANEUVERS.filter(item=>authorized.has(item.id)).map<AvaEntity>(item=>({id:item.id,kind:"maneuver",label:item.label,aliases:[item.vector]}));
  const directives=FAMILIES.flatMap(family=>family.choices.map<AvaEntity>(choice=>({id:choice.id,kind:"directive",label:choice.label,aliases:[`${family.label} ${choice.label}`],parentId:family.id})));
  return[...AVA_METRICS,...maneuvers,...directives];
};
