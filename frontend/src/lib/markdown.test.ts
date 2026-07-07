import { describe, expect, it } from "vitest";
import { markdownToHtml } from "./markdown";
import { sanitizeHtml } from "./sanitize";

describe("sanitizeHtml", () => {
  it("removes script tags", () => {
    expect(sanitizeHtml("<p>hello</p><script>alert(1)</script>")).toBe("<p>hello</p>");
  });

  it("removes event handler attributes", () => {
    const out = sanitizeHtml('<img src="x" onerror="alert(1)">');
    expect(out).not.toContain("onerror");
  });

  it("removes javascript: URLs", () => {
    const out = sanitizeHtml('<a href="javascript:alert(1)">link</a>');
    expect(out).not.toContain("javascript:");
  });

  it("keeps benign markup with class and id", () => {
    const html = '<h2 id="toc-0">見出し</h2><p class="catchphrase">本文</p>';
    expect(sanitizeHtml(html)).toBe(html);
  });
});

describe("markdownToHtml", () => {
  it("converts headings, bold, lists, and blockquotes", () => {
    const md = "キャッチコピー\n\n## 見出し\n\n**強調** です\n\n- 項目1\n- 項目2\n\n> 引用";
    const html = markdownToHtml(md);
    expect(html).toContain('<p class="catchphrase">キャッチコピー</p>');
    expect(html).toContain("<h2>見出し</h2>");
    expect(html).toContain("<strong>強調</strong>");
    expect(html).toContain("<ul><li>項目1</li>");
    expect(html).toContain("<li>項目2</li>");
    expect(html).toContain("<blockquote><p>引用</p></blockquote>");
  });

  it("neutralizes HTML injected into the markdown source", () => {
    const html = markdownToHtml(
      "前段\n\n<img src=x onerror=alert(1)>\n\n<script>alert(1)</script>",
    );
    expect(html).not.toContain("onerror");
    expect(html).not.toContain("<script>");
  });
});
