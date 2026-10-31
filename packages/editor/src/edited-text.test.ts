// @vitest-environment node
import { describe, expect, it } from "vitest";
import { cleanEditedText } from "./edited-text";

describe("cleanEditedText", () => {
  it("keeps the words and their lines as they are for a block of lines", () => {
    expect(cleanEditedText("Hello\nworld", true, undefined)).toBe("Hello\nworld");
    expect(cleanEditedText("a\n\nb", true, undefined)).toBe("a\n\nb");
    expect(cleanEditedText("  spaced  ", true, undefined)).toBe("  spaced  ");
  });

  it("writes every kind of line break as one newline", () => {
    expect(cleanEditedText("a\r\nb\rc\nd", true, undefined)).toBe("a\nb\nc\nd");
  });

  it("drops the one break a browser adds at the end, and no other", () => {
    expect(cleanEditedText("word\n", true, undefined)).toBe("word");
    expect(cleanEditedText("word\n\n", true, undefined)).toBe("word\n");
    expect(cleanEditedText("\n", true, undefined)).toBe("");
    expect(cleanEditedText("", true, undefined)).toBe("");
  });

  it("makes a block of one line out of what has breaks: each is one space", () => {
    expect(cleanEditedText("a\nb", false, undefined)).toBe("a b");
    expect(cleanEditedText("a \n \n b", false, undefined)).toBe("a b");
    expect(cleanEditedText("a\r\nb", false, undefined)).toBe("a b");
    expect(cleanEditedText("one line", false, undefined)).toBe("one line");
    expect(cleanEditedText("end\n", false, undefined)).toBe("end");
  });

  it("cuts what is longer than the limit, and keeps what is not", () => {
    expect(cleanEditedText("abcdef", true, 3)).toBe("abc");
    expect(cleanEditedText("abc", true, 3)).toBe("abc");
    expect(cleanEditedText("ab", true, 3)).toBe("ab");
    expect(cleanEditedText("abcdef", false, 0)).toBe("");
    expect(cleanEditedText("ab\ncd", false, 4)).toBe("ab c");
  });
});
