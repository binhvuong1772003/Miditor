import { describe, expect, it } from "vitest";
import { shapeLayerStyle, textOf, textStyle } from "./kind-style";

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
      fontWeight: 700,
      textAlign: "center",
      justifyContent: "center",
    });
  });

  it("uses the defaults for missing or bad values, and always writes every key", () => {
    const plain = {
      fontSize: "24px",
      color: "#111111",
      fontWeight: 400,
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
