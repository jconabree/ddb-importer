export function thunderclapEffect(document) {
  setProperty(document, "flags.midi-qol.AoETargetType", "any");
  setProperty(document, "flags.midi-qol.AoETargetTypeIncludeSelf", false);

  return document;
}
