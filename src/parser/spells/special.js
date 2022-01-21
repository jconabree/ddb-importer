import DICTIONARY from "../../dictionary.js";
import logger from "../../logger.js";
import utils from "../../utils.js";

let getEldritchInvocations = (data) => {
  let damage = "";
  let range = 0;

  const eldritchBlastMods = utils.filterBaseModifiers(data, "eldritch-blast").filter((modifier) => modifier.isGranted);

  eldritchBlastMods.forEach((mod) => {
    switch (mod.subType) {
      case "bonus-damage": {
        // almost certainly CHA :D
        const abilityModifierLookup = DICTIONARY.character.abilities.find((ability) => ability.id === mod.statId);
        if (abilityModifierLookup) {
          if (damage !== "") damage += " + ";
          damage += `@abilities.${abilityModifierLookup.value}.mod`;
        } else if (mod.fixedValue) {
          if (damage !== "") damage += " + ";
          damage += `${mod.fixedValue}`;
        }
        break;
      }
      case "bonus-range":
        range = mod.value;
        break;
      default:
        logger.warn(`Not yet able to process ${mod.subType}, please raise an issue.`);
    }
  });

  return {
    damage: damage,
    range: range,
  };
};

function getCustomValue(data, ddb, type) {
  if (!ddb) return null;
  const characterValues = ddb.character.characterValues;
  const customValue = characterValues.filter(
    (value) =>
      value.valueId == data.flags.ddbimporter.dndbeyond.id &&
      value.valueTypeId == data.flags.ddbimporter.dndbeyond.entityTypeId
  );

  if (customValue) {
    const customName = customValue.find((value) => value.typeId == type);
    if (customName) return customName.value;
  }
  return null;
}

function addCustomValues(item, ddb) {
  // to hit override requires a lot of crunching
  // const toHitOverride = getCustomValue(item, character, 13);
  const toHitBonus = getCustomValue(item, ddb, 12);
  const damageBonus = getCustomValue(item, ddb, 10);
  const dcOverride = getCustomValue(item, ddb, 15);
  const dcBonus = getCustomValue(item, ddb, 14);

  if (toHitBonus) item.data.attackBonus += toHitBonus;
  if (damageBonus && item.data.damage.parts.length !== 0) {
    item.data.damage.parts[0][0] = item.data.damage.parts[0][0].concat(` +${damageBonus}`);
  } else if (damageBonus) {
    const part = [`+${damageBonus}`, ""];
    item.data.damage.parts.push(part);
  }
  // if (damageBonus) item.data.damage.parts[0] = item.data.damage.parts[0].concat(` +${damageBonus}`);
  if (dcBonus) {
    if (item.flags.ddbimporter.dndbeyond.dc) {
      item.data.save.dc = parseInt(item.flags.ddbimporter.dndbeyond.dc) + dcBonus;
      item.data.save.scaling = "flat";
    }
  }
  if (dcOverride) {
    item.data.save.dc = dcOverride;
    item.data.save.scaling = "flat";
  }
}

/**
 * Some spells we need to fix up or massage because they are modified
 * in interesting ways
 * @param {*} ddb
 * @param {*} items
 */
/* eslint-disable complexity */
export function fixSpells(ddb, items) {
  // because the effect parsing happens before this, we need to fix some of the spell changes here
  const usingEffects = ddb === null
    ? game.settings.get("ddb-importer", "munching-policy-add-spell-effects")
    : game.settings.get("ddb-importer", "character-update-policy-add-spell-effects");

  items.forEach((spell) => {
    const name = spell.flags.ddbimporter.originalName || spell.name;
    switch (name) {
      // Eldritch Blast is a special little kitten and has some fun Eldritch
      // Invocations which can adjust it.
      case "Eldritch Blast": {
        if (!ddb) break;
        const eldritchBlastMods = getEldritchInvocations(ddb);
        spell.data.damage.parts[0][0] += " + " + eldritchBlastMods["damage"];
        spell.data.range.value += eldritchBlastMods["range"];
        break;
      }
      case "Aid": {
        spell.data.scaling = { mode: "level", formula: "(@item.level - 1) * 5" };
        break;
      }
      case "Darkvision": {
        spell.data["target"]["type"] = "creature";
        break;
      }
      // The target/range input data are incorrect on some AOE spells centred
      // on self.
      // Range is self with an AoE target of 15 ft cube
      // i.e. affects all creatures within 5 ft of caster
      case "Thunderclap":
      case "Word of Radiance":
        spell.data.range = { value: null, units: "self", long: null };
        spell.data.target = { value: 15, units: "ft", type: "cube" };
        break;
      case "Sleep": {
        spell.data.damage = { parts: [["5d8", ""]], versatile: "", value: "" };
        spell.data.scaling = { mode: "level", formula: "2d8" };
        break;
      }
      case "Ray of Enfeeblement":
        spell.data.actionType = "rsak";
        break;
      case "Color Spray": {
        spell.data.damage = { parts: [["6d10", ""]], versatile: "", value: "" };
        spell.data.scaling = { mode: "level", formula: "2d10" };
        break;
      }
      case "Gust of Wind":
        spell.data.target = { value: 60, units: "ft", type: "line", width: 10 };
        break;
      case "Produce Flame":
        spell.data.range = { value: 30, units: "ft", long: null };
        break;
      case "Hex": {
        spell.data.actionType = "other";
        if (usingEffects) {
          spell.data.damage = { parts: [], versatile: "", value: "" };
        }
        break;
      }
      case "Shadow of Moil":
      case "Cloud of Daggers":
      case "Magic Missile":
        spell.data.actionType = "other";
        break;
      // dnd beyond lists a damage for each type
      case "Chaos Bolt":
        spell.data.damage = { parts: [["2d8", ""], ["1d6", ""]], versatile: "", value: "", };
        break;
      // dnd beyond lists a damage for each type
      case "Chromatic Orb":
        if (usingEffects) {
          spell.data.damage = { parts: [], versatile: "", value: "" };
        } else {
          spell.data.damage = { parts: [["3d8", ""]], versatile: "", value: "" };
          spell.data.chatFlavor = "Choose from Acid, Cold, Fire, Lightning, Poison, Thunder, or Acid";
        }
        break;
      case "Dragon's Breath":
        spell.data.damage = { parts: [["3d6", ""]], versatile: "", value: "" };
        spell.data.chatFlavor = "Choose one of Acid, Cold, Fire, Lightning, or Poison.";
        break;
      case "Hunter's Mark":
      case "Hunter’s Mark": {
        spell.data.actionType = "other";
        if (usingEffects) {
          spell.data.damage = { parts: [], versatile: "", value: "" };
        } else {
          spell.data.damage = { parts: [["1d6", ""]], versatile: "", value: "" };
        }
        break;
      }
      case "Call Lightning": {
        if (usingEffects) {
          spell.data.damage = { parts: [], versatile: "", value: "" };
          spell.data["target"]["type"] = "self";
          spell.data.range = { value: null, units: "self", long: null };
          spell.data.save.ability = "";
        }
        break;
      }
      case "Pyrotechnics":
        spell.data["target"]["value"] = 15;
        break;
      case "Absorb Elements":
        spell.data.damage = { parts: [["1d6", ""]], versatile: "", value: "" };
        spell.data.chatFlavor = "Uses the damage type of the triggered attack: Acid, Cold, Fire, Lightning, or Poison.";
        spell.data["target"]["value"] = 1;
        break;
      case "Booming Blade":
        spell.data.damage = { parts: [["0", "thunder"]], versatile: "1d8", value: "" };
        spell.data.scaling = { mode: "cantrip", formula: "1d8" };
        spell.data.actionType = "other";
        break;
      case "Green-Flame Blade":
        spell.data.damage = { parts: [["0", "fire"]], versatile: "@mod", value: "" };
        spell.data.scaling = { mode: "cantrip", formula: "1d8" };
        spell.data.actionType = "other";
        break;
      case "Toll the Dead":
        spell.data.scaling = { mode: "cantrip", formula: "" };
        break;
      case "Goodberry":
        spell.data.damage = { parts: [["1", "healing"]], versatile: "", value: "" };
        break;
      case "Flaming Sphere":
        spell.data.target["value"] = 2.5;
        break;
      case "Heat Metal":
        spell.data.actionType = "save";
        break;
      case "Searing Smite": {
        if (spell.data.damage.parts.length > 1) {
          spell.data.formula = spell.data.damage.parts[1][0];
          spell.data.damage.parts = [spell.data.damage.parts[0]];
        }
        spell.data.scaling = { mode: "level", formula: "1d6" };
        break;
      }
      case "Spirit Guardians": {
        if (!ddb) break;
        const radiantAlignments = [1, 2, 3, 4, 5, 6, 10, 14];
        const necroticAlignments = [7, 8, 9, 11];
        if (radiantAlignments.includes(ddb.character.alignmentId)) {
          setProperty(spell, "flags.ddbimporter.damageType", "radiant");
          spell.data.damage = { parts: [["3d8", "radiant"]], versatile: "", value: "" };
        } else if (necroticAlignments.includes(ddb.character.alignmentId)) {
          setProperty(spell, "flags.ddbimporter.damageType", "necrotic");
          spell.data.damage = { parts: [["3d8", "necrotic"]], versatile: "", value: "" };
        }
        break;
      }
      case "Armor of Agathys": {
        spell.data.actionType = "heal";
        spell.data["target"]["type"] = "self";
        spell.data.damage.parts[0] = ["5", "temphp"];
        spell.data.scaling = { mode: "level", formula: "(@item.level - 1) * 5" };
        break;
      }
      case "False Life": {
        spell.data.actionType = "heal";
        spell.data["target"]["type"] = "self";
        spell.data.damage.parts[0] = ["1d4 + 4", "temphp"];
        spell.data.scaling = { mode: "level", formula: "(@item.level - 1) * 5" };
        break;
      }
      case "Divine Favor": {
        spell.data.actionType = "util";
        spell.data["target"]["type"] = "self";
        break;
      }
      case "Bones of the Earth": {
        spell.data.target.value = 2.5;
        break;
      }
      case "Heroes Feast": {
        spell.data.duration = { value: 1, units: "day" };
        break;
      }
      case "Heroism": {
        spell.data.damage.parts[0] = ["@mod", "temphp"];
        break;
      }
      case "Protection from Energy":
        spell.data["target"]["type"] = "creature";
        break;
      // no default
    }

    if (ddb) addCustomValues(spell, ddb);
  });
}
/* eslint-enable complexity */
