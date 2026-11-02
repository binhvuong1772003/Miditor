import type { Field, Registry } from "@miditor/core";
import type { T } from "./translate";

/**
 * The registry as a person reads it: the name and the category of each kind and the label and help
 * of each field, said in the language of the editor. A kind or field with no translation keeps the
 * text it was registered with, so a host's own kinds need nothing. The logic keeps the real registry:
 * only what is drawn on the screen uses this one.
 */
export function localiseRegistry(t: T, registry: Registry): Registry {
  const out: Registry = {};
  for (const [type, def] of Object.entries(registry)) {
    const fields: Record<string, Field> = {};
    for (const [name, field] of Object.entries(def.fields)) {
      fields[name] = {
        ...field,
        label: t.or(`field.${type}.${name}`, field.label),
        ...(field.help === undefined
          ? {}
          : { help: t.or(`field.${type}.${name}.help`, field.help) }),
      };
    }
    out[type] = {
      ...def,
      label: t.or(`kind.${type}.label`, def.label),
      ...(def.category === undefined
        ? {}
        : { category: t.or(`category.${def.category}`, def.category) }),
      fields,
    };
  }
  return out;
}
