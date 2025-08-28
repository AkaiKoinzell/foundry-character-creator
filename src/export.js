export function exportFoundryActor(state) {
  const clone = (v) => JSON.parse(JSON.stringify(v));
  const actor = {
    name: state.name,
    playerName: state.playerName,
    type: state.type,
    system: clone(state.system),
    items: [],
    prototypeToken: clone(state.prototypeToken),
  };

  if (!actor.system.details) actor.system.details = {};
  actor.system.details.origin = state.system?.details?.origin || "";
  actor.system.details.age = state.system?.details?.age ?? 0;

  (state.classes || []).forEach((cls) => {
    actor.items.push({
      name: cls.name,
      type: "class",
      system: {
        level: cls.level,
        subclass: cls.subclass || "",
      },
    });
  });

  (state.feats || []).forEach((feat) => {
    const name = typeof feat === "string" ? feat : feat.name;
    const system = typeof feat === "string" ? {} : feat.system || {};
    actor.items.push({ name, type: "feat", system });
  });

  (state.equipment || []).forEach((item) => {
    actor.items.push({
      name: item.name,
      type: item.type || "loot",
      system: item.system || {},
    });
  });

  return actor;
}
