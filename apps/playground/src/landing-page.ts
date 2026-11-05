import type { PageData } from "@miditor/editor";

/** A landing page for the playground (`?landing`), built in the editor by hand with the blocks, the Warm theme and nothing else. */
export const LANDING_PAGE: PageData = {
  schemaVersion: 1,
  root: {
    id: "root",
    type: "Page",
    props: {},
    styles: {
      minHeight: 1600,
      background: "#fbf3e6",
    },
    position: {
      mode: "flow",
    },
    children: [
      {
        id: "n1",
        type: "Text",
        props: {
          text: "Roast & Co.",
          size: 26,
          color: "#3b2418",
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
            anchor: "scale",
            start: 5.0,
            size: 31.25,
          },
          y: {
            anchor: "start",
            offset: 26,
          },
        },
        size: {
          w: {
            kind: "px",
            v: 300,
          },
          h: {
            kind: "px",
            v: 44,
          },
        },
        rotation: 0,
        children: [],
      },
      {
        id: "n2",
        type: "Button",
        props: {
          label: "Subscribe",
          href: "",
          action: "",
          payload: {},
          fill: "#c2410c",
          textColor: "#ffffff",
          shape: "rounded",
          size: 16,
          font: "",
        },
        styles: {},
        position: {
          mode: "free",
          x: {
            anchor: "scale",
            start: 80.0,
            size: 15.0,
          },
          y: {
            anchor: "start",
            offset: 26,
          },
        },
        size: {
          w: {
            kind: "px",
            v: 144,
          },
          h: {
            kind: "px",
            v: 44,
          },
        },
        rotation: 0,
        children: [],
      },
      {
        id: "n3",
        type: "Container",
        props: {},
        styles: {
          background: "#e7b98c",
          borderRadius: 160,
        },
        position: {
          mode: "free",
          x: {
            anchor: "scale",
            start: 62.5,
            size: 32.5,
          },
          y: {
            anchor: "start",
            offset: 130,
          },
        },
        size: {
          w: {
            kind: "px",
            v: 120,
          },
          h: {
            kind: "px",
            v: 480,
          },
        },
        rotation: 0,
        children: [
          {
            id: "n4",
            type: "Container",
            props: {},
            styles: {
              background: "#3b2418",
              borderRadius: 56,
            },
            position: {
              mode: "free",
              x: {
                anchor: "scale",
                start: 32.051,
                size: 35.897,
              },
              y: {
                anchor: "start",
                offset: 120,
              },
            },
            size: {
              w: {
                kind: "px",
                v: 120,
              },
              h: {
                kind: "px",
                v: 112,
              },
            },
            rotation: 0,
            children: [],
          },
        ],
      },
      {
        id: "n5",
        type: "Text",
        props: {
          text: "FRESH-ROASTED, EVERY MONTH",
          size: 14,
          color: "#c2410c",
          bold: true,
          italic: false,
          underline: false,
          align: "left",
          font: "",
        },
        styles: {},
        position: {
          mode: "free",
          x: {
            anchor: "scale",
            start: 5.0,
            size: 54.166667,
          },
          y: {
            anchor: "start",
            offset: 150,
          },
        },
        size: {
          w: {
            kind: "px",
            v: 520,
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
        id: "n6",
        type: "Text",
        props: {
          text: "Coffee that arrives before you run out.",
          size: 52,
          color: "#3b2418",
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
            anchor: "scale",
            start: 5.0,
            size: 54.166667,
          },
          y: {
            anchor: "start",
            offset: 190,
          },
        },
        size: {
          w: {
            kind: "px",
            v: 520,
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
        id: "n7",
        type: "Text",
        props: {
          text: "Small-batch beans, roasted the week they ship. Pick your roast, pick your pace, skip or pause any time.",
          size: 18,
          color: "#5b4636",
          bold: false,
          italic: false,
          underline: false,
          align: "left",
          font: "",
        },
        styles: {},
        position: {
          mode: "free",
          x: {
            anchor: "scale",
            start: 5.0,
            size: 50.0,
          },
          y: {
            anchor: "start",
            offset: 445,
          },
        },
        size: {
          w: {
            kind: "px",
            v: 480,
          },
          h: {
            kind: "px",
            v: 90,
          },
        },
        rotation: 0,
        children: [],
      },
      {
        id: "n8",
        type: "Button",
        props: {
          label: "Start my first box",
          href: "",
          action: "",
          payload: {},
          fill: "#c2410c",
          textColor: "#ffffff",
          shape: "rounded",
          size: 16,
          font: "",
        },
        styles: {},
        position: {
          mode: "free",
          x: {
            anchor: "scale",
            start: 5.0,
            size: 22.916667,
          },
          y: {
            anchor: "start",
            offset: 555,
          },
        },
        size: {
          w: {
            kind: "px",
            v: 220,
          },
          h: {
            kind: "px",
            v: 56,
          },
        },
        rotation: 0,
        children: [],
      },
      {
        id: "n9",
        type: "Button",
        props: {
          label: "See how it works",
          href: "",
          action: "",
          payload: {},
          fill: "#f1e4d0",
          textColor: "#3b2418",
          shape: "rounded",
          size: 16,
          font: "",
        },
        styles: {},
        position: {
          mode: "free",
          x: {
            anchor: "scale",
            start: 29.583333,
            size: 20.833333,
          },
          y: {
            anchor: "start",
            offset: 555,
          },
        },
        size: {
          w: {
            kind: "px",
            v: 200,
          },
          h: {
            kind: "px",
            v: 56,
          },
        },
        rotation: 0,
        children: [],
      },
      {
        id: "n10",
        type: "Text",
        props: {
          text: "Three steps to better mornings",
          size: 36,
          color: "#3b2418",
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
            anchor: "scale",
            start: 5.0,
            size: 90.0,
          },
          y: {
            anchor: "start",
            offset: 690,
          },
        },
        size: {
          w: {
            kind: "px",
            v: 864,
          },
          h: {
            kind: "px",
            v: 56,
          },
        },
        rotation: 0,
        children: [],
      },
      {
        id: "n11",
        type: "Container",
        props: {},
        styles: {
          background: "#ffffff",
          borderRadius: 20,
          borderWidth: 1,
          borderColor: "#e8d9c3",
        },
        position: {
          mode: "free",
          x: {
            anchor: "scale",
            start: 5,
            size: 28.333,
          },
          y: {
            anchor: "start",
            offset: 780,
          },
        },
        size: {
          w: {
            kind: "px",
            v: 120,
          },
          h: {
            kind: "px",
            v: 270,
          },
        },
        rotation: 0,
        children: [
          {
            id: "n12",
            type: "Text",
            props: {
              text: "1. Choose your roast",
              size: 22,
              color: "#3b2418",
              bold: true,
              italic: false,
              underline: false,
              align: "left",
              font: "",
            },
            styles: {},
            position: {
              mode: "free",
              x: {
                anchor: "scale",
                start: 9.190696,
                size: 82.35391,
              },
              y: {
                anchor: "start",
                offset: 26,
              },
            },
            size: {
              w: {
                kind: "px",
                v: 224,
              },
              h: {
                kind: "px",
                v: 70,
              },
            },
            rotation: 0,
            children: [],
          },
          {
            id: "n13",
            type: "Text",
            props: {
              text: "Light, medium or dark. Tell us how you brew and we pick the beans that suit it.",
              size: 16,
              color: "#5b4636",
              bold: false,
              italic: false,
              underline: false,
              align: "left",
              font: "",
            },
            styles: {},
            position: {
              mode: "free",
              x: {
                anchor: "scale",
                start: 9.190696,
                size: 82.35391,
              },
              y: {
                anchor: "start",
                offset: 108,
              },
            },
            size: {
              w: {
                kind: "px",
                v: 224,
              },
              h: {
                kind: "px",
                v: 130,
              },
            },
            rotation: 0,
            children: [],
          },
        ],
      },
      {
        id: "n14",
        type: "Container",
        props: {},
        styles: {
          background: "#ffffff",
          borderRadius: 20,
          borderWidth: 1,
          borderColor: "#e8d9c3",
        },
        position: {
          mode: "free",
          x: {
            anchor: "scale",
            start: 35.833,
            size: 28.333,
          },
          y: {
            anchor: "start",
            offset: 780,
          },
        },
        size: {
          w: {
            kind: "px",
            v: 120,
          },
          h: {
            kind: "px",
            v: 270,
          },
        },
        rotation: 0,
        children: [
          {
            id: "n15",
            type: "Text",
            props: {
              text: "2. We roast and ship",
              size: 22,
              color: "#3b2418",
              bold: true,
              italic: false,
              underline: false,
              align: "left",
              font: "",
            },
            styles: {},
            position: {
              mode: "free",
              x: {
                anchor: "scale",
                start: 9.190696,
                size: 82.35391,
              },
              y: {
                anchor: "start",
                offset: 26,
              },
            },
            size: {
              w: {
                kind: "px",
                v: 224,
              },
              h: {
                kind: "px",
                v: 70,
              },
            },
            rotation: 0,
            children: [],
          },
          {
            id: "n16",
            type: "Text",
            props: {
              text: "Beans are roasted to order and posted the same week, so they reach you fresh.",
              size: 16,
              color: "#5b4636",
              bold: false,
              italic: false,
              underline: false,
              align: "left",
              font: "",
            },
            styles: {},
            position: {
              mode: "free",
              x: {
                anchor: "scale",
                start: 9.190696,
                size: 82.35391,
              },
              y: {
                anchor: "start",
                offset: 108,
              },
            },
            size: {
              w: {
                kind: "px",
                v: 224,
              },
              h: {
                kind: "px",
                v: 130,
              },
            },
            rotation: 0,
            children: [],
          },
        ],
      },
      {
        id: "n17",
        type: "Container",
        props: {},
        styles: {
          background: "#ffffff",
          borderRadius: 20,
          borderWidth: 1,
          borderColor: "#e8d9c3",
        },
        position: {
          mode: "free",
          x: {
            anchor: "scale",
            start: 66.667,
            size: 28.333,
          },
          y: {
            anchor: "start",
            offset: 780,
          },
        },
        size: {
          w: {
            kind: "px",
            v: 120,
          },
          h: {
            kind: "px",
            v: 270,
          },
        },
        rotation: 0,
        children: [
          {
            id: "n18",
            type: "Text",
            props: {
              text: "3. Change it any time",
              size: 22,
              color: "#3b2418",
              bold: true,
              italic: false,
              underline: false,
              align: "left",
              font: "",
            },
            styles: {},
            position: {
              mode: "free",
              x: {
                anchor: "scale",
                start: 9.190696,
                size: 82.35391,
              },
              y: {
                anchor: "start",
                offset: 26,
              },
            },
            size: {
              w: {
                kind: "px",
                v: 224,
              },
              h: {
                kind: "px",
                v: 70,
              },
            },
            rotation: 0,
            children: [],
          },
          {
            id: "n19",
            type: "Text",
            props: {
              text: "Skip a month, switch roast or pause. One click, no emails, no fees.",
              size: 16,
              color: "#5b4636",
              bold: false,
              italic: false,
              underline: false,
              align: "left",
              font: "",
            },
            styles: {},
            position: {
              mode: "free",
              x: {
                anchor: "scale",
                start: 9.190696,
                size: 82.35391,
              },
              y: {
                anchor: "start",
                offset: 108,
              },
            },
            size: {
              w: {
                kind: "px",
                v: 224,
              },
              h: {
                kind: "px",
                v: 130,
              },
            },
            rotation: 0,
            children: [],
          },
        ],
      },
      {
        id: "n20",
        type: "Container",
        props: {},
        styles: {
          background: "#3b2418",
          borderRadius: 28,
        },
        position: {
          mode: "free",
          x: {
            anchor: "scale",
            start: 5,
            size: 90,
          },
          y: {
            anchor: "start",
            offset: 1110,
          },
        },
        size: {
          w: {
            kind: "px",
            v: 120,
          },
          h: {
            kind: "px",
            v: 300,
          },
        },
        rotation: 0,
        children: [
          {
            id: "n21",
            type: "Text",
            props: {
              text: "Your first bag is on us",
              size: 40,
              color: "#fbf3e6",
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
                anchor: "scale",
                start: 5.555556,
                size: 53.240741,
              },
              y: {
                anchor: "start",
                offset: 40,
              },
            },
            size: {
              w: {
                kind: "px",
                v: 460,
              },
              h: {
                kind: "px",
                v: 130,
              },
            },
            rotation: 0,
            children: [],
          },
          {
            id: "n22",
            type: "Text",
            props: {
              text: "Try a 250g bag free. Love it? Keep it coming monthly. Not for you? Cancel before the second box.",
              size: 16,
              color: "#f1e4d0",
              bold: false,
              italic: false,
              underline: false,
              align: "left",
              font: "",
            },
            styles: {},
            position: {
              mode: "free",
              x: {
                anchor: "scale",
                start: 5.555556,
                size: 53.240741,
              },
              y: {
                anchor: "start",
                offset: 175,
              },
            },
            size: {
              w: {
                kind: "px",
                v: 460,
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
            id: "n23",
            type: "Button",
            props: {
              label: "Claim my free bag",
              href: "",
              action: "",
              payload: {},
              fill: "#c2410c",
              textColor: "#ffffff",
              shape: "rounded",
              size: 16,
              font: "",
            },
            styles: {},
            position: {
              mode: "free",
              x: {
                anchor: "scale",
                start: 5.555556,
                size: 25.462963,
              },
              y: {
                anchor: "start",
                offset: 238,
              },
            },
            size: {
              w: {
                kind: "px",
                v: 220,
              },
              h: {
                kind: "px",
                v: 52,
              },
            },
            rotation: 0,
            children: [],
          },
          {
            id: "n24",
            type: "Text",
            props: {
              text: "$14 / bag",
              size: 52,
              color: "#f2b27a",
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
                anchor: "scale",
                start: 66.203704,
                size: 28.935185,
              },
              y: {
                anchor: "start",
                offset: 80,
              },
            },
            size: {
              w: {
                kind: "px",
                v: 250,
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
            id: "n25",
            type: "Text",
            props: {
              text: "Free shipping. Cancel any time.",
              size: 16,
              color: "#f1e4d0",
              bold: false,
              italic: false,
              underline: false,
              align: "center",
              font: "",
            },
            styles: {},
            position: {
              mode: "free",
              x: {
                anchor: "scale",
                start: 66.203704,
                size: 28.935185,
              },
              y: {
                anchor: "start",
                offset: 170,
              },
            },
            size: {
              w: {
                kind: "px",
                v: 250,
              },
              h: {
                kind: "px",
                v: 40,
              },
            },
            rotation: 0,
            children: [],
          },
        ],
      },
      {
        id: "n26",
        type: "Text",
        props: {
          text: "© Roast & Co. Small-batch coffee, made slowly.",
          size: 14,
          color: "#5b4636",
          bold: false,
          italic: false,
          underline: false,
          align: "center",
          font: "",
        },
        styles: {},
        position: {
          mode: "free",
          x: {
            anchor: "scale",
            start: 5.0,
            size: 90.0,
          },
          y: {
            anchor: "start",
            offset: 1510,
          },
        },
        size: {
          w: {
            kind: "px",
            v: 864,
          },
          h: {
            kind: "px",
            v: 30,
          },
        },
        rotation: 0,
        children: [],
      },
    ],
  },
  theme: {
    colors: {
      primary: "#c2410c",
      accent: "#15803d",
      paper: "#fff7ed",
    },
    fonts: {
      body: "Poppins, system-ui, sans-serif",
    },
  },
  meta: {
    title: "Roast & Co. - fresh coffee, every month",
    description: "Small-batch coffee roasted the week it ships. Pick your roast and your pace.",
  },
};
