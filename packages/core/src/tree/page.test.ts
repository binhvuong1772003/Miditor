import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { hexColor, num, pixelLength, relabel, solidContainer, tree } from "../position/arbitraries";
import { inferBox } from "../position/infer-box";
import { normalizeAngle } from "../styles/angle";
import { freeBoxOf, isFreeNode, withFreeBox } from "./free-box";
import { updateNode } from "./nodes";
import { emptyPage, isPageData, SCHEMA_VERSION } from "./page";
import { withStyle } from "./styles";
import type { PageData, TreeNode } from "./types";

/** A page that is valid and uses every kind of placement, so each test can break one thing. */
function sample(): PageData {
  return {
    schemaVersion: SCHEMA_VERSION,
    root: {
      id: "root",
      type: "Page",
      props: {},
      styles: {},
      position: { mode: "flow" },
      children: [
        {
          id: "a",
          type: "Container",
          props: { title: "Hi", list: [1, 2, { deep: null }], on: true },
          styles: {
            background: "#d5dae3",
            borderWidth: 1,
            borderColor: "#b3bccb",
            borderRadius: 4,
          },
          position: {
            mode: "free",
            x: { anchor: "end", offset: 20 },
            y: { anchor: "start", offset: 40 },
          },
          size: { w: { kind: "px", v: 160 }, h: { kind: "percent", v: 15 } },
          rotation: 30,
          children: [
            {
              id: "a1",
              type: "Container",
              props: {},
              styles: {},
              position: { mode: "flow" },
              children: [],
            },
          ],
        },
        {
          id: "b",
          type: "Container",
          props: {},
          styles: {},
          position: {
            mode: "free",
            x: { anchor: "stretch", start: 40, end: 300 },
            y: { anchor: "scale", start: 10, size: 20 },
          },
          size: { w: { kind: "px", v: 1 }, h: { kind: "px", v: 1 } },
          rotation: 0,
          children: [],
        },
        {
          id: "c",
          type: "Container",
          props: {},
          styles: {},
          position: {
            mode: "free",
            x: { anchor: "center", offset: -5 },
            y: { anchor: "center", offset: 0 },
          },
          size: { w: { kind: "percent", v: 50 }, h: { kind: "px", v: 10 } },
          rotation: -179.99,
          children: [],
        },
      ],
    },
  };
}

// biome-ignore lint/suspicious/noExplicitAny: the tests break a copy of the data on purpose, so its fields are loose
type Loose = Record<string, any>;

/** The sample after `change` has been applied to a copy of it, as loose data. */
function broken(change: (page: Loose) => void): unknown {
  const page = JSON.parse(JSON.stringify(sample())) as Loose;
  change(page);
  return page;
}

const a = (page: Loose) => page.root.children[0] as Loose;
const b = (page: Loose) => page.root.children[1] as Loose;

describe("emptyPage", () => {
  it("is a page that passes the check, with a root and no children", () => {
    const page = emptyPage();
    expect(isPageData(page)).toBe(true);
    expect(page.root).toMatchObject({ id: "root", type: "Page", children: [] });
    expect(page.schemaVersion).toBe(SCHEMA_VERSION);
  });

  it("makes a new object every time", () => {
    expect(emptyPage()).not.toBe(emptyPage());
    expect(emptyPage().root.children).not.toBe(emptyPage().root.children);
  });
});

describe("isPageData", () => {
  it("accepts a page that uses every placement, and one that went through JSON", () => {
    expect(isPageData(sample())).toBe(true);
    expect(isPageData(JSON.parse(JSON.stringify(sample())))).toBe(true);
  });

  it("refuses what is not an object, and does not throw for anything at all", () => {
    for (const bad of [
      null,
      undefined,
      0,
      1,
      "page",
      true,
      [],
      [sample()],
      () => sample(),
      Symbol("x"),
    ]) {
      expect(isPageData(bad)).toBe(false);
    }
    fc.assert(fc.property(fc.anything(), (value) => isPageData(value) === false));
    fc.assert(fc.property(fc.jsonValue(), (value) => isPageData(value) === false));
  });

  it("refuses another schema version, a missing one, and extra keys on the page", () => {
    for (const schemaVersion of [0, 2, "1", null, undefined, Number.NaN]) {
      expect(isPageData({ ...sample(), schemaVersion })).toBe(false);
    }
    expect(isPageData({ root: sample().root })).toBe(false);
    expect(isPageData({ schemaVersion: SCHEMA_VERSION })).toBe(false);
    expect(isPageData({ ...sample(), extra: 1 })).toBe(false);
  });

  it("refuses a root that is missing, not a node, or not placed by flow", () => {
    expect(isPageData(broken((p) => delete p.root))).toBe(false);
    expect(isPageData(broken((p) => (p.root = null)))).toBe(false);
    expect(isPageData(broken((p) => (p.root = [])))).toBe(false);
    expect(isPageData(broken((p) => (p.root = a(p))))).toBe(false);
  });

  describe("ids and types", () => {
    it("refuses a missing, empty or non-string id", () => {
      for (const id of [undefined, "", 1, null, {}]) {
        expect(isPageData(broken((p) => (a(p).id = id)))).toBe(false);
      }
      expect(isPageData(broken((p) => delete a(p).id))).toBe(false);
    });

    it("refuses an id that appears twice, at any depth", () => {
      expect(isPageData(broken((p) => (b(p).id = "a")))).toBe(false);
      expect(isPageData(broken((p) => (a(p).children[0].id = "root")))).toBe(false);
      expect(isPageData(broken((p) => (a(p).children[0].id = "b")))).toBe(false);
    });

    it("refuses a missing, empty or non-string type", () => {
      for (const type of [undefined, "", 1, null]) {
        expect(isPageData(broken((p) => (a(p).type = type)))).toBe(false);
      }
    });
  });

  describe("props", () => {
    it("accepts any JSON value in props", () => {
      expect(
        isPageData(broken((p) => (a(p).props = { x: [1, "2", [null, { y: false }]], z: -1.5 }))),
      ).toBe(true);
    });

    it("refuses props that are not a plain object", () => {
      for (const props of [null, [], "x", 1, undefined, new Date(), new Map()]) {
        expect(isPageData(broken((p) => (a(p).props = props)))).toBe(false);
      }
    });

    it("refuses a value that JSON cannot carry", () => {
      for (const value of [
        Number.NaN,
        Infinity,
        undefined,
        () => 1,
        new Date(),
        Symbol("x"),
        10n,
      ]) {
        expect(isPageData(broken((p) => (a(p).props = { value })))).toBe(false);
        expect(isPageData(broken((p) => (a(p).props = { list: [value] })))).toBe(false);
      }
    });

    it("accepts props nested 31 objects deep and refuses 32", () => {
      const nested = (levels: number): unknown => {
        let value: unknown = 1;
        for (let i = 0; i < levels; i++) value = { value };
        return value;
      };
      expect(isPageData(broken((p) => (a(p).props = { deep: nested(31) })))).toBe(true);
      expect(isPageData(broken((p) => (a(p).props = { deep: nested(32) })))).toBe(false);
    });
  });

  describe("styles", () => {
    it("accepts every known style at its limits", () => {
      expect(
        isPageData(
          broken(
            (p) =>
              (a(p).styles = {
                background: "#000000",
                borderWidth: 0,
                borderColor: "#ffffff",
                borderRadius: 1000,
              }),
          ),
        ),
      ).toBe(true);
    });

    it("refuses a colour that is not #rrggbb in lowercase", () => {
      for (const background of ["red", "#fff", "#FFFFFF", "#ggg000", "d5dae3", "", 5, null]) {
        expect(isPageData(broken((p) => (a(p).styles = { background })))).toBe(false);
        expect(isPageData(broken((p) => (a(p).styles = { borderColor: background })))).toBe(false);
      }
    });

    it("refuses a length that is negative, too large or not a number", () => {
      for (const length of [-1, 1001, Number.NaN, "4", null]) {
        expect(isPageData(broken((p) => (a(p).styles = { borderWidth: length })))).toBe(false);
        expect(isPageData(broken((p) => (a(p).styles = { borderRadius: length })))).toBe(false);
      }
    });

    it("accepts a phone page height and refuses one out of range or not whole", () => {
      expect(isPageData(broken((p) => (a(p).styles = { phoneMinHeight: 812 })))).toBe(true);
      for (const height of [199, 20001, 640.5, "812", null]) {
        expect(isPageData(broken((p) => (a(p).styles = { phoneMinHeight: height })))).toBe(false);
      }
    });

    it("accepts an opacity and a shadow, and refuses the ones that are out of range", () => {
      const shadow = { x: 0, y: 4, blur: 16, spread: 0, color: "#000000", opacity: 22 };
      expect(isPageData(broken((p) => (a(p).styles = { opacity: 50, shadow })))).toBe(true);
      for (const opacity of [-1, 101, Number.NaN, "50", null]) {
        expect(isPageData(broken((p) => (a(p).styles = { opacity })))).toBe(false);
      }
      for (const bad of [{ ...shadow, blur: -1 }, { ...shadow, color: "red" }, "x", null, {}]) {
        expect(isPageData(broken((p) => (a(p).styles = { shadow: bad })))).toBe(false);
      }
    });

    it("refuses a style it does not know, and styles that are missing or not an object", () => {
      expect(isPageData(broken((p) => (a(p).styles = { color: "#000000" })))).toBe(false);
      expect(isPageData(broken((p) => (a(p).styles = { toString: "x" })))).toBe(false);
      for (const styles of [undefined, null, [], "x"]) {
        expect(isPageData(broken((p) => (a(p).styles = styles)))).toBe(false);
      }
    });
  });

  describe("children", () => {
    it("refuses children that are missing, not a list, or hold something that is not a node", () => {
      expect(isPageData(broken((p) => delete a(p).children))).toBe(false);
      for (const children of [null, {}, "x", 1]) {
        expect(isPageData(broken((p) => (a(p).children = children)))).toBe(false);
      }
      for (const child of [null, 1, "x", [], {}, { id: "z" }]) {
        expect(isPageData(broken((p) => (a(p).children = [child])))).toBe(false);
      }
    });

    it("accepts a tree as deep as the bound and refuses one deeper", () => {
      const chain = (depth: number): PageData => {
        const page = emptyPage();
        let node: TreeNode = page.root;
        for (let i = 1; i <= depth; i++) {
          const child: TreeNode = {
            id: `n${i}`,
            type: "Container",
            props: {},
            styles: {},
            position: { mode: "flow" },
            children: [],
          };
          node.children.push(child);
          node = child;
        }
        return page;
      };
      expect(isPageData(chain(100))).toBe(true);
      expect(isPageData(chain(101))).toBe(false);
    });

    it("accepts a tree of exactly the largest size and refuses one node more", () => {
      const leaf = (i: number): TreeNode => ({
        id: `n${i}`,
        type: "Container",
        props: {},
        styles: {},
        position: { mode: "flow" },
        children: [],
      });
      const page = emptyPage();
      // The root is the first node, so 19999 children make 20000.
      for (let i = 0; i < 19999; i++) page.root.children.push(leaf(i));
      expect(isPageData(page)).toBe(true);
      page.root.children.push(leaf(19999));
      expect(isPageData(page)).toBe(false);
    });
  });

  describe("placement", () => {
    it("refuses a missing position, an unknown mode and extra keys in it", () => {
      expect(isPageData(broken((p) => delete a(p).position))).toBe(false);
      for (const mode of ["absolute", "", undefined, null, 1]) {
        expect(isPageData(broken((p) => (a(p).position.mode = mode)))).toBe(false);
      }
      expect(isPageData(broken((p) => (a(p).position.z = 1)))).toBe(false);
    });

    it("refuses a flow node that carries coordinates, a size or a rotation", () => {
      const flow = (p: Loose) => a(p).children[0] as Loose;
      expect(isPageData(broken((p) => (flow(p).position.x = { anchor: "start", offset: 0 })))).toBe(
        false,
      );
      expect(
        isPageData(
          broken((p) => (flow(p).size = { w: { kind: "px", v: 1 }, h: { kind: "px", v: 1 } })),
        ),
      ).toBe(false);
      expect(isPageData(broken((p) => (flow(p).rotation = 0)))).toBe(false);
    });

    it("refuses a free node that lacks a coordinate, a size or a rotation", () => {
      expect(isPageData(broken((p) => delete a(p).position.x))).toBe(false);
      expect(isPageData(broken((p) => delete a(p).position.y))).toBe(false);
      expect(isPageData(broken((p) => delete a(p).size))).toBe(false);
      expect(isPageData(broken((p) => delete a(p).size.w))).toBe(false);
      expect(isPageData(broken((p) => delete a(p).size.h))).toBe(false);
      expect(isPageData(broken((p) => delete a(p).rotation))).toBe(false);
      expect(isPageData(broken((p) => (a(p).size.extra = 1)))).toBe(false);
    });

    it("refuses a rotation that is not a number of degrees from -180 to 180", () => {
      for (const rotation of [
        Number.NaN,
        Infinity,
        null,
        "30",
        -180.01,
        180.01,
        190,
        360,
        undefined,
      ]) {
        expect(isPageData(broken((p) => (a(p).rotation = rotation)))).toBe(false);
      }
      for (const rotation of [180, -180, -179.99, 0, 0.01]) {
        expect(isPageData(broken((p) => (a(p).rotation = rotation)))).toBe(true);
      }
    });
  });

  describe("axes and sizes", () => {
    it("refuses an unknown anchor, and a number that is missing, not finite or huge", () => {
      for (const anchor of ["left", "", undefined, null, "START"]) {
        expect(isPageData(broken((p) => (a(p).position.x.anchor = anchor)))).toBe(false);
      }
      for (const offset of [undefined, Number.NaN, null, "5", 1_000_001, -1_000_001]) {
        expect(isPageData(broken((p) => (a(p).position.x.offset = offset)))).toBe(false);
      }
      expect(isPageData(broken((p) => (a(p).position.x.offset = 1_000_000)))).toBe(true);
      expect(isPageData(broken((p) => (a(p).position.x.offset = -1_000_000)))).toBe(true);
    });

    it("refuses an axis that has a number it does not own, or lacks one it does", () => {
      expect(isPageData(broken((p) => (a(p).position.x.start = 1)))).toBe(false);
      expect(isPageData(broken((p) => (b(p).position.x.extra = 1)))).toBe(false);
      expect(isPageData(broken((p) => delete b(p).position.x.end))).toBe(false);
      expect(isPageData(broken((p) => delete b(p).position.x.start))).toBe(false);
      expect(isPageData(broken((p) => delete b(p).position.y.size))).toBe(false);
      expect(isPageData(broken((p) => delete b(p).position.y.start))).toBe(false);
      expect(isPageData(broken((p) => (b(p).position.y.end = 3)))).toBe(false);
    });

    it("refuses a size with another kind, a negative value or one that is not finite", () => {
      for (const kind of ["em", "", undefined, null]) {
        expect(isPageData(broken((p) => (a(p).size.w.kind = kind)))).toBe(false);
      }
      for (const v of [-1, Number.NaN, Infinity, null, "5", undefined, 1_000_001]) {
        expect(isPageData(broken((p) => (a(p).size.h.v = v)))).toBe(false);
      }
      expect(isPageData(broken((p) => (a(p).size.w.v = 0)))).toBe(true);
      expect(isPageData(broken((p) => (a(p).size.w.extra = 1)))).toBe(false);
    });
  });

  describe("theme", () => {
    const withTheme = (theme: unknown) =>
      broken((p) => {
        p.theme = theme;
      });

    it("accepts a page with a theme, also after JSON, and a page without one", () => {
      expect(
        isPageData(withTheme({ colors: { primary: "#112233" }, fonts: { body: "Inter" } })),
      ).toBe(true);
      expect(isPageData(withTheme({}))).toBe(true);
      expect(isPageData(JSON.parse(JSON.stringify(withTheme({ colors: { a: "#000000" } }))))).toBe(
        true,
      );
      expect(isPageData(sample())).toBe(true);
    });

    it("refuses a theme that is not one", () => {
      for (const theme of [
        null,
        5,
        "x",
        [],
        { extra: 1 },
        { colors: { A: "#112233" } },
        { colors: { a: "red" } },
        { fonts: { body: "a;b" } },
      ]) {
        expect(isPageData(withTheme(theme)), JSON.stringify(theme)).toBe(false);
      }
      expect(isPageData(withTheme(undefined))).toBe(false);
    });

    it("lets a block name a theme colour for its background and border, and only a good name", () => {
      for (const value of ["@primary", "@accent-2"]) {
        expect(isPageData(broken((p) => (a(p).styles = { background: value })))).toBe(true);
        expect(isPageData(broken((p) => (a(p).styles = { borderColor: value })))).toBe(true);
      }
      for (const value of ["@", "@Primary", "@a b", "primary", "@@a"]) {
        expect(isPageData(broken((p) => (a(p).styles = { background: value }))), value).toBe(false);
      }
    });
  });

  describe("lockRatio", () => {
    it("accepts a true or false on a free node, also after JSON, and none", () => {
      for (const value of [true, false]) {
        expect(isPageData(broken((p) => (a(p).lockRatio = value)))).toBe(true);
        expect(
          isPageData(JSON.parse(JSON.stringify(broken((p) => (a(p).lockRatio = value))))),
        ).toBe(true);
      }
      expect(isPageData(sample())).toBe(true);
    });

    it("refuses anything but a boolean", () => {
      for (const value of [1, 0, "true", null, undefined, {}, []]) {
        expect(isPageData(broken((p) => (a(p).lockRatio = value))), String(value)).toBe(false);
      }
    });

    it("refuses it on a node placed by flow", () => {
      expect(isPageData(broken((p) => (p.root.lockRatio = true)))).toBe(false);
      expect(isPageData(broken((p) => (p.root.lockRatio = false)))).toBe(false);
    });
  });

  describe("background picture", () => {
    const withStyles = (styles: Record<string, unknown>) => broken((p) => (a(p).styles = styles));

    it("accepts a picture with its size, position and repeat, also after JSON", () => {
      const styles = {
        backgroundImage: "https://e.co/a.png",
        backgroundSize: "contain",
        backgroundPosition: "top left",
        backgroundRepeat: "repeat",
      };
      expect(isPageData(withStyles(styles))).toBe(true);
      expect(isPageData(JSON.parse(JSON.stringify(withStyles(styles))))).toBe(true);
      expect(isPageData(withStyles({ backgroundImage: "/a.png" }))).toBe(true);
      expect(isPageData(withStyles({ backgroundImage: "data:image/png;base64,AAAA" }))).toBe(true);
      expect(isPageData(withStyles({ backgroundSize: "auto" }))).toBe(true);
    });

    it("refuses a picture address that is not a safe one", () => {
      for (const value of [
        "",
        "javascript:alert(1)",
        "a.png",
        "//e.co/a.png",
        'https://e.co/a".png',
        "https://e.co/a b.png",
        "data:image/svg+xml;base64,AAAA",
        "url(https://e.co/a.png)",
        5,
        null,
      ]) {
        expect(isPageData(withStyles({ backgroundImage: value })), String(value)).toBe(false);
      }
    });

    it("refuses a size, a position or a repeat that is not one of the choices", () => {
      for (const [key, value] of [
        ["backgroundSize", "50%"],
        ["backgroundSize", "Cover"],
        ["backgroundPosition", "10px 20px"],
        ["backgroundPosition", "left top"],
        ["backgroundRepeat", "repeat-x"],
        ["backgroundRepeat", true],
      ] as const) {
        expect(isPageData(withStyles({ [key]: value })), `${key} ${value}`).toBe(false);
      }
    });
  });

  describe("phone props", () => {
    const withProps = (value: unknown) =>
      broken((p) => {
        a(p).phoneProps = value;
      });

    it("accepts props set for the phone, on a free node or a flow node, also after JSON", () => {
      expect(isPageData(withProps({ size: 16, deep: { list: [1, "a", null, true] } }))).toBe(true);
      expect(isPageData(withProps({}))).toBe(true);
      expect(isPageData(JSON.parse(JSON.stringify(withProps({ size: 16 }))))).toBe(true);
      expect(
        isPageData(broken((p) => (p.root.children[0].children[0].phoneProps = { size: 1 }))),
      ).toBe(true);
    });

    it("refuses phone props that are not a plain object of JSON values", () => {
      for (const value of [
        null,
        5,
        "x",
        [],
        [1],
        { f: () => 1 },
        { n: Number.NaN },
        { u: undefined },
      ]) {
        expect(isPageData(withProps(value)), JSON.stringify(value)).toBe(false);
      }
    });
  });

  describe("phone placement", () => {
    const phone = {
      x: { anchor: "scale", start: 5, size: 90 },
      y: { anchor: "start", offset: 12 },
      w: { kind: "px", v: 1 },
      h: { kind: "percent", v: 20 },
      rotation: -45,
    };
    const withPhone = (change?: (phone: Loose) => void) =>
      broken((p) => {
        a(p).phone = JSON.parse(JSON.stringify(phone));
        change?.(a(p).phone);
      });

    it("accepts a free node with a full phone placement, also after JSON", () => {
      const page = withPhone();
      expect(isPageData(page)).toBe(true);
      expect(isPageData(JSON.parse(JSON.stringify(page)))).toBe(true);
    });

    it("refuses a flow node that has one", () => {
      const flow = (p: Loose) => a(p).children[0] as Loose;
      expect(isPageData(broken((p) => (flow(p).phone = phone)))).toBe(false);
    });

    it("refuses a placement that lacks a number or has one it should not", () => {
      for (const key of ["x", "y", "w", "h", "rotation"]) {
        expect(isPageData(withPhone((ph) => delete ph[key]))).toBe(false);
      }
      expect(isPageData(withPhone((ph) => (ph.extra = 1)))).toBe(false);
      expect(isPageData(withPhone((ph) => (ph.position = { mode: "free" })))).toBe(false);
    });

    it("refuses an axis, a size or a rotation that the main placement would refuse", () => {
      expect(isPageData(withPhone((ph) => (ph.x = { anchor: "start" })))).toBe(false);
      expect(isPageData(withPhone((ph) => (ph.x = { anchor: "start", offset: Number.NaN })))).toBe(
        false,
      );
      expect(isPageData(withPhone((ph) => (ph.w = { kind: "px", v: -1 })))).toBe(false);
      expect(isPageData(withPhone((ph) => (ph.h = { kind: "em", v: 1 })))).toBe(false);
      expect(isPageData(withPhone((ph) => (ph.rotation = 181)))).toBe(false);
      expect(isPageData(withPhone((ph) => (ph.rotation = "0")))).toBe(false);
    });

    it("refuses a phone placement that is not an object", () => {
      for (const value of [null, 1, "x", [], undefined]) {
        expect(isPageData(broken((p) => (a(p).phone = value)))).toBe(false);
      }
    });
  });

  describe("node keys", () => {
    it("refuses a key that no node has", () => {
      expect(isPageData(broken((p) => (a(p).extra = 1)))).toBe(false);
      expect(isPageData(broken((p) => (p.root.extra = 1)))).toBe(false);
    });
  });
});

describe("isPageData, properties", () => {
  const page = tree.map((node): PageData => {
    const root = relabel({
      id: "root",
      type: "Page",
      props: {},
      styles: {},
      position: { mode: "flow" },
      children: [node],
    });
    return { schemaVersion: SCHEMA_VERSION, root };
  });

  it("accepts every page the generators make, and the same page after JSON", () => {
    fc.assert(
      fc.property(page, (data) => isPageData(data) && isPageData(JSON.parse(JSON.stringify(data)))),
    );
  });

  it("refuses the page when any one node repeats the id of another", () => {
    fc.assert(
      fc.property(page, fc.nat(), fc.nat(), (data, i, j) => {
        const ids: string[] = [];
        const collect = (n: TreeNode) => {
          ids.push(n.id);
          n.children.forEach(collect);
        };
        collect(data.root);
        if (ids.length < 2) return true;
        const from = i % ids.length;
        const to = (from + 1 + (j % (ids.length - 1))) % ids.length;
        const copy = JSON.parse(JSON.stringify(data)) as PageData;
        let index = 0;
        const rename = (n: TreeNode) => {
          if (index === to) n.id = ids[from] as string;
          index++;
          n.children.forEach(rename);
        };
        rename(copy.root);
        return !isPageData(copy);
      }),
    );
  });

  // What the editor commits must stay a page `isPageData` accepts: if one commit failed the check, a
  // reload would open the sample instead of the saved page and the next edit would overwrite it.
  describe("after what the editor does", () => {
    const freeIds = (root: TreeNode): string[] => [
      ...(isFreeNode(root) ? [root.id] : []),
      ...root.children.flatMap(freeIds),
    ];

    /** A page and the id of one free node in it, or none when it has no free node. */
    const pageAndFree = page.chain((data) => {
      const ids = freeIds(data.root);
      return ids.length === 0
        ? fc.constant<[PageData, string | undefined]>([data, undefined])
        : fc.constantFrom(...ids).map((id): [PageData, string | undefined] => [data, id]);
    });

    const change = (data: PageData, id: string, edit: (node: TreeNode) => TreeNode): PageData => ({
      ...data,
      root: updateNode(data.root, id, edit),
    });

    it("keeps a page valid after a drag or a resize (any rect of at least 1px by 1px)", () => {
      const resized = fc.record({
        x: num(-300, 900),
        y: num(-300, 700),
        w: num(1, 600),
        h: num(1, 500),
      });
      fc.assert(
        fc.property(pageAndFree, resized, solidContainer, ([data, id], moved, container) => {
          if (id === undefined) return true;
          const next = change(data, id, (n) =>
            isFreeNode(n) ? withFreeBox(n, inferBox(freeBoxOf(n), moved, container)) : n,
          );
          return isPageData(next);
        }),
        { numRuns: 500 },
      );
    });

    it("keeps a page valid after a turn of any size", () => {
      fc.assert(
        fc.property(pageAndFree, num(-100000, 100000), ([data, id], degrees) => {
          if (id === undefined) return true;
          const rotation = normalizeAngle(degrees);
          const next = change(data, id, (n) => (isFreeNode(n) ? { ...n, rotation } : n));
          return isPageData(next);
        }),
        { numRuns: 500 },
      );
    });

    it("keeps a page valid after any style the panel can store", () => {
      const patch = fc.oneof(
        fc.record({
          key: fc.constantFrom("background" as const, "borderColor" as const),
          value: hexColor,
        }),
        fc.record({
          key: fc.constantFrom("borderWidth" as const, "borderRadius" as const),
          value: pixelLength,
        }),
      );
      fc.assert(
        fc.property(pageAndFree, patch, ([data, id], change1) => {
          if (id === undefined) return true;
          const next = change(data, id, (n) =>
            change1.key === "background" || change1.key === "borderColor"
              ? withStyle(n, change1.key, change1.value as string)
              : withStyle(n, change1.key, change1.value as number),
          );
          return isPageData(next);
        }),
        { numRuns: 500 },
      );
    });
  });
});
