import { describe, expect, it } from "vitest";
import {
  CompanyProfilesUpdateCompanyProfileBody,
  companyProfilesUpdateCompanyProfileBodyHeadlineMax,
} from "@/external/client/api/orval/generated/zod/company-profile/company-profile.zod";
import { formatFieldErrors, validateForm } from "./form-validation";

// スキーマは手書きせず、実際にフォームが使う orval 生成 Zod で検証する

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

describe("validateForm", () => {
  it("正常な入力では null を返す", () => {
    expect(validateForm(CompanyProfilesUpdateCompanyProfileBody, validProfile)).toBeNull();
  });

  it("必須の空文字は日本語メッセージでフィールド名をキーに返す", () => {
    const errors = validateForm(CompanyProfilesUpdateCompanyProfileBody, {
      ...validProfile,
      companyName: "",
    });
    expect(errors).toEqual({ companyName: "入力してください" });
  });

  it("maxLength 超過は生成定数と同じ上限値をメッセージに含む", () => {
    const errors = validateForm(CompanyProfilesUpdateCompanyProfileBody, {
      ...validProfile,
      headline: "あ".repeat(companyProfilesUpdateCompanyProfileBodyHeadlineMax + 1),
    });
    expect(errors).toEqual({
      headline: `${companyProfilesUpdateCompanyProfileBodyHeadlineMax}文字以内で入力してください`,
    });
  });

  it("フィールド欠落（undefined）は必須項目エラーになる", () => {
    const { companyName: _companyName, ...rest } = validProfile;
    const errors = validateForm(CompanyProfilesUpdateCompanyProfileBody, rest);
    expect(errors).toEqual({ companyName: "必須項目です" });
  });

  it("複数フィールドのエラーを同時に返し、1フィールドは先頭メッセージに集約する", () => {
    const errors = validateForm(CompanyProfilesUpdateCompanyProfileBody, {
      ...validProfile,
      companyName: "",
      headline: "あ".repeat(300),
    });
    expect(Object.keys(errors ?? {}).sort()).toEqual(["companyName", "headline"]);
  });

  it("配列要素のネストしたエラーはトップレベルのフィールド名に集約する", () => {
    const errors = validateForm(CompanyProfilesUpdateCompanyProfileBody, {
      ...validProfile,
      benefits: [123],
    });
    expect(Object.keys(errors ?? {})).toEqual(["benefits"]);
  });
});

describe("formatFieldErrors", () => {
  it("ラベル辞書があれば「ラベル: メッセージ」形式にする", () => {
    const out = formatFieldErrors({ companyName: "入力してください" }, { companyName: "企業名" });
    expect(out).toEqual(["企業名: 入力してください"]);
  });

  it("ラベル未定義のフィールドはフィールド名をそのまま使う", () => {
    const out = formatFieldErrors({ headline: "255文字以内で入力してください" });
    expect(out).toEqual(["headline: 255文字以内で入力してください"]);
  });
});
