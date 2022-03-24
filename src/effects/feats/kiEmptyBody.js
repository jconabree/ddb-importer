import { baseFeatEffect } from "../specialFeats.js";
import { generateMacroChange, generateItemMacroFlag, loadMacroFile } from "../macros.js";

export async function kiEmptyBodyEffect(document) {
  let effect = baseFeatEffect(document, document.name);
  effect.changes.push(
    { key: "data.traits.dr.all", value: "", mode: CONST.ACTIVE_EFFECT_MODES.CUSTOM, priority: 0 },
    { key: "data.traits.dv.value", value: "force", mode: CONST.ACTIVE_EFFECT_MODES.CUSTOM, priority: 0 }
  );

  document.system["target"]["type"] = "self";
  document.system.range = { value: null, units: "self", long: null };
  document.system.duration = { value: 1, units: "min" };
  document.system.actionType = null;
  const itemMacroText = await loadMacroFile("spell", "invisibility.js");
  document.flags["itemacro"] = generateItemMacroFlag(document, itemMacroText);
  effect.changes.push(generateMacroChange("", 0));

  document.effects.push(effect);
  return document;
}
