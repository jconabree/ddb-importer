import { addStatusEffectChange } from "../effects.js";
import { baseSpellEffect } from "../specialSpells.js";

export async function greaterInvisibilityEffect(document) {
  let effect = baseSpellEffect(document, document.name);
  addStatusEffectChange({ effect, statusName: "Invisible" });
  document.effects.push(effect);

  return document;
}
