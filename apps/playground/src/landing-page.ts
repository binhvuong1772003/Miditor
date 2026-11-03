import type { PageData } from "@miditor/editor";

/** A throwaway landing page made for the playground (`?landing`), to try the editor on a real page. */
export const LANDING_PAGE: PageData = {
  schemaVersion: 1,
  theme: {
    colors: {
      primary: "#22c55e",
      accent: "#1e293b",
      paper: "#0f172a",
    },
    fonts: {
      body: "Inter, system-ui, sans-serif",
      heading: "Inter, system-ui, sans-serif",
    },
  },
  meta: {
    title: "Miditor landing page",
    description: "A throwaway landing page made with Miditor",
  },
  root: {
    id: "root",
    type: "Page",
    props: {},
    styles: {
      background: "#0f172a",
      minHeight: 1760,
    },
    position: {
      mode: "flow",
    },
    children: [
      {
        id: "t1",
        type: "Text",
        props: {
          text: "Miditor",
          size: 22,
          color: "#f8fafc",
          bold: true,
          italic: false,
          underline: false,
          align: "left",
          font: "'Roboto Mono', ui-monospace, monospace",
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
            v: 200,
          },
          h: {
            kind: "px",
            v: 32,
          },
        },
        rotation: 0,
        children: [],
        phone: {
          x: {
            anchor: "start",
            offset: 16,
          },
          y: {
            anchor: "start",
            offset: 20,
          },
          w: {
            kind: "px",
            v: 140,
          },
          h: {
            kind: "px",
            v: 32,
          },
          rotation: 0,
        },
        phoneProps: {
          size: 20,
        },
      },
      {
        id: "b2",
        type: "Button",
        props: {
          label: "Get started",
          href: "",
          action: "",
          payload: {},
          fill: "#22c55e",
          textColor: "#0f172a",
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
            offset: 20,
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
        phone: {
          x: {
            anchor: "start",
            offset: 227,
          },
          y: {
            anchor: "start",
            offset: 16,
          },
          w: {
            kind: "px",
            v: 132,
          },
          h: {
            kind: "px",
            v: 40,
          },
          rotation: 0,
        },
      },
      {
        id: "c3",
        type: "Container",
        props: {},
        styles: {
          background: "#334155",
        },
        position: {
          mode: "free",
          x: {
            anchor: "start",
            offset: 48,
          },
          y: {
            anchor: "start",
            offset: 76,
          },
        },
        size: {
          w: {
            kind: "px",
            v: 864,
          },
          h: {
            kind: "px",
            v: 1,
          },
        },
        rotation: 0,
        children: [],
        phone: {
          x: {
            anchor: "start",
            offset: 16,
          },
          y: {
            anchor: "start",
            offset: 72,
          },
          w: {
            kind: "px",
            v: 343,
          },
          h: {
            kind: "px",
            v: 1,
          },
          rotation: 0,
        },
      },
      {
        id: "t4",
        type: "Text",
        props: {
          text: "EMBEDDABLE PAGE EDITOR",
          size: 13,
          color: "#22c55e",
          bold: false,
          italic: false,
          underline: false,
          align: "center",
          font: "'Roboto Mono', ui-monospace, monospace",
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
            offset: 128,
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
        phone: {
          x: {
            anchor: "start",
            offset: 16,
          },
          y: {
            anchor: "start",
            offset: 112,
          },
          w: {
            kind: "px",
            v: 343,
          },
          h: {
            kind: "px",
            v: 22,
          },
          rotation: 0,
        },
        phoneProps: {
          size: 12,
        },
      },
      {
        id: "t5",
        type: "Text",
        props: {
          text: "Let your users build pages, not tickets.",
          size: 52,
          color: "#f8fafc",
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
            offset: 100,
          },
          y: {
            anchor: "start",
            offset: 168,
          },
        },
        size: {
          w: {
            kind: "px",
            v: 760,
          },
          h: {
            kind: "px",
            v: 140,
          },
        },
        rotation: 0,
        children: [],
        phone: {
          x: {
            anchor: "start",
            offset: 16,
          },
          y: {
            anchor: "start",
            offset: 144,
          },
          w: {
            kind: "px",
            v: 343,
          },
          h: {
            kind: "px",
            v: 124,
          },
          rotation: 0,
        },
        phoneProps: {
          size: 32,
        },
      },
      {
        id: "t6",
        type: "Text",
        props: {
          text: "Drop a drag-and-drop page editor into your product. Your users place, resize and style blocks; you keep full control.",
          size: 18,
          color: "#94a3b8",
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
            v: 64,
          },
        },
        rotation: 0,
        children: [],
        phone: {
          x: {
            anchor: "start",
            offset: 16,
          },
          y: {
            anchor: "start",
            offset: 284,
          },
          w: {
            kind: "px",
            v: 343,
          },
          h: {
            kind: "px",
            v: 80,
          },
          rotation: 0,
        },
        phoneProps: {
          size: 16,
        },
      },
      {
        id: "b7",
        type: "Button",
        props: {
          label: "Start building",
          href: "",
          action: "",
          payload: {},
          fill: "#22c55e",
          textColor: "#0f172a",
          shape: "pill",
          size: 16,
          font: "Inter, system-ui, sans-serif",
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
            offset: 430,
          },
        },
        size: {
          w: {
            kind: "px",
            v: 170,
          },
          h: {
            kind: "px",
            v: 48,
          },
        },
        rotation: 0,
        children: [],
        phone: {
          x: {
            anchor: "start",
            offset: 16,
          },
          y: {
            anchor: "start",
            offset: 388,
          },
          w: {
            kind: "px",
            v: 343,
          },
          h: {
            kind: "px",
            v: 48,
          },
          rotation: 0,
        },
      },
      {
        id: "b8",
        type: "Button",
        props: {
          label: "Read the docs",
          href: "",
          action: "",
          payload: {},
          fill: "#1e293b",
          textColor: "#f8fafc",
          shape: "pill",
          size: 16,
          font: "Inter, system-ui, sans-serif",
        },
        styles: {},
        position: {
          mode: "free",
          x: {
            anchor: "start",
            offset: 490,
          },
          y: {
            anchor: "start",
            offset: 430,
          },
        },
        size: {
          w: {
            kind: "px",
            v: 170,
          },
          h: {
            kind: "px",
            v: 48,
          },
        },
        rotation: 0,
        children: [],
        phone: {
          x: {
            anchor: "start",
            offset: 16,
          },
          y: {
            anchor: "start",
            offset: 448,
          },
          w: {
            kind: "px",
            v: 343,
          },
          h: {
            kind: "px",
            v: 48,
          },
          rotation: 0,
        },
      },
      {
        id: "c9",
        type: "Container",
        props: {},
        styles: {
          background: "#1b2336",
          borderWidth: 1,
          borderColor: "#475569",
          borderRadius: 16,
          shadow: {
            x: 0,
            y: 0,
            blur: 40,
            spread: 0,
            color: "#22c55e",
            opacity: 20,
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
            offset: 520,
          },
        },
        size: {
          w: {
            kind: "px",
            v: 864,
          },
          h: {
            kind: "px",
            v: 280,
          },
        },
        rotation: 0,
        children: [],
        phone: {
          x: {
            anchor: "start",
            offset: 16,
          },
          y: {
            anchor: "start",
            offset: 528,
          },
          w: {
            kind: "px",
            v: 343,
          },
          h: {
            kind: "px",
            v: 200,
          },
          rotation: 0,
        },
      },
      {
        id: "s10",
        type: "Shape",
        props: {
          shape: "rectangle",
          fill: "#334155",
        },
        styles: {
          background: "#334155",
          borderRadius: 6,
        },
        position: {
          mode: "free",
          x: {
            anchor: "start",
            offset: 88,
          },
          y: {
            anchor: "start",
            offset: 560,
          },
        },
        size: {
          w: {
            kind: "px",
            v: 360,
          },
          h: {
            kind: "px",
            v: 28,
          },
        },
        rotation: 0,
        children: [],
        phone: {
          x: {
            anchor: "start",
            offset: 32,
          },
          y: {
            anchor: "start",
            offset: 544,
          },
          w: {
            kind: "px",
            v: 200,
          },
          h: {
            kind: "px",
            v: 20,
          },
          rotation: 0,
        },
      },
      {
        id: "s11",
        type: "Shape",
        props: {
          shape: "rectangle",
          fill: "#272f42",
        },
        styles: {
          background: "#272f42",
          borderRadius: 4,
        },
        position: {
          mode: "free",
          x: {
            anchor: "start",
            offset: 88,
          },
          y: {
            anchor: "start",
            offset: 604,
          },
        },
        size: {
          w: {
            kind: "px",
            v: 240,
          },
          h: {
            kind: "px",
            v: 16,
          },
        },
        rotation: 0,
        children: [],
        phone: {
          x: {
            anchor: "start",
            offset: 32,
          },
          y: {
            anchor: "start",
            offset: 572,
          },
          w: {
            kind: "px",
            v: 140,
          },
          h: {
            kind: "px",
            v: 12,
          },
          rotation: 0,
        },
      },
      {
        id: "c12",
        type: "Container",
        props: {},
        styles: {
          background: "#22c55e",
          borderRadius: 10,
          opacity: 60,
        },
        position: {
          mode: "free",
          x: {
            anchor: "start",
            offset: 88,
          },
          y: {
            anchor: "start",
            offset: 640,
          },
        },
        size: {
          w: {
            kind: "px",
            v: 280,
          },
          h: {
            kind: "px",
            v: 120,
          },
        },
        rotation: 0,
        children: [],
        phone: {
          x: {
            anchor: "start",
            offset: 32,
          },
          y: {
            anchor: "start",
            offset: 596,
          },
          w: {
            kind: "px",
            v: 150,
          },
          h: {
            kind: "px",
            v: 112,
          },
          rotation: 0,
        },
      },
      {
        id: "c13",
        type: "Container",
        props: {},
        styles: {
          background: "#1e293b",
          borderWidth: 1,
          borderColor: "#475569",
          borderRadius: 10,
        },
        position: {
          mode: "free",
          x: {
            anchor: "start",
            offset: 520,
          },
          y: {
            anchor: "start",
            offset: 560,
          },
        },
        size: {
          w: {
            kind: "px",
            v: 352,
          },
          h: {
            kind: "px",
            v: 200,
          },
        },
        rotation: 0,
        children: [],
        phone: {
          x: {
            anchor: "start",
            offset: 200,
          },
          y: {
            anchor: "start",
            offset: 544,
          },
          w: {
            kind: "px",
            v: 143,
          },
          h: {
            kind: "px",
            v: 164,
          },
          rotation: 0,
        },
      },
      {
        id: "t14",
        type: "Text",
        props: {
          text: "Drag me",
          size: 14,
          color: "#f8fafc",
          bold: false,
          italic: false,
          underline: false,
          align: "center",
          font: "'Roboto Mono', ui-monospace, monospace",
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
            offset: 642,
          },
        },
        size: {
          w: {
            kind: "px",
            v: 352,
          },
          h: {
            kind: "px",
            v: 24,
          },
        },
        rotation: 0,
        children: [],
        phone: {
          x: {
            anchor: "start",
            offset: 200,
          },
          y: {
            anchor: "start",
            offset: 616,
          },
          w: {
            kind: "px",
            v: 143,
          },
          h: {
            kind: "px",
            v: 24,
          },
          rotation: 0,
        },
      },
      {
        id: "t15",
        type: "Text",
        props: {
          text: "Everything a host needs",
          size: 32,
          color: "#f8fafc",
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
            offset: 860,
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
        phone: {
          x: {
            anchor: "start",
            offset: 16,
          },
          y: {
            anchor: "start",
            offset: 784,
          },
          w: {
            kind: "px",
            v: 343,
          },
          h: {
            kind: "px",
            v: 36,
          },
          rotation: 0,
        },
        phoneProps: {
          size: 24,
        },
      },
      {
        id: "c16",
        type: "Container",
        props: {},
        styles: {
          background: "#1b2336",
          borderWidth: 1,
          borderColor: "#475569",
          borderRadius: 12,
        },
        position: {
          mode: "free",
          x: {
            anchor: "start",
            offset: 48,
          },
          y: {
            anchor: "start",
            offset: 940,
          },
        },
        size: {
          w: {
            kind: "px",
            v: 272,
          },
          h: {
            kind: "px",
            v: 190,
          },
        },
        rotation: 0,
        children: [],
        phone: {
          x: {
            anchor: "start",
            offset: 16,
          },
          y: {
            anchor: "start",
            offset: 840,
          },
          w: {
            kind: "px",
            v: 343,
          },
          h: {
            kind: "px",
            v: 150,
          },
          rotation: 0,
        },
      },
      {
        id: "s17",
        type: "Shape",
        props: {
          shape: "ellipse",
          fill: "#22c55e",
        },
        styles: {
          background: "#22c55e",
        },
        position: {
          mode: "free",
          x: {
            anchor: "start",
            offset: 72,
          },
          y: {
            anchor: "start",
            offset: 964,
          },
        },
        size: {
          w: {
            kind: "px",
            v: 32,
          },
          h: {
            kind: "px",
            v: 32,
          },
        },
        rotation: 0,
        children: [],
        phone: {
          x: {
            anchor: "start",
            offset: 32,
          },
          y: {
            anchor: "start",
            offset: 860,
          },
          w: {
            kind: "px",
            v: 28,
          },
          h: {
            kind: "px",
            v: 28,
          },
          rotation: 0,
        },
      },
      {
        id: "t18",
        type: "Text",
        props: {
          text: "Place anything, anywhere",
          size: 18,
          color: "#f8fafc",
          bold: true,
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
            offset: 1012,
          },
        },
        size: {
          w: {
            kind: "px",
            v: 224,
          },
          h: {
            kind: "px",
            v: 28,
          },
        },
        rotation: 0,
        children: [],
        phone: {
          x: {
            anchor: "start",
            offset: 32,
          },
          y: {
            anchor: "start",
            offset: 898,
          },
          w: {
            kind: "px",
            v: 311,
          },
          h: {
            kind: "px",
            v: 26,
          },
          rotation: 0,
        },
        phoneProps: {
          size: 17,
        },
      },
      {
        id: "t19",
        type: "Text",
        props: {
          text: "Drag, resize and turn blocks freely, with a phone layout of their own.",
          size: 14,
          color: "#94a3b8",
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
            offset: 1048,
          },
        },
        size: {
          w: {
            kind: "px",
            v: 224,
          },
          h: {
            kind: "px",
            v: 72,
          },
        },
        rotation: 0,
        children: [],
        phone: {
          x: {
            anchor: "start",
            offset: 32,
          },
          y: {
            anchor: "start",
            offset: 928,
          },
          w: {
            kind: "px",
            v: 311,
          },
          h: {
            kind: "px",
            v: 52,
          },
          rotation: 0,
        },
        phoneProps: {
          size: 14,
        },
      },
      {
        id: "c20",
        type: "Container",
        props: {},
        styles: {
          background: "#1b2336",
          borderWidth: 1,
          borderColor: "#475569",
          borderRadius: 12,
        },
        position: {
          mode: "free",
          x: {
            anchor: "start",
            offset: 344,
          },
          y: {
            anchor: "start",
            offset: 940,
          },
        },
        size: {
          w: {
            kind: "px",
            v: 272,
          },
          h: {
            kind: "px",
            v: 190,
          },
        },
        rotation: 0,
        children: [],
        phone: {
          x: {
            anchor: "start",
            offset: 16,
          },
          y: {
            anchor: "start",
            offset: 1006,
          },
          w: {
            kind: "px",
            v: 343,
          },
          h: {
            kind: "px",
            v: 150,
          },
          rotation: 0,
        },
      },
      {
        id: "s21",
        type: "Shape",
        props: {
          shape: "ellipse",
          fill: "#22c55e",
        },
        styles: {
          background: "#22c55e",
        },
        position: {
          mode: "free",
          x: {
            anchor: "start",
            offset: 368,
          },
          y: {
            anchor: "start",
            offset: 964,
          },
        },
        size: {
          w: {
            kind: "px",
            v: 32,
          },
          h: {
            kind: "px",
            v: 32,
          },
        },
        rotation: 0,
        children: [],
        phone: {
          x: {
            anchor: "start",
            offset: 32,
          },
          y: {
            anchor: "start",
            offset: 1026,
          },
          w: {
            kind: "px",
            v: 28,
          },
          h: {
            kind: "px",
            v: 28,
          },
          rotation: 0,
        },
      },
      {
        id: "t22",
        type: "Text",
        props: {
          text: "The host stays in charge",
          size: 18,
          color: "#f8fafc",
          bold: true,
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
            offset: 1012,
          },
        },
        size: {
          w: {
            kind: "px",
            v: 224,
          },
          h: {
            kind: "px",
            v: 28,
          },
        },
        rotation: 0,
        children: [],
        phone: {
          x: {
            anchor: "start",
            offset: 32,
          },
          y: {
            anchor: "start",
            offset: 1064,
          },
          w: {
            kind: "px",
            v: 311,
          },
          h: {
            kind: "px",
            v: 26,
          },
          rotation: 0,
        },
        phoneProps: {
          size: 17,
        },
      },
      {
        id: "t23",
        type: "Text",
        props: {
          text: "Permissions, overrides and a control API decide what people can change.",
          size: 14,
          color: "#94a3b8",
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
            offset: 1048,
          },
        },
        size: {
          w: {
            kind: "px",
            v: 224,
          },
          h: {
            kind: "px",
            v: 72,
          },
        },
        rotation: 0,
        children: [],
        phone: {
          x: {
            anchor: "start",
            offset: 32,
          },
          y: {
            anchor: "start",
            offset: 1094,
          },
          w: {
            kind: "px",
            v: 311,
          },
          h: {
            kind: "px",
            v: 52,
          },
          rotation: 0,
        },
        phoneProps: {
          size: 14,
        },
      },
      {
        id: "c24",
        type: "Container",
        props: {},
        styles: {
          background: "#1b2336",
          borderWidth: 1,
          borderColor: "#475569",
          borderRadius: 12,
        },
        position: {
          mode: "free",
          x: {
            anchor: "start",
            offset: 640,
          },
          y: {
            anchor: "start",
            offset: 940,
          },
        },
        size: {
          w: {
            kind: "px",
            v: 272,
          },
          h: {
            kind: "px",
            v: 190,
          },
        },
        rotation: 0,
        children: [],
        phone: {
          x: {
            anchor: "start",
            offset: 16,
          },
          y: {
            anchor: "start",
            offset: 1172,
          },
          w: {
            kind: "px",
            v: 343,
          },
          h: {
            kind: "px",
            v: 150,
          },
          rotation: 0,
        },
      },
      {
        id: "s25",
        type: "Shape",
        props: {
          shape: "ellipse",
          fill: "#22c55e",
        },
        styles: {
          background: "#22c55e",
        },
        position: {
          mode: "free",
          x: {
            anchor: "start",
            offset: 664,
          },
          y: {
            anchor: "start",
            offset: 964,
          },
        },
        size: {
          w: {
            kind: "px",
            v: 32,
          },
          h: {
            kind: "px",
            v: 32,
          },
        },
        rotation: 0,
        children: [],
        phone: {
          x: {
            anchor: "start",
            offset: 32,
          },
          y: {
            anchor: "start",
            offset: 1192,
          },
          w: {
            kind: "px",
            v: 28,
          },
          h: {
            kind: "px",
            v: 28,
          },
          rotation: 0,
        },
      },
      {
        id: "t26",
        type: "Text",
        props: {
          text: "Looks that carry over",
          size: 18,
          color: "#f8fafc",
          bold: true,
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
            offset: 1012,
          },
        },
        size: {
          w: {
            kind: "px",
            v: 224,
          },
          h: {
            kind: "px",
            v: 28,
          },
        },
        rotation: 0,
        children: [],
        phone: {
          x: {
            anchor: "start",
            offset: 32,
          },
          y: {
            anchor: "start",
            offset: 1230,
          },
          w: {
            kind: "px",
            v: 311,
          },
          h: {
            kind: "px",
            v: 26,
          },
          rotation: 0,
        },
        phoneProps: {
          size: 17,
        },
      },
      {
        id: "t27",
        type: "Text",
        props: {
          text: "Opacity, shadow and colour are saved with the page and drawn the same everywhere.",
          size: 14,
          color: "#94a3b8",
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
            offset: 1048,
          },
        },
        size: {
          w: {
            kind: "px",
            v: 224,
          },
          h: {
            kind: "px",
            v: 72,
          },
        },
        rotation: 0,
        children: [],
        phone: {
          x: {
            anchor: "start",
            offset: 32,
          },
          y: {
            anchor: "start",
            offset: 1260,
          },
          w: {
            kind: "px",
            v: 311,
          },
          h: {
            kind: "px",
            v: 52,
          },
          rotation: 0,
        },
        phoneProps: {
          size: 14,
        },
      },
      {
        id: "t28",
        type: "Text",
        props: {
          text: "Three lines to embed it",
          size: 28,
          color: "#f8fafc",
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
            offset: 1210,
          },
        },
        size: {
          w: {
            kind: "px",
            v: 864,
          },
          h: {
            kind: "px",
            v: 40,
          },
        },
        rotation: 0,
        children: [],
        phone: {
          x: {
            anchor: "start",
            offset: 16,
          },
          y: {
            anchor: "start",
            offset: 1378,
          },
          w: {
            kind: "px",
            v: 343,
          },
          h: {
            kind: "px",
            v: 32,
          },
          rotation: 0,
        },
        phoneProps: {
          size: 22,
        },
      },
      {
        id: "c29",
        type: "Container",
        props: {},
        styles: {
          background: "#0b1220",
          borderWidth: 1,
          borderColor: "#334155",
          borderRadius: 12,
        },
        position: {
          mode: "free",
          x: {
            anchor: "start",
            offset: 144,
          },
          y: {
            anchor: "start",
            offset: 1280,
          },
        },
        size: {
          w: {
            kind: "px",
            v: 672,
          },
          h: {
            kind: "px",
            v: 96,
          },
        },
        rotation: 0,
        children: [],
        phone: {
          x: {
            anchor: "start",
            offset: 16,
          },
          y: {
            anchor: "start",
            offset: 1430,
          },
          w: {
            kind: "px",
            v: 343,
          },
          h: {
            kind: "px",
            v: 88,
          },
          rotation: 0,
        },
      },
      {
        id: "t30",
        type: "Text",
        props: {
          text: "<Editor data={page} onChange={save} />",
          size: 16,
          color: "#22c55e",
          bold: false,
          italic: false,
          underline: false,
          align: "left",
          font: "'Roboto Mono', ui-monospace, monospace",
        },
        styles: {},
        position: {
          mode: "free",
          x: {
            anchor: "start",
            offset: 176,
          },
          y: {
            anchor: "start",
            offset: 1308,
          },
        },
        size: {
          w: {
            kind: "px",
            v: 608,
          },
          h: {
            kind: "px",
            v: 40,
          },
        },
        rotation: 0,
        children: [],
        phone: {
          x: {
            anchor: "start",
            offset: 28,
          },
          y: {
            anchor: "start",
            offset: 1450,
          },
          w: {
            kind: "px",
            v: 319,
          },
          h: {
            kind: "px",
            v: 48,
          },
          rotation: 0,
        },
        phoneProps: {
          size: 12,
        },
      },
      {
        id: "t31",
        type: "Text",
        props: {
          text: "Build the page, not the tool.",
          size: 40,
          color: "#f8fafc",
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
            offset: 100,
          },
          y: {
            anchor: "start",
            offset: 1470,
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
        phone: {
          x: {
            anchor: "start",
            offset: 16,
          },
          y: {
            anchor: "start",
            offset: 1574,
          },
          w: {
            kind: "px",
            v: 343,
          },
          h: {
            kind: "px",
            v: 76,
          },
          rotation: 0,
        },
        phoneProps: {
          size: 28,
        },
      },
      {
        id: "t32",
        type: "Text",
        props: {
          text: "Free to try in the playground.",
          size: 16,
          color: "#94a3b8",
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
            offset: 1546,
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
        phone: {
          x: {
            anchor: "start",
            offset: 16,
          },
          y: {
            anchor: "start",
            offset: 1658,
          },
          w: {
            kind: "px",
            v: 343,
          },
          h: {
            kind: "px",
            v: 24,
          },
          rotation: 0,
        },
        phoneProps: {
          size: 16,
        },
      },
      {
        id: "b33",
        type: "Button",
        props: {
          label: "Open the editor",
          href: "",
          action: "",
          payload: {},
          fill: "#22c55e",
          textColor: "#0f172a",
          shape: "pill",
          size: 16,
          font: "Inter, system-ui, sans-serif",
        },
        styles: {},
        position: {
          mode: "free",
          x: {
            anchor: "start",
            offset: 380,
          },
          y: {
            anchor: "start",
            offset: 1600,
          },
        },
        size: {
          w: {
            kind: "px",
            v: 200,
          },
          h: {
            kind: "px",
            v: 52,
          },
        },
        rotation: 0,
        children: [],
        phone: {
          x: {
            anchor: "start",
            offset: 16,
          },
          y: {
            anchor: "start",
            offset: 1702,
          },
          w: {
            kind: "px",
            v: 343,
          },
          h: {
            kind: "px",
            v: 52,
          },
          rotation: 0,
        },
      },
      {
        id: "t34",
        type: "Text",
        props: {
          text: "Miditor · a throwaway landing page, made with Miditor",
          size: 13,
          color: "#94a3b8",
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
            offset: 1700,
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
        phone: {
          x: {
            anchor: "start",
            offset: 16,
          },
          y: {
            anchor: "start",
            offset: 1794,
          },
          w: {
            kind: "px",
            v: 343,
          },
          h: {
            kind: "px",
            v: 40,
          },
          rotation: 0,
        },
        phoneProps: {
          size: 12,
        },
      },
    ],
  },
};
