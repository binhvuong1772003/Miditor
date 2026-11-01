import { describe, expect, it } from "vitest";
import {
  buttonStyle,
  DEFAULT_FONT,
  pageFont,
  shapeLayerStyle,
  textOf,
  textStyle,
} from "./kind-style";

describe("textOf", () => {
  it("is the text prop when it is a string, and empty otherwise", () => {
    expect(textOf({ text: "Hi" })).toBe("Hi");
    expect(textOf({ text: 5 })).toBe("");
    expect(textOf({})).toBe("");
  });
});

describe("textStyle", () => {
  it("draws what the props say", () => {
    expect(textStyle({ size: 30, color: "#ff0000", bold: true, align: "center" })).toEqual({
      fontSize: "30px",
      color: "#ff0000",
      fontFamily: DEFAULT_FONT,
      fontWeight: 700,
      fontStyle: "normal",
      textDecoration: "none",
      textAlign: "center",
      justifyContent: "center",
    });
  });

  it("draws italic and underline when they are on, and only when they are exactly true", () => {
    expect(textStyle({ italic: true, underline: true })).toMatchObject({
      fontStyle: "italic",
      textDecoration: "underline",
    });
    expect(textStyle({ italic: false, underline: false })).toMatchObject({
      fontStyle: "normal",
      textDecoration: "none",
    });
    expect(textStyle({ italic: "yes", underline: 1 })).toMatchObject({
      fontStyle: "normal",
      textDecoration: "none",
    });
    // The three switches do not touch each other.
    expect(textStyle({ bold: true })).toMatchObject({
      fontStyle: "normal",
      textDecoration: "none",
    });
    expect(textStyle({ italic: true })).toMatchObject({ fontWeight: 400, textDecoration: "none" });
  });

  it("uses the defaults for missing or bad values, and always writes every key", () => {
    const plain = {
      fontSize: "24px",
      color: "#111111",
      fontFamily: DEFAULT_FONT,
      fontWeight: 400,
      fontStyle: "normal",
      textDecoration: "none",
      textAlign: "center",
      justifyContent: "center",
    };
    expect(textStyle({})).toEqual(plain);
    expect(textStyle({ size: "big", color: "red", bold: "yes", align: "justify" })).toEqual(plain);
    expect(textStyle({ size: Number.NaN })).toEqual(plain);
    expect(textStyle({ color: "#FF0000" }).color).toBe("#111111");
  });

  it("places the text across its box by its alignment", () => {
    expect(textStyle({ align: "left" })).toMatchObject({
      textAlign: "left",
      justifyContent: "flex-start",
    });
    expect(textStyle({ align: "right" })).toMatchObject({
      textAlign: "right",
      justifyContent: "flex-end",
    });
  });

  it("keeps the size between 1 and 400 px and rounds it to 0.01", () => {
    expect(textStyle({ size: 0 }).fontSize).toBe("1px");
    expect(textStyle({ size: -5 }).fontSize).toBe("1px");
    expect(textStyle({ size: 9999 }).fontSize).toBe("400px");
    expect(textStyle({ size: 12.3456 }).fontSize).toBe("12.35px");
  });
});

describe("shapeLayerStyle", () => {
  it("is a rectangle by default, filled with the default colour", () => {
    expect(shapeLayerStyle({})).toMatchObject({
      backgroundColor: "#cbd5e1",
      borderRadius: "0",
      clipPath: "none",
    });
  });

  it("rounds an ellipse and clips a triangle, and no shape does both", () => {
    expect(shapeLayerStyle({ shape: "ellipse" })).toMatchObject({
      borderRadius: "50%",
      clipPath: "none",
    });
    expect(shapeLayerStyle({ shape: "triangle" })).toMatchObject({
      borderRadius: "0",
      clipPath: "polygon(50% 0, 100% 100%, 0 100%)",
    });
    expect(shapeLayerStyle({ shape: "star" })).toMatchObject({
      borderRadius: "0",
      clipPath: "none",
    });
  });

  it("fills with a stored colour only, and lets the pointer through", () => {
    expect(shapeLayerStyle({ fill: "#00ff00" }).backgroundColor).toBe("#00ff00");
    expect(shapeLayerStyle({ fill: "green" }).backgroundColor).toBe("#cbd5e1");
    expect(shapeLayerStyle({ fill: 3 }).backgroundColor).toBe("#cbd5e1");
    expect(shapeLayerStyle({}).pointerEvents).toBe("none");
  });
});

describe("textStyle on a phone", () => {
  it("follows the page ratio, with 12 px as the floor and the desktop size as the ceiling", () => {
    expect(textStyle({ size: 40 }, "phone").fontSize).toBe("15.63px");
    expect(textStyle({ size: 24 }, "phone").fontSize).toBe("12px");
    expect(textStyle({ size: 12 }, "phone").fontSize).toBe("12px");
    expect(textStyle({ size: 10 }, "phone").fontSize).toBe("10px");
    expect(textStyle({ size: 1 }, "phone").fontSize).toBe("1px");
    expect(textStyle({ size: 400 }, "phone").fontSize).toBe("156.25px");
  });

  it("uses the default size, and changes only the size", () => {
    expect(textStyle({}, "phone").fontSize).toBe("12px");
    const { fontSize: _a, ...desktop } = textStyle({ size: 40, color: "#ff0000", bold: true });
    const { fontSize: _b, ...phone } = textStyle(
      { size: 40, color: "#ff0000", bold: true },
      "phone",
    );
    expect(phone).toEqual(desktop);
  });

  it("is the desktop size on the desktop", () => {
    expect(textStyle({ size: 40 }, "desktop").fontSize).toBe("40px");
    expect(textStyle({ size: 40 }).fontSize).toBe("40px");
  });
});

describe("the theme", () => {
  const theme = {
    colors: { primary: "#112233" },
    fonts: { body: "Inter, sans-serif", heading: "Playfair Display, serif" },
  };

  it("gives the page the body font of the theme, or the default one", () => {
    expect(pageFont(theme)).toBe("Inter, sans-serif");
    expect(pageFont({ colors: {} })).toBe(DEFAULT_FONT);
    expect(pageFont()).toBe(DEFAULT_FONT);
    expect(pageFont({ fonts: { body: "a;b" } })).toBe(DEFAULT_FONT);
  });

  it("draws a text in the colour a reference names, and in the default one when it is not there", () => {
    expect(textStyle({ color: "@primary" }, "desktop", theme).color).toBe("#112233");
    expect(textStyle({ color: "@missing" }, "desktop", theme).color).toBe("#111111");
    expect(textStyle({ color: "@primary" }).color).toBe("#111111");
  });

  it("sets a text in a font stack it was given, when that is a safe one", () => {
    expect(textStyle({ font: "Lora, serif" }, "desktop", theme).fontFamily).toBe("Lora, serif");
    expect(textStyle({ font: "a;b" }, "desktop", theme).fontFamily).toBe("Inter, sans-serif");
    expect(textStyle({ font: 5 }, "desktop", theme).fontFamily).toBe("Inter, sans-serif");
    expect(buttonStyle({ font: "Lora, serif" }, "desktop", theme).fontFamily).toBe("Lora, serif");
    expect(buttonStyle({}, "desktop", theme).fontFamily).toBe("Inter, sans-serif");
  });

  it("sets a text in the body font, or the heading font when it asks for it", () => {
    expect(textStyle({}, "desktop", theme).fontFamily).toBe("Inter, sans-serif");
    expect(textStyle({ font: "body" }, "desktop", theme).fontFamily).toBe("Inter, sans-serif");
    expect(textStyle({ font: "heading" }, "desktop", theme).fontFamily).toBe(
      "Playfair Display, serif",
    );
    expect(textStyle({ font: "" }, "desktop", theme).fontFamily).toBe("Inter, sans-serif");
  });

  it("falls back from the heading font to the body font, and from that to the default", () => {
    expect(textStyle({ font: "heading" }, "desktop", { fonts: { body: "Inter" } }).fontFamily).toBe(
      "Inter",
    );
    expect(textStyle({ font: "heading" }, "desktop", {}).fontFamily).toBe(DEFAULT_FONT);
    expect(
      textStyle({ font: "heading" }, "desktop", { fonts: { heading: "a;b" } }).fontFamily,
    ).toBe(DEFAULT_FONT);
  });

  it("fills a shape with a theme colour", () => {
    expect(shapeLayerStyle({ fill: "@primary" }, theme).backgroundColor).toBe("#112233");
    expect(shapeLayerStyle({ fill: "@missing" }, theme).backgroundColor).toBe("#cbd5e1");
  });
});
