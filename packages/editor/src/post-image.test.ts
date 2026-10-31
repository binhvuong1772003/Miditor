import { describe, expect, it, vi } from "vitest";
import { postImage, valueAt } from "./post-image";

const picture = () => new File([new Uint8Array([1, 2, 3])], "cat.png", { type: "image/png" });

const answering = (status: number, body: unknown) =>
  vi.fn(
    async () => new Response(typeof body === "string" ? body : JSON.stringify(body), { status }),
  );

describe("valueAt", () => {
  it("follows a dotted path", () => {
    expect(valueAt({ data: { url: "x" } }, "data.url")).toBe("x");
    expect(valueAt({ url: "x" }, "url")).toBe("x");
  });

  it("is undefined when a step is missing or not an object", () => {
    expect(valueAt({ data: null }, "data.url")).toBeUndefined();
    expect(valueAt({ data: "text" }, "data.url")).toBeUndefined();
    expect(valueAt(null, "url")).toBeUndefined();
    expect(valueAt({}, "url")).toBeUndefined();
  });

  it("does not read what an object inherits", () => {
    expect(valueAt({}, "constructor")).toBeUndefined();
    expect(valueAt({}, "__proto__")).toBeUndefined();
  });
});

describe("postImage", () => {
  it("posts the file as a form and gives back the address of the answer", async () => {
    const fetcher = answering(200, { url: "https://cdn.example.com/cat.png" });
    const address = await postImage("/api/images", { fetch: fetcher as never })(picture());
    expect(address).toBe("https://cdn.example.com/cat.png");
    const [target, init] = fetcher.mock.calls[0] as unknown as [string, RequestInit];
    expect(target).toBe("/api/images");
    expect(init.method).toBe("POST");
    const form = init.body as FormData;
    expect((form.get("file") as File).name).toBe("cat.png");
  });

  it("uses the field, the answer path, the headers and the credentials it is given", async () => {
    const fetcher = answering(200, { data: { link: "/img/1.webp" } });
    const send = postImage("/up", {
      field: "image",
      answer: "data.link",
      headers: { Authorization: "Bearer t" },
      credentials: "include",
      fetch: fetcher as never,
    });
    expect(await send(picture())).toBe("/img/1.webp");
    const [, init] = fetcher.mock.calls[0] as unknown as [string, RequestInit];
    expect((init.body as FormData).has("image")).toBe(true);
    expect(init.headers).toEqual({ Authorization: "Bearer t" });
    expect(init.credentials).toBe("include");
  });

  it("throws what went wrong, for the person to read", async () => {
    await expect(
      postImage("/up", { fetch: answering(413, {}) as never })(picture()),
    ).rejects.toThrow("the server answered 413");
    await expect(
      postImage("/up", { fetch: answering(200, "not json") as never })(picture()),
    ).rejects.toThrow("did not answer with JSON");
    await expect(
      postImage("/up", { fetch: answering(200, { other: 1 }) as never })(picture()),
    ).rejects.toThrow('no "url" address');
    await expect(
      postImage("/up", { fetch: answering(200, { url: 5 }) as never })(picture()),
    ).rejects.toThrow('no "url" address');
  });

  it("lets a failed request through as it is", async () => {
    const down = vi.fn(async () => {
      throw new TypeError("network down");
    });
    await expect(postImage("/up", { fetch: down as never })(picture())).rejects.toThrow(
      "network down",
    );
  });
});
