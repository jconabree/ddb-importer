

import { addStatusEffectChange } from "../effects.js";
import { baseFeatEffect } from "../specialFeats.js";

export function dauntingRoarEffect(document) {
  const effect = baseFeatEffect(document, document.name);
  addStatusEffectChange(effect, "Frightened", 20, true);
  setProperty(effect, "flags.dae.specialDuration", ["turnEndSource", "endCombat"]);
  effect.duration.seconds = 12;
  effect.duration.turns = 2;

  document.effects.push(effect);
  // document.system.range = { value: null, units: "spec", long: null };
  // document.system.target = { value: 10, width: null, units: "ft", type: "enemy" };
  // document.system.activation.condition = "!target.effects.some((e) => e.name.toLowerCase().includes('deafened'))";

  setProperty(document.flags, "midi-qol.effectActivation", true);

  setProperty(document, "flags.midi-qol.itemCondition", "");
  setProperty(document, "flags.midi-qol.effectCondition", "!target.effects.some((e) => e.name.toLowerCase().includes('deafened'))");
  setProperty(document, "flags.midi-qol.AoETargetType", "enemy");
  setProperty(document, "flags.midi-qol.AoETargetTypeIncludeSelf", false);

  return document;
}
