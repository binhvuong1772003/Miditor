// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { TranslatableError } from "./i18n/translatable-error";
import { createT } from "./i18n/translate";
import { fitPicture, MAX_ADDED_WIDTH, uploadMessage, uploadPicture } from "./upload-image";

const file = (type: string) => ({ type }) as File;

describe("uploadPicture", () => {
  it("gives the address the host's function returns for a picture", async () => {
    const upload = vi.fn(async () => "https://res.example.com/a.png");
    const f = file("image/png");
    expect(await uploadPicture(f, upload)).toEqual({
      ok: true,
      url: "https://res.example.com/a.png",
    });
    expect(upload).toHaveBeenCalledWith(f);
  });

  it("does not call the host for a file that is not a picture", async () => {
    const upload = vi.fn(async () => "https://res.example.com/a.png");
    for (const type of ["", "application/pdf", "text/image/png", "video/mp4"]) {
      expect(await uploadPicture(file(type), upload), type).toEqual({
        ok: false,
        error: "not-image",
      });
    }
    expect(upload).not.toHaveBeenCalled();
  });

  it("reports a failed upload, with the reason when there is one", async () => {
    const fail = (reason: unknown) => async () => {
      throw reason;
    };
    expect(await uploadPicture(file("image/png"), fail(new Error("quota")))).toEqual({
      ok: false,
      error: "failed",
      detail: "quota",
    });
    expect(await uploadPicture(file("image/png"), fail(new Error("")))).toEqual({
      ok: false,
      error: "failed",
    });
    expect(await uploadPicture(file("image/png"), fail("nope"))).toEqual({
      ok: false,
      error: "failed",
    });
  });

  it("keeps the reason of the editor's own helpers, to say it in the language of the editor", async () => {
    const result = await uploadPicture(file("image/png"), async () => {
      throw new TranslatableError("upload.serverStatus", { status: 413 });
    });
    expect(result).toEqual({
      ok: false,
      error: "failed",
      reason: { key: "upload.serverStatus", params: { status: 413 } },
    });
    if (result.ok) throw new Error("expected a failure");
    expect(uploadMessage(createT(undefined), result)).toBe(
      "The upload failed: the server answered 413",
    );
    expect(uploadMessage(createT({ messages: { "upload.failedWhy": "Lỗi: {why}" } }), result)).toBe(
      "Lỗi: the server answered 413",
    );
  });

  it("refuses an address that render would not draw", async () => {
    for (const bad of ["", "javascript:alert(1)", "data:image/svg+xml;base64,AAAA", 5, undefined]) {
      const result = await uploadPicture(file("image/png"), async () => bad as string);
      expect(result, String(bad)).toEqual({
        ok: false,
        error: "bad-address",
      });
    }
  });

  it("accepts a path and a data address as well as a web address", async () => {
    for (const ok of ["/uploads/a.png", "data:image/png;base64,AAAA"]) {
      expect(await uploadPicture(file("image/jpeg"), async () => ok)).toEqual({
        ok: true,
        url: ok,
      });
    }
  });
});

describe("fitPicture", () => {
  it("keeps a small picture as it is", () => {
    expect(fitPicture({ w: 200, h: 100 })).toEqual({ w: 200, h: 100 });
    expect(fitPicture({ w: MAX_ADDED_WIDTH, h: 10 })).toEqual({ w: MAX_ADDED_WIDTH, h: 10 });
  });

  it("scales a wide picture down to 320 wide with the same proportions", () => {
    expect(fitPicture({ w: 1600, h: 900 })).toEqual({ w: 320, h: 180 });
    expect(fitPicture({ w: 640, h: 1280 })).toEqual({ w: 320, h: 640 });
    expect(fitPicture({ w: 321, h: 321 })).toEqual({ w: 320, h: 320 });
  });

  it("never gives less than 1 px", () => {
    expect(fitPicture({ w: 100000, h: 1 })).toEqual({ w: 320, h: 1 });
    expect(fitPicture({ w: 1, h: 1 })).toEqual({ w: 1, h: 1 });
  });

  it("gives nothing for a size that is not usable", () => {
    for (const size of [
      { w: 0, h: 10 },
      { w: 10, h: 0 },
      { w: -1, h: 10 },
      { w: Number.NaN, h: 10 },
      { w: 10, h: Number.POSITIVE_INFINITY },
    ]) {
      expect(fitPicture(size)).toBeUndefined();
    }
  });
});
