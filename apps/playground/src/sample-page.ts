import { type PageData, SCHEMA_VERSION } from "@midito-kitchen/editor";

/** The page the playground opens when nothing is stored: two free blocks to select, drag, resize and turn. */
export const SAMPLE_PAGE: PageData = {
  schemaVersion: SCHEMA_VERSION,
  root: {
    id: "root",
    type: "Page",
    props: {},
    styles: {},
    position: { mode: "flow" },
    children: [
      {
        id: "sample",
        type: "Container",
        props: {},
        styles: { background: "#d5dae3", borderWidth: 1, borderColor: "#b3bccb", borderRadius: 4 },
        position: {
          mode: "free",
          x: { anchor: "end", offset: 20 },
          y: { anchor: "start", offset: 40 },
        },
        size: { w: { kind: "px", v: 160 }, h: { kind: "px", v: 96 } },
        rotation: 0,
        children: [],
      },
      {
        id: "sample-2",
        type: "Container",
        props: {},
        styles: { background: "#d5dae3", borderWidth: 1, borderColor: "#b3bccb", borderRadius: 4 },
        position: {
          mode: "free",
          x: { anchor: "start", offset: 40 },
          y: { anchor: "end", offset: 60 },
        },
        size: { w: { kind: "px", v: 200 }, h: { kind: "px", v: 64 } },
        rotation: 0,
        children: [],
      },
    ],
  },
};
