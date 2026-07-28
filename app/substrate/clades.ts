import type { Channel } from "./gates";

export const cladeIdForCategory = (channel: Channel, category: string) => {
  const slug = category
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `${channel}-clade-${slug}`;
};

/** Military clade categories used for strategic-diversity slot selection. */
export const militaryCladeCategory = (cladeId: string) => {
  if (cladeId.includes("force-generation")) return "force-generation";
  if (cladeId.includes("training")) return "training";
  if (cladeId.includes("operations")) return "operations";
  if (cladeId.includes("personnel")) return "personnel";
  if (cladeId.includes("command-network") || cladeId.includes("network")) {
    return "command-network";
  }
  if (cladeId.includes("equipment") || cladeId.includes("procurement") || cladeId.includes("sustainment")) {
    return "materiel";
  }
  return "general";
};
