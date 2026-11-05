import type { PageData } from "@miditor/editor";

/** A landing page for `?landing=studio`: every block across is scaled with the page or stretched between two margins, none is pinned to a width in px. */
export const STUDIO_PAGE: PageData = {
  schemaVersion: 1,
  theme: {
    colors: {
      primary: "#0e7490",
      accent: "#f97316",
      paper: "#f5f1ea",
    },
    fonts: {
      body: "Inter, system-ui, sans-serif",
      heading: "Lora, Georgia, serif",
    },
  },
  meta: {
    title: "Fern & Co. - houseplants, delivered",
    description: "Healthy, easy-care houseplants delivered ready to place.",
  },
  root: {
    id: "root",
    type: "Page",
    props: {},
    styles: {
      minHeight: 1650,
      background: "#f5f1ea",
    },
    position: {
      mode: "flow",
    },
    children: [
      {
        id: "n1",
        type: "Text",
        props: {
          text: "Fern & Co.",
          size: 26,
          color: "#0f2a33",
          bold: true,
          italic: false,
          underline: false,
          align: "left",
          font: "Lora, Georgia, serif",
        },
        styles: {},
        position: {
          mode: "free",
          x: {
            anchor: "scale",
            start: 5,
            size: 40,
          },
          y: {
            anchor: "start",
            offset: 26,
          },
        },
        size: {
          w: {
            kind: "px",
            v: 120,
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
          label: "Visit the shop",
          href: "",
          action: "",
          payload: {},
          fill: "#0e7490",
          textColor: "#fdfaf4",
          shape: "pill",
          size: 16,
          font: "",
        },
        styles: {},
        position: {
          mode: "free",
          x: {
            anchor: "scale",
            start: 76,
            size: 19,
          },
          y: {
            anchor: "start",
            offset: 26,
          },
        },
        size: {
          w: {
            kind: "px",
            v: 120,
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
        type: "Text",
        props: {
          text: "HOUSEPLANTS, DELIVERED",
          size: 14,
          color: "#0e7490",
          bold: true,
          italic: false,
          underline: false,
          align: "center",
          font: "",
        },
        styles: {},
        position: {
          mode: "free",
          x: {
            anchor: "stretch",
            start: 48,
            end: 48,
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
            v: 24,
          },
        },
        rotation: 0,
        children: [],
      },
      {
        id: "n4",
        type: "Text",
        props: {
          text: "Plants that make a house feel like home",
          size: 52,
          color: "#0f2a33",
          bold: true,
          italic: false,
          underline: false,
          align: "center",
          font: "Lora, Georgia, serif",
        },
        styles: {},
        position: {
          mode: "free",
          x: {
            anchor: "stretch",
            start: 120,
            end: 120,
          },
          y: {
            anchor: "start",
            offset: 166,
          },
        },
        size: {
          w: {
            kind: "px",
            v: 120,
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
        id: "n5",
        type: "Text",
        props: {
          text: "Healthy, easy-care plants arrive pre-potted and ready to place. Tell us your light and we pick the ones that thrive.",
          size: 18,
          color: "#4b5d63",
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
            anchor: "stretch",
            start: 200,
            end: 200,
          },
          y: {
            anchor: "start",
            offset: 350,
          },
        },
        size: {
          w: {
            kind: "px",
            v: 120,
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
        id: "n6",
        type: "Button",
        props: {
          label: "Shop plants",
          href: "",
          action: "",
          payload: {},
          fill: "#0e7490",
          textColor: "#fdfaf4",
          shape: "pill",
          size: 16,
          font: "",
        },
        styles: {},
        position: {
          mode: "free",
          x: {
            anchor: "scale",
            start: 33,
            size: 16,
          },
          y: {
            anchor: "start",
            offset: 450,
          },
        },
        size: {
          w: {
            kind: "px",
            v: 120,
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
        id: "n7",
        type: "Button",
        props: {
          label: "Take the plant quiz",
          href: "",
          action: "",
          payload: {},
          fill: "#e0eef0",
          textColor: "#0f2a33",
          shape: "pill",
          size: 16,
          font: "",
        },
        styles: {},
        position: {
          mode: "free",
          x: {
            anchor: "scale",
            start: 51,
            size: 16,
          },
          y: {
            anchor: "start",
            offset: 450,
          },
        },
        size: {
          w: {
            kind: "px",
            v: 120,
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
        type: "Container",
        props: {},
        styles: {
          background: "#cfe8ec",
          borderRadius: 28,
        },
        position: {
          mode: "free",
          x: {
            anchor: "stretch",
            start: 48,
            end: 48,
          },
          y: {
            anchor: "start",
            offset: 540,
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
            id: "n8",
            type: "Text",
            props: {
              text: "Your photo goes here",
              size: 22,
              color: "#5b7f87",
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
                anchor: "stretch",
                start: 40,
                end: 40,
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
                v: 40,
              },
            },
            rotation: 0,
            children: [],
          },
        ],
      },
      {
        id: "n10",
        type: "Text",
        props: {
          text: "Why you will love them",
          size: 36,
          color: "#0f2a33",
          bold: true,
          italic: false,
          underline: false,
          align: "center",
          font: "Lora, Georgia, serif",
        },
        styles: {},
        position: {
          mode: "free",
          x: {
            anchor: "stretch",
            start: 48,
            end: 48,
          },
          y: {
            anchor: "start",
            offset: 900,
          },
        },
        size: {
          w: {
            kind: "px",
            v: 120,
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
        id: "n13",
        type: "Container",
        props: {},
        styles: {
          background: "#ffffff",
          borderRadius: 20,
          borderWidth: 1,
          borderColor: "#e3ddd1",
        },
        position: {
          mode: "free",
          x: {
            anchor: "scale",
            start: 5,
            size: 27.67,
          },
          y: {
            anchor: "start",
            offset: 990,
          },
        },
        size: {
          w: {
            kind: "px",
            v: 120,
          },
          h: {
            kind: "px",
            v: 250,
          },
        },
        rotation: 0,
        children: [
          {
            id: "n11",
            type: "Text",
            props: {
              text: "Easy to keep alive",
              size: 22,
              color: "#0f2a33",
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
                anchor: "stretch",
                start: 24,
                end: 24,
              },
              y: {
                anchor: "start",
                offset: 28,
              },
            },
            size: {
              w: {
                kind: "px",
                v: 120,
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
            id: "n12",
            type: "Text",
            props: {
              text: "Every plant comes with a care card for your light and your habits, so a missed week is fine.",
              size: 16,
              color: "#4b5d63",
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
                anchor: "stretch",
                start: 24,
                end: 24,
              },
              y: {
                anchor: "start",
                offset: 78,
              },
            },
            size: {
              w: {
                kind: "px",
                v: 120,
              },
              h: {
                kind: "px",
                v: 140,
              },
            },
            rotation: 0,
            children: [],
          },
        ],
      },
      {
        id: "n16",
        type: "Container",
        props: {},
        styles: {
          background: "#ffffff",
          borderRadius: 20,
          borderWidth: 1,
          borderColor: "#e3ddd1",
        },
        position: {
          mode: "free",
          x: {
            anchor: "scale",
            start: 36.17,
            size: 27.67,
          },
          y: {
            anchor: "start",
            offset: 990,
          },
        },
        size: {
          w: {
            kind: "px",
            v: 120,
          },
          h: {
            kind: "px",
            v: 250,
          },
        },
        rotation: 0,
        children: [
          {
            id: "n14",
            type: "Text",
            props: {
              text: "Arrives ready to place",
              size: 22,
              color: "#0f2a33",
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
                anchor: "stretch",
                start: 24,
                end: 24,
              },
              y: {
                anchor: "start",
                offset: 28,
              },
            },
            size: {
              w: {
                kind: "px",
                v: 120,
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
            id: "n15",
            type: "Text",
            props: {
              text: "Pre-potted in a clean pot, packed so leaves arrive fresh. Just open the box and set it down.",
              size: 16,
              color: "#4b5d63",
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
                anchor: "stretch",
                start: 24,
                end: 24,
              },
              y: {
                anchor: "start",
                offset: 78,
              },
            },
            size: {
              w: {
                kind: "px",
                v: 120,
              },
              h: {
                kind: "px",
                v: 140,
              },
            },
            rotation: 0,
            children: [],
          },
        ],
      },
      {
        id: "n19",
        type: "Container",
        props: {},
        styles: {
          background: "#ffffff",
          borderRadius: 20,
          borderWidth: 1,
          borderColor: "#e3ddd1",
        },
        position: {
          mode: "free",
          x: {
            anchor: "scale",
            start: 67.33,
            size: 27.67,
          },
          y: {
            anchor: "start",
            offset: 990,
          },
        },
        size: {
          w: {
            kind: "px",
            v: 120,
          },
          h: {
            kind: "px",
            v: 250,
          },
        },
        rotation: 0,
        children: [
          {
            id: "n17",
            type: "Text",
            props: {
              text: "Swap if it sulks",
              size: 22,
              color: "#0f2a33",
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
                anchor: "stretch",
                start: 24,
                end: 24,
              },
              y: {
                anchor: "start",
                offset: 28,
              },
            },
            size: {
              w: {
                kind: "px",
                v: 120,
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
            id: "n18",
            type: "Text",
            props: {
              text: "If a plant is not happy within 30 days we send a replacement. No photos, no forms.",
              size: 16,
              color: "#4b5d63",
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
                anchor: "stretch",
                start: 24,
                end: 24,
              },
              y: {
                anchor: "start",
                offset: 78,
              },
            },
            size: {
              w: {
                kind: "px",
                v: 120,
              },
              h: {
                kind: "px",
                v: 140,
              },
            },
            rotation: 0,
            children: [],
          },
        ],
      },
      {
        id: "n23",
        type: "Container",
        props: {},
        styles: {
          background: "#0f2a33",
          borderRadius: 28,
        },
        position: {
          mode: "free",
          x: {
            anchor: "stretch",
            start: 48,
            end: 48,
          },
          y: {
            anchor: "start",
            offset: 1300,
          },
        },
        size: {
          w: {
            kind: "px",
            v: 120,
          },
          h: {
            kind: "px",
            v: 220,
          },
        },
        rotation: 0,
        children: [
          {
            id: "n20",
            type: "Text",
            props: {
              text: "Not sure where to start?",
              size: 34,
              color: "#fdfaf4",
              bold: true,
              italic: false,
              underline: false,
              align: "left",
              font: "Lora, Georgia, serif",
            },
            styles: {},
            position: {
              mode: "free",
              x: {
                anchor: "stretch",
                start: 48,
                end: 300,
              },
              y: {
                anchor: "start",
                offset: 40,
              },
            },
            size: {
              w: {
                kind: "px",
                v: 120,
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
            id: "n21",
            type: "Text",
            props: {
              text: "Answer four quick questions and we will pick three plants for your home.",
              size: 16,
              color: "#cfe0e4",
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
                anchor: "stretch",
                start: 48,
                end: 300,
              },
              y: {
                anchor: "start",
                offset: 140,
              },
            },
            size: {
              w: {
                kind: "px",
                v: 120,
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
            id: "n22",
            type: "Button",
            props: {
              label: "Take the quiz",
              href: "",
              action: "",
              payload: {},
              fill: "#f97316",
              textColor: "#0f2a33",
              shape: "pill",
              size: 16,
              font: "",
            },
            styles: {},
            position: {
              mode: "free",
              x: {
                anchor: "scale",
                start: 72,
                size: 22,
              },
              y: {
                anchor: "start",
                offset: 82,
              },
            },
            size: {
              w: {
                kind: "px",
                v: 120,
              },
              h: {
                kind: "px",
                v: 56,
              },
            },
            rotation: 0,
            children: [],
          },
        ],
      },
      {
        id: "n24",
        type: "Text",
        props: {
          text: "© Fern & Co. Plants for people who forget to water.",
          size: 14,
          color: "#4b5d63",
          bold: "",
          italic: false,
          underline: false,
          align: "center",
          font: "",
        },
        styles: {},
        position: {
          mode: "free",
          x: {
            anchor: "stretch",
            start: 48,
            end: 48,
          },
          y: {
            anchor: "start",
            offset: 1580,
          },
        },
        size: {
          w: {
            kind: "px",
            v: 120,
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
};
