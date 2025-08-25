export function exportFoundryActor(state) {
  const clone = (v) => JSON.parse(JSON.stringify(v));
  const actor = {
    name: state.name,
    type: state.type,
    system: clone(state.system),
    items: [],
    prototypeToken: clone(state.prototypeToken),
  };

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
    actor.items.push({
      name: typeof feat === "string" ? feat : feat.name,
      type: "feat",
      system: typeof feat === "string" ? {} : feat.system || {},
    });
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
