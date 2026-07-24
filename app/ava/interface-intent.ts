export type AvaInterfaceIntent = "switch" | "confirm" | null;

const NORMALIZE = /[^\p{L}\p{N}]+/gu;
const EXPLICIT_SWITCH =
  /^(?:(?:please|ava)\s+)*(?:toggle|change|switch|swap)\s+(?:the\s+)?(?:ui|ux|interface|graphical interface)(?:\s+(?:please|ava))?$|^(?:(?:please|ava)\s+)*alternate\s+(?:ui|ux|interface)(?:\s+(?:please|ava))?$/;

export const avaInterfaceIntent = (input: string): AvaInterfaceIntent => {
  const normalized = input
    .toLocaleLowerCase("en-US")
    .replace(NORMALIZE, " ")
    .trim()
    .replace(/\s+/g, " ");
  if (EXPLICIT_SWITCH.test(normalized)) return "switch";
  if (/\b(?:ui|ux)\b/.test(normalized)) return "confirm";
  return null;
};

