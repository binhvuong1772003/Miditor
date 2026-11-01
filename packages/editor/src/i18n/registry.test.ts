import { builtInRegistry, type Registry } from "@midito-kitchen/core";
import { describe, expect, it } from "vitest";
import { vi } from "../locales/vi";
import { localiseRegistry } from "./registry";
import { createT } from "./translate";

describe("localiseRegistry", () => {
  it("keeps the registered text without a translation", () => {
    const shown = localiseRegistry(createT(undefined), builtInRegistry);
    expect(shown.Text?.label).toBe("Text");
    expect(shown.Text?.fields.align?.label).toBe("Align");
    expect(shown.Button?.fields.action?.help).toBe(builtInRegistry.Button?.fields.action?.help);
  });

  it("says the kinds, categories and fields of the editor in Vietnamese", () => {
    const shown = localiseRegistry(createT({ messages: vi }), builtInRegistry);
    expect(shown.Container?.label).toBe("Hộp");
    expect(shown.Text?.category).toBe("Cơ bản");
    expect(shown.Text?.fields.bold?.label).toBe("Đậm");
    expect(shown.Button?.fields.action?.help).toContain("liên kết");
  });

  it("has a Vietnamese label and help for every kind and field the editor ships", () => {
    const t = createT({ messages: vi });
    const shown = localiseRegistry(t, builtInRegistry);
    for (const [type, def] of Object.entries(builtInRegistry)) {
      expect(shown[type]?.label, type).not.toBe(def.label);
      for (const [name, field] of Object.entries(def.fields)) {
        expect(shown[type]?.fields[name]?.label, `${type}.${name}`).not.toBe(field.label);
        if (field.help)
          expect(shown[type]?.fields[name]?.help, `${type}.${name}`).not.toBe(field.help);
      }
    }
  });

  it("leaves a kind of the host as registered and does not change the original", () => {
    const own: Registry = {
      Hero: {
        label: "Hero",
        defaultProps: {},
        fields: { title: { type: "text", label: "Title" } },
        canContain: false,
      },
    };
    const shown = localiseRegistry(createT({ messages: vi }), own);
    expect(shown.Hero?.label).toBe("Hero");
    expect(shown.Hero?.fields.title?.label).toBe("Title");
    expect(own.Hero?.label).toBe("Hero");
  });
});
