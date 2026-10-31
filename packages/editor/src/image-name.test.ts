import { describe, expect, it } from "vitest";
import { imageName } from "./image-name";

describe("imageName", () => {
  it("is the file name of an address", () => {
    expect(imageName("https://cdn.example.com/a/b/cat.png")).toBe("cat.png");
    expect(imageName("/images/hero.jpg")).toBe("hero.jpg");
  });

  it("leaves out the query and the fragment", () => {
    expect(imageName("https://x.test/cat.png?w=200&q=80#top")).toBe("cat.png");
  });

  it("decodes the escapes of a name", () => {
    expect(imageName("https://x.test/my%20cat.png")).toBe("my cat.png");
  });

  it("keeps a name whose escapes do not decode", () => {
    expect(imageName("https://x.test/100%.png")).toBe("100%.png");
  });

  it("names an inline picture plainly instead of printing it", () => {
    expect(imageName("data:image/png;base64,AAAA")).toBe("Uploaded image");
  });

  it("falls back to the address when it has no file name", () => {
    expect(imageName("/")).toBe("/");
  });
});
