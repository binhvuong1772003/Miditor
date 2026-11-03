import type { PageData } from "@miditor/editor";

/** A landing page with only the desktop layout set (`?landing=coffee`), to see what a phone does on its own. */
export const COFFEE_PAGE: PageData = {
  schemaVersion: 1,
  theme: {
    colors: {
      primary: "#92400e",
      accent: "#b45309",
      paper: "#fef3c7",
    },
    fonts: {
      body: "Inter, system-ui, sans-serif",
      heading: "'Playfair Display', Georgia, serif",
    },
  },
  meta: {
    title: "Ember Coffee",
    description: "A throwaway landing page with no phone layout",
  },
  root: {
    id: "root",
    type: "Page",
    props: {},
    styles: {
      background: "#fef3c7",
      minHeight: 1720,
    },
    position: {
      mode: "flow",
    },
    children: [
      {
        id: "t1",
        type: "Text",
        props: {
          text: "Ember Coffee",
          size: 24,
          color: "#92400e",
          bold: true,
          italic: false,
          underline: false,
          align: "left",
          font: "'Playfair Display', Georgia, serif",
        },
        styles: {},
        position: {
          mode: "free",
          x: {
            anchor: "start",
            offset: 48,
          },
          y: {
            anchor: "start",
            offset: 24,
          },
        },
        size: {
          w: {
            kind: "px",
            v: 240,
          },
          h: {
            kind: "px",
            v: 36,
          },
        },
        rotation: 0,
        children: [],
      },
      {
        id: "b2",
        type: "Button",
        props: {
          label: "Shop beans",
          href: "",
          action: "",
          payload: {},
          fill: "#92400e",
          textColor: "#ffffff",
          shape: "pill",
          size: 16,
          font: "Inter, system-ui, sans-serif",
        },
        styles: {},
        position: {
          mode: "free",
          x: {
            anchor: "start",
            offset: 788,
          },
          y: {
            anchor: "start",
            offset: 22,
          },
        },
        size: {
          w: {
            kind: "px",
            v: 124,
          },
          h: {
            kind: "px",
            v: 40,
          },
        },
        rotation: 0,
        children: [],
      },
      {
        id: "t3",
        type: "Text",
        props: {
          text: "SMALL-BATCH ROASTERY",
          size: 13,
          color: "#b45309",
          bold: true,
          italic: false,
          underline: false,
          align: "center",
          font: "Inter, system-ui, sans-serif",
        },
        styles: {},
        position: {
          mode: "free",
          x: {
            anchor: "start",
            offset: 48,
          },
          y: {
            anchor: "start",
            offset: 124,
          },
        },
        size: {
          w: {
            kind: "px",
            v: 864,
          },
          h: {
            kind: "px",
            v: 22,
          },
        },
        rotation: 0,
        children: [],
      },
      {
        id: "t4",
        type: "Text",
        props: {
          text: "Coffee roasted this week, at your door.",
          size: 54,
          color: "#78350f",
          bold: true,
          italic: false,
          underline: false,
          align: "center",
          font: "'Playfair Display', Georgia, serif",
        },
        styles: {},
        position: {
          mode: "free",
          x: {
            anchor: "start",
            offset: 100,
          },
          y: {
            anchor: "start",
            offset: 160,
          },
        },
        size: {
          w: {
            kind: "px",
            v: 760,
          },
          h: {
            kind: "px",
            v: 150,
          },
        },
        rotation: 0,
        children: [],
      },
      {
        id: "t5",
        type: "Text",
        props: {
          text: "Single-origin beans, roasted in small batches every Monday and shipped fresh within 48 hours.",
          size: 18,
          color: "#475569",
          bold: false,
          italic: false,
          underline: false,
          align: "center",
          font: "Inter, system-ui, sans-serif",
        },
        styles: {},
        position: {
          mode: "free",
          x: {
            anchor: "start",
            offset: 170,
          },
          y: {
            anchor: "start",
            offset: 330,
          },
        },
        size: {
          w: {
            kind: "px",
            v: 620,
          },
          h: {
            kind: "px",
            v: 60,
          },
        },
        rotation: 0,
        children: [],
      },
      {
        id: "b6",
        type: "Button",
        props: {
          label: "Shop this week's roast",
          href: "",
          action: "",
          payload: {},
          fill: "#92400e",
          textColor: "#ffffff",
          shape: "pill",
          size: 16,
          font: "Inter, system-ui, sans-serif",
        },
        styles: {},
        position: {
          mode: "free",
          x: {
            anchor: "start",
            offset: 290,
          },
          y: {
            anchor: "start",
            offset: 420,
          },
        },
        size: {
          w: {
            kind: "px",
            v: 210,
          },
          h: {
            kind: "px",
            v: 50,
          },
        },
        rotation: 0,
        children: [],
      },
      {
        id: "b7",
        type: "Button",
        props: {
          label: "How we roast",
          href: "",
          action: "",
          payload: {},
          fill: "#fef3c7",
          textColor: "#92400e",
          shape: "pill",
          size: 16,
          font: "Inter, system-ui, sans-serif",
        },
        styles: {},
        position: {
          mode: "free",
          x: {
            anchor: "start",
            offset: 520,
          },
          y: {
            anchor: "start",
            offset: 420,
          },
        },
        size: {
          w: {
            kind: "px",
            v: 150,
          },
          h: {
            kind: "px",
            v: 50,
          },
        },
        rotation: 0,
        children: [],
      },
      {
        id: "s8",
        type: "Shape",
        props: {
          shape: "ellipse",
          fill: "#92400e",
        },
        styles: {},
        position: {
          mode: "free",
          x: {
            anchor: "start",
            offset: 360,
          },
          y: {
            anchor: "start",
            offset: 520,
          },
        },
        size: {
          w: {
            kind: "px",
            v: 240,
          },
          h: {
            kind: "px",
            v: 240,
          },
        },
        rotation: 0,
        children: [],
      },
      {
        id: "s9",
        type: "Shape",
        props: {
          shape: "ellipse",
          fill: "#fef3c7",
        },
        styles: {},
        position: {
          mode: "free",
          x: {
            anchor: "start",
            offset: 390,
          },
          y: {
            anchor: "start",
            offset: 550,
          },
        },
        size: {
          w: {
            kind: "px",
            v: 180,
          },
          h: {
            kind: "px",
            v: 180,
          },
        },
        rotation: 0,
        children: [],
      },
      {
        id: "s10",
        type: "Shape",
        props: {
          shape: "ellipse",
          fill: "#78350f",
        },
        styles: {},
        position: {
          mode: "free",
          x: {
            anchor: "start",
            offset: 410,
          },
          y: {
            anchor: "start",
            offset: 570,
          },
        },
        size: {
          w: {
            kind: "px",
            v: 140,
          },
          h: {
            kind: "px",
            v: 140,
          },
        },
        rotation: 0,
        children: [],
      },
      {
        id: "s11",
        type: "Shape",
        props: {
          shape: "ellipse",
          fill: "#78350f",
        },
        styles: {},
        position: {
          mode: "free",
          x: {
            anchor: "start",
            offset: 300,
          },
          y: {
            anchor: "start",
            offset: 560,
          },
        },
        size: {
          w: {
            kind: "px",
            v: 28,
          },
          h: {
            kind: "px",
            v: 46,
          },
        },
        rotation: 25,
        children: [],
      },
      {
        id: "s12",
        type: "Shape",
        props: {
          shape: "ellipse",
          fill: "#78350f",
        },
        styles: {},
        position: {
          mode: "free",
          x: {
            anchor: "start",
            offset: 640,
          },
          y: {
            anchor: "start",
            offset: 590,
          },
        },
        size: {
          w: {
            kind: "px",
            v: 28,
          },
          h: {
            kind: "px",
            v: 46,
          },
        },
        rotation: -20,
        children: [],
      },
      {
        id: "s13",
        type: "Shape",
        props: {
          shape: "ellipse",
          fill: "#b45309",
        },
        styles: {},
        position: {
          mode: "free",
          x: {
            anchor: "start",
            offset: 330,
          },
          y: {
            anchor: "start",
            offset: 690,
          },
        },
        size: {
          w: {
            kind: "px",
            v: 24,
          },
          h: {
            kind: "px",
            v: 40,
          },
        },
        rotation: -35,
        children: [],
      },
      {
        id: "s14",
        type: "Shape",
        props: {
          shape: "ellipse",
          fill: "#b45309",
        },
        styles: {},
        position: {
          mode: "free",
          x: {
            anchor: "start",
            offset: 615,
          },
          y: {
            anchor: "start",
            offset: 520,
          },
        },
        size: {
          w: {
            kind: "px",
            v: 24,
          },
          h: {
            kind: "px",
            v: 40,
          },
        },
        rotation: 15,
        children: [],
      },
      {
        id: "t15",
        type: "Text",
        props: {
          text: "Why it tastes different",
          size: 34,
          color: "#78350f",
          bold: true,
          italic: false,
          underline: false,
          align: "center",
          font: "'Playfair Display', Georgia, serif",
        },
        styles: {},
        position: {
          mode: "free",
          x: {
            anchor: "start",
            offset: 48,
          },
          y: {
            anchor: "start",
            offset: 830,
          },
        },
        size: {
          w: {
            kind: "px",
            v: 864,
          },
          h: {
            kind: "px",
            v: 48,
          },
        },
        rotation: 0,
        children: [],
      },
      {
        id: "c16",
        type: "Container",
        props: {},
        styles: {
          background: "#ffffff",
          borderWidth: 1,
          borderColor: "#fde68a",
          borderRadius: 16,
          shadow: {
            x: 0,
            y: 4,
            blur: 16,
            spread: 0,
            color: "#78350f",
            opacity: 12,
          },
        },
        position: {
          mode: "free",
          x: {
            anchor: "start",
            offset: 48,
          },
          y: {
            anchor: "start",
            offset: 910,
          },
        },
        size: {
          w: {
            kind: "px",
            v: 272,
          },
          h: {
            kind: "px",
            v: 210,
          },
        },
        rotation: 0,
        children: [],
      },
      {
        id: "s17",
        type: "Shape",
        props: {
          shape: "ellipse",
          fill: "#b45309",
        },
        styles: {},
        position: {
          mode: "free",
          x: {
            anchor: "start",
            offset: 72,
          },
          y: {
            anchor: "start",
            offset: 934,
          },
        },
        size: {
          w: {
            kind: "px",
            v: 36,
          },
          h: {
            kind: "px",
            v: 36,
          },
        },
        rotation: 0,
        children: [],
      },
      {
        id: "t18",
        type: "Text",
        props: {
          text: "Roasted to order",
          size: 20,
          color: "#78350f",
          bold: true,
          italic: false,
          underline: false,
          align: "left",
          font: "'Playfair Display', Georgia, serif",
        },
        styles: {},
        position: {
          mode: "free",
          x: {
            anchor: "start",
            offset: 72,
          },
          y: {
            anchor: "start",
            offset: 988,
          },
        },
        size: {
          w: {
            kind: "px",
            v: 224,
          },
          h: {
            kind: "px",
            v: 30,
          },
        },
        rotation: 0,
        children: [],
      },
      {
        id: "t19",
        type: "Text",
        props: {
          text: "We roast on Monday and ship on Tuesday, so the beans reach you at their peak.",
          size: 14,
          color: "#475569",
          bold: false,
          italic: false,
          underline: false,
          align: "left",
          font: "Inter, system-ui, sans-serif",
        },
        styles: {},
        position: {
          mode: "free",
          x: {
            anchor: "start",
            offset: 72,
          },
          y: {
            anchor: "start",
            offset: 1026,
          },
        },
        size: {
          w: {
            kind: "px",
            v: 224,
          },
          h: {
            kind: "px",
            v: 80,
          },
        },
        rotation: 0,
        children: [],
      },
      {
        id: "c20",
        type: "Container",
        props: {},
        styles: {
          background: "#ffffff",
          borderWidth: 1,
          borderColor: "#fde68a",
          borderRadius: 16,
          shadow: {
            x: 0,
            y: 4,
            blur: 16,
            spread: 0,
            color: "#78350f",
            opacity: 12,
          },
        },
        position: {
          mode: "free",
          x: {
            anchor: "start",
            offset: 344,
          },
          y: {
            anchor: "start",
            offset: 910,
          },
        },
        size: {
          w: {
            kind: "px",
            v: 272,
          },
          h: {
            kind: "px",
            v: 210,
          },
        },
        rotation: 0,
        children: [],
      },
      {
        id: "s21",
        type: "Shape",
        props: {
          shape: "ellipse",
          fill: "#b45309",
        },
        styles: {},
        position: {
          mode: "free",
          x: {
            anchor: "start",
            offset: 368,
          },
          y: {
            anchor: "start",
            offset: 934,
          },
        },
        size: {
          w: {
            kind: "px",
            v: 36,
          },
          h: {
            kind: "px",
            v: 36,
          },
        },
        rotation: 0,
        children: [],
      },
      {
        id: "t22",
        type: "Text",
        props: {
          text: "Sourced with care",
          size: 20,
          color: "#78350f",
          bold: true,
          italic: false,
          underline: false,
          align: "left",
          font: "'Playfair Display', Georgia, serif",
        },
        styles: {},
        position: {
          mode: "free",
          x: {
            anchor: "start",
            offset: 368,
          },
          y: {
            anchor: "start",
            offset: 988,
          },
        },
        size: {
          w: {
            kind: "px",
            v: 224,
          },
          h: {
            kind: "px",
            v: 30,
          },
        },
        rotation: 0,
        children: [],
      },
      {
        id: "t23",
        type: "Text",
        props: {
          text: "Every bean comes from a farm we have visited, paid above fair-trade prices.",
          size: 14,
          color: "#475569",
          bold: false,
          italic: false,
          underline: false,
          align: "left",
          font: "Inter, system-ui, sans-serif",
        },
        styles: {},
        position: {
          mode: "free",
          x: {
            anchor: "start",
            offset: 368,
          },
          y: {
            anchor: "start",
            offset: 1026,
          },
        },
        size: {
          w: {
            kind: "px",
            v: 224,
          },
          h: {
            kind: "px",
            v: 80,
          },
        },
        rotation: 0,
        children: [],
      },
      {
        id: "c24",
        type: "Container",
        props: {},
        styles: {
          background: "#ffffff",
          borderWidth: 1,
          borderColor: "#fde68a",
          borderRadius: 16,
          shadow: {
            x: 0,
            y: 4,
            blur: 16,
            spread: 0,
            color: "#78350f",
            opacity: 12,
          },
        },
        position: {
          mode: "free",
          x: {
            anchor: "start",
            offset: 640,
          },
          y: {
            anchor: "start",
            offset: 910,
          },
        },
        size: {
          w: {
            kind: "px",
            v: 272,
          },
          h: {
            kind: "px",
            v: 210,
          },
        },
        rotation: 0,
        children: [],
      },
      {
        id: "s25",
        type: "Shape",
        props: {
          shape: "ellipse",
          fill: "#b45309",
        },
        styles: {},
        position: {
          mode: "free",
          x: {
            anchor: "start",
            offset: 664,
          },
          y: {
            anchor: "start",
            offset: 934,
          },
        },
        size: {
          w: {
            kind: "px",
            v: 36,
          },
          h: {
            kind: "px",
            v: 36,
          },
        },
        rotation: 0,
        children: [],
      },
      {
        id: "t26",
        type: "Text",
        props: {
          text: "Fresh in 48 hours",
          size: 20,
          color: "#78350f",
          bold: true,
          italic: false,
          underline: false,
          align: "left",
          font: "'Playfair Display', Georgia, serif",
        },
        styles: {},
        position: {
          mode: "free",
          x: {
            anchor: "start",
            offset: 664,
          },
          y: {
            anchor: "start",
            offset: 988,
          },
        },
        size: {
          w: {
            kind: "px",
            v: 224,
          },
          h: {
            kind: "px",
            v: 30,
          },
        },
        rotation: 0,
        children: [],
      },
      {
        id: "t27",
        type: "Text",
        props: {
          text: "Packed in resealable bags with a roast date you can read, not a best-before guess.",
          size: 14,
          color: "#475569",
          bold: false,
          italic: false,
          underline: false,
          align: "left",
          font: "Inter, system-ui, sans-serif",
        },
        styles: {},
        position: {
          mode: "free",
          x: {
            anchor: "start",
            offset: 664,
          },
          y: {
            anchor: "start",
            offset: 1026,
          },
        },
        size: {
          w: {
            kind: "px",
            v: 224,
          },
          h: {
            kind: "px",
            v: 80,
          },
        },
        rotation: 0,
        children: [],
      },
      {
        id: "c28",
        type: "Container",
        props: {},
        styles: {
          background: "#ffffff",
          borderWidth: 1,
          borderColor: "#fde68a",
          borderRadius: 20,
          shadow: {
            x: 0,
            y: 4,
            blur: 16,
            spread: 0,
            color: "#78350f",
            opacity: 12,
          },
        },
        position: {
          mode: "free",
          x: {
            anchor: "start",
            offset: 144,
          },
          y: {
            anchor: "start",
            offset: 1190,
          },
        },
        size: {
          w: {
            kind: "px",
            v: 672,
          },
          h: {
            kind: "px",
            v: 170,
          },
        },
        rotation: 0,
        children: [],
      },
      {
        id: "t29",
        type: "Text",
        props: {
          text: "“The best cup I have had at home, and it arrives while the roast is still young.”",
          size: 22,
          color: "#78350f",
          bold: false,
          italic: true,
          underline: false,
          align: "center",
          font: "'Playfair Display', Georgia, serif",
        },
        styles: {},
        position: {
          mode: "free",
          x: {
            anchor: "start",
            offset: 184,
          },
          y: {
            anchor: "start",
            offset: 1222,
          },
        },
        size: {
          w: {
            kind: "px",
            v: 592,
          },
          h: {
            kind: "px",
            v: 80,
          },
        },
        rotation: 0,
        children: [],
      },
      {
        id: "t30",
        type: "Text",
        props: {
          text: "Linh T., subscriber since 2024",
          size: 14,
          color: "#b45309",
          bold: true,
          italic: false,
          underline: false,
          align: "center",
          font: "Inter, system-ui, sans-serif",
        },
        styles: {},
        position: {
          mode: "free",
          x: {
            anchor: "start",
            offset: 184,
          },
          y: {
            anchor: "start",
            offset: 1318,
          },
        },
        size: {
          w: {
            kind: "px",
            v: 592,
          },
          h: {
            kind: "px",
            v: 24,
          },
        },
        rotation: 0,
        children: [],
      },
      {
        id: "t31",
        type: "Text",
        props: {
          text: "Never run out of good coffee.",
          size: 40,
          color: "#78350f",
          bold: true,
          italic: false,
          underline: false,
          align: "center",
          font: "'Playfair Display', Georgia, serif",
        },
        styles: {},
        position: {
          mode: "free",
          x: {
            anchor: "start",
            offset: 100,
          },
          y: {
            anchor: "start",
            offset: 1430,
          },
        },
        size: {
          w: {
            kind: "px",
            v: 760,
          },
          h: {
            kind: "px",
            v: 60,
          },
        },
        rotation: 0,
        children: [],
      },
      {
        id: "t32",
        type: "Text",
        props: {
          text: "Pick your beans once, change or pause any time.",
          size: 17,
          color: "#475569",
          bold: false,
          italic: false,
          underline: false,
          align: "center",
          font: "Inter, system-ui, sans-serif",
        },
        styles: {},
        position: {
          mode: "free",
          x: {
            anchor: "start",
            offset: 48,
          },
          y: {
            anchor: "start",
            offset: 1504,
          },
        },
        size: {
          w: {
            kind: "px",
            v: 864,
          },
          h: {
            kind: "px",
            v: 28,
          },
        },
        rotation: 0,
        children: [],
      },
      {
        id: "b33",
        type: "Button",
        props: {
          label: "Start a subscription",
          href: "",
          action: "",
          payload: {},
          fill: "#b45309",
          textColor: "#ffffff",
          shape: "pill",
          size: 16,
          font: "Inter, system-ui, sans-serif",
        },
        styles: {},
        position: {
          mode: "free",
          x: {
            anchor: "start",
            offset: 360,
          },
          y: {
            anchor: "start",
            offset: 1556,
          },
        },
        size: {
          w: {
            kind: "px",
            v: 240,
          },
          h: {
            kind: "px",
            v: 54,
          },
        },
        rotation: 0,
        children: [],
      },
      {
        id: "t34",
        type: "Text",
        props: {
          text: "Ember Coffee · a throwaway page made with Miditor, with no phone layout set",
          size: 13,
          color: "#475569",
          bold: false,
          italic: false,
          underline: false,
          align: "center",
          font: "Inter, system-ui, sans-serif",
        },
        styles: {},
        position: {
          mode: "free",
          x: {
            anchor: "start",
            offset: 48,
          },
          y: {
            anchor: "start",
            offset: 1650,
          },
        },
        size: {
          w: {
            kind: "px",
            v: 864,
          },
          h: {
            kind: "px",
            v: 24,
          },
        },
        rotation: 0,
        children: [],
      },
    ],
  },
};
