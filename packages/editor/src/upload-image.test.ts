// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { uploadPicture } from "./upload-image";

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
        error: "Choose a picture file.",
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
      error: "The upload failed: quota",
    });
    expect(await uploadPicture(file("image/png"), fail(new Error("")))).toEqual({
      ok: false,
      error: "The upload failed",
    });
    expect(await uploadPicture(file("image/png"), fail("nope"))).toEqual({
      ok: false,
      error: "The upload failed",
    });
  });

  it("refuses an address that render would not draw", async () => {
    for (const bad of ["", "javascript:alert(1)", "data:image/svg+xml;base64,AAAA", 5, undefined]) {
      const result = await uploadPicture(file("image/png"), async () => bad as string);
      expect(result, String(bad)).toEqual({
        ok: false,
        error: "The upload gave an address that cannot be used.",
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
