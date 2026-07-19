// @vitest-environment jsdom
import { act, cleanup, renderHook } from "@testing-library/react";
import cssEscape from "css.escape";
import { afterEach, beforeEach, describe, expect, it, type Mock, vi } from "vitest";
import { CompanyProfilesUpdateCompanyProfileBody } from "@/external/client/api/orval/generated/zod/company-profile/company-profile.zod";
import { focusField, useFieldErrors } from "./useFieldErrors";

// メッセージ内容の検証は form-validation.test.ts の担当。
// ここでは state 遷移と DOM 連携（スクロール・フォーカス）だけを見る。

const validProfile = {
  companyName: "株式会社テスト",
  contactPersonName: "",
  phoneNumber: "",
  headline: "",
  description: "",
  industry: "",
  location: "",
  employeeCount: "",
  foundedYear: null,
  foundedMonth: null,
  websiteUrl: "",
  representativeName: "",
  capital: "",
  revenue: "",
  benefits: [],
  averageAge: "",
  averageOvertimeHours: "",
  paidLeaveRate: "",
  smokingPolicy: "",
};

const schema = CompanyProfilesUpdateCompanyProfileBody;

function addInput(id: string): HTMLInputElement {
  const el = document.createElement("input");
  el.id = id;
  document.body.appendChild(el);
  return el;
}

let scrollIntoView: Mock<HTMLElement["scrollIntoView"]>;

beforeEach(() => {
  // jsdom は scrollIntoView / CSS.escape 未実装（ブラウザは全対応）
  scrollIntoView = vi.fn();
  HTMLElement.prototype.scrollIntoView = scrollIntoView;
  globalThis.CSS ??= { escape: cssEscape } as typeof CSS;
});

afterEach(() => {
  cleanup();
  document.body.innerHTML = "";
});

describe("useFieldErrors", () => {
  it("validate: 正常な入力では true を返し fieldErrors は空のまま", () => {
    const { result } = renderHook(() => useFieldErrors());
    let ok = false;
    act(() => {
      ok = result.current.validate(schema, validProfile);
    });
    expect(ok).toBe(true);
    expect(result.current.fieldErrors).toEqual({});
  });

  it("validate: エラー時は false を返しフィールド名をキーに fieldErrors へ反映する", () => {
    const { result } = renderHook(() => useFieldErrors());
    let ok = true;
    act(() => {
      ok = result.current.validate(schema, { ...validProfile, companyName: "" });
    });
    expect(ok).toBe(false);
    expect(Object.keys(result.current.fieldErrors)).toEqual(["companyName"]);
  });

  it("validate: 再検証で前回のエラーは上書きされる", () => {
    const { result } = renderHook(() => useFieldErrors());
    act(() => {
      result.current.validate(schema, { ...validProfile, companyName: "" });
    });
    act(() => {
      result.current.validate(schema, validProfile);
    });
    expect(result.current.fieldErrors).toEqual({});
  });

  it("setErrors: スキーマ外のドメインルールのエラーを手動でセットできる", () => {
    const { result } = renderHook(() => useFieldErrors());
    act(() => {
      result.current.setErrors({ passwordConfirm: "パスワードが一致しません" });
    });
    expect(result.current.fieldErrors).toEqual({ passwordConfirm: "パスワードが一致しません" });
  });

  it("clearField: 指定フィールドだけ消え、他のエラーは残る", () => {
    const { result } = renderHook(() => useFieldErrors());
    act(() => {
      result.current.validate(schema, {
        ...validProfile,
        companyName: "",
        headline: "あ".repeat(300),
      });
    });
    act(() => {
      result.current.clearField("companyName");
    });
    expect(Object.keys(result.current.fieldErrors)).toEqual(["headline"]);
  });

  it("clearField: エラーのないフィールド指定では state を変えない（参照が同一）", () => {
    const { result } = renderHook(() => useFieldErrors());
    act(() => {
      result.current.setErrors({ companyName: "入力してください" });
    });
    const prev = result.current.fieldErrors;
    act(() => {
      result.current.clearField("headline");
    });
    expect(result.current.fieldErrors).toBe(prev);
  });

  it("clearAll: 全エラーが消える", () => {
    const { result } = renderHook(() => useFieldErrors());
    act(() => {
      result.current.setErrors({ a: "x", b: "y" });
    });
    act(() => {
      result.current.clearAll();
    });
    expect(result.current.fieldErrors).toEqual({});
  });

  it("scrollToFirstError: エラーキーの順序ではなく DOM 文書順で最初の欄に飛ぶ", () => {
    const headlineEl = addInput("headline");
    addInput("companyName");
    const { result } = renderHook(() => useFieldErrors());
    act(() => {
      // キー順は companyName が先だが、DOM 上は headline が上
      result.current.setErrors({ companyName: "x", headline: "y" });
      result.current.scrollToFirstError();
    });
    expect(document.activeElement).toBe(headlineEl);
    expect(scrollIntoView).toHaveBeenCalledTimes(1);
  });

  it("scrollToFirstError: validate 直後（state 反映前）でも同期 ref 経由で飛べる", () => {
    const companyNameEl = addInput("companyName");
    const { result } = renderHook(() => useFieldErrors());
    act(() => {
      result.current.validate(schema, { ...validProfile, companyName: "" });
      result.current.scrollToFirstError();
    });
    expect(document.activeElement).toBe(companyNameEl);
  });

  it("scrollToFirstError: clearField 後は残ったエラーの欄に飛ぶ", () => {
    addInput("companyName");
    const headlineEl = addInput("headline");
    const { result } = renderHook(() => useFieldErrors());
    act(() => {
      result.current.setErrors({ companyName: "x", headline: "y" });
    });
    act(() => {
      result.current.clearField("companyName");
    });
    act(() => {
      result.current.scrollToFirstError();
    });
    expect(document.activeElement).toBe(headlineEl);
  });

  it("scrollToFirstError: エラーがなければ何もしない", () => {
    addInput("companyName");
    const { result } = renderHook(() => useFieldErrors());
    act(() => {
      result.current.scrollToFirstError();
    });
    expect(scrollIntoView).not.toHaveBeenCalled();
  });

  it("scrollToFirstError: 対応する DOM 要素がなくてもエラーにならない", () => {
    const { result } = renderHook(() => useFieldErrors());
    act(() => {
      result.current.setErrors({ ghost: "x" });
    });
    expect(() => {
      act(() => {
        result.current.scrollToFirstError();
      });
    }).not.toThrow();
    expect(scrollIntoView).not.toHaveBeenCalled();
  });

  it("scrollToFirstError: CSS セレクタ特殊文字を含むフィールド名（ネスト形式）も扱える", () => {
    const el = addInput("experiences.0.companyName");
    const { result } = renderHook(() => useFieldErrors());
    act(() => {
      result.current.setErrors({ "experiences.0.companyName": "x" });
      result.current.scrollToFirstError();
    });
    expect(document.activeElement).toBe(el);
  });
});

describe("focusField", () => {
  it("要素 id = フィールド名の欄へスクロールしてフォーカスする", () => {
    const el = addInput("email");
    focusField("email");
    expect(document.activeElement).toBe(el);
    expect(scrollIntoView).toHaveBeenCalledTimes(1);
  });

  it("要素がなければ何もしない", () => {
    expect(() => focusField("missing")).not.toThrow();
    expect(scrollIntoView).not.toHaveBeenCalled();
  });
});
