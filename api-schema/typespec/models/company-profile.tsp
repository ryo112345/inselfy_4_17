import "@typespec/http";
import "@typespec/openapi3";

using TypeSpec.Http;

namespace Inselfy.Models;

/** 企業プロフィール更新リクエスト */
model UpdateCompanyProfileRequest {
  /** 企業名 */
  @minLength(1)
  @maxLength(200)
  companyName: string;

  /** 担当者名 */
  @maxLength(100)
  contactPersonName: string;

  /** 電話番号 */
  @maxLength(30)
  phoneNumber: string;

  /** ヘッドライン */
  @maxLength(255)
  headline: string;

  /** 会社紹介 */
  @maxLength(10000)
  description: string;

  /** 業界 */
  @maxLength(100)
  industry: string;

  /** 所在地 */
  @maxLength(255)
  location: string;

  /** 従業員数 */
  @maxLength(50)
  employeeCount: string;

  /** 設立年 */
  foundedYear: integer | null;

  /** 設立月 */
  foundedMonth: integer | null;

  /** WebサイトURL */
  @maxLength(500)
  websiteUrl: string;

  /** 代表者名 */
  @maxLength(100)
  representativeName: string;

  /** 資本金 */
  @maxLength(100)
  capital: string;

  /** 売上高 */
  @maxLength(100)
  revenue: string;

  /** 福利厚生 */
  @maxItems(50)
  benefits: string[];

  /** 平均年齢 */
  @maxLength(50)
  averageAge: string;

  /** 平均残業時間 */
  @maxLength(50)
  averageOvertimeHours: string;

  /** 有給取得率 */
  @maxLength(50)
  paidLeaveRate: string;

  /** 受動喫煙対策 */
  @maxLength(255)
  smokingPolicy: string;
}

/** 企業プロフィール（企業本人向け） */
model CompanyProfileResponse {
  /** 企業ID */
  id: Uuid;

  /** 企業名 */
  companyName: string;

  /** 担当者名 */
  contactPersonName: string;

  /** 電話番号 */
  phoneNumber: string;

  /** メールアドレス */
  email: string;

  /** ヘッドライン */
  headline: string;

  /** 会社紹介 */
  description: string;

  /** 業界 */
  industry: string;

  /** 所在地 */
  location: string;

  /** 従業員数 */
  employeeCount: string;

  /** 設立年 */
  foundedYear: integer | null;

  /** 設立月 */
  foundedMonth: integer | null;

  /** WebサイトURL */
  websiteUrl: string;

  /** ロゴURL */
  logoUrl: string;

  /** カバー画像URL */
  coverImageUrl: string;

  /** 代表者名 */
  representativeName: string;

  /** 資本金 */
  capital: string;

  /** 売上高 */
  revenue: string;

  /** 福利厚生 */
  benefits: string[];

  /** 平均年齢 */
  averageAge: string;

  /** 平均残業時間 */
  averageOvertimeHours: string;

  /** 有給取得率 */
  paidLeaveRate: string;

  /** 受動喫煙対策 */
  smokingPolicy: string;

  /** ギャラリー画像URL */
  galleryUrls: string[];
}

/** 企業プロフィール（公開向け） */
model PublicCompanyProfileResponse {
  /** 企業ID */
  id: Uuid;

  /** 企業名 */
  companyName: string;

  /** ヘッドライン */
  headline: string;

  /** 会社紹介 */
  description: string;

  /** 業界 */
  industry: string;

  /** 所在地 */
  location: string;

  /** 従業員数 */
  employeeCount: string;

  /** 設立年 */
  foundedYear: integer | null;

  /** 設立月 */
  foundedMonth: integer | null;

  /** WebサイトURL */
  websiteUrl: string;

  /** ロゴURL */
  logoUrl: string;

  /** カバー画像URL */
  coverImageUrl: string;

  /** 代表者名 */
  representativeName: string;

  /** 資本金 */
  capital: string;

  /** 売上高 */
  revenue: string;

  /** 福利厚生 */
  benefits: string[];

  /** 平均年齢 */
  averageAge: string;

  /** 平均残業時間 */
  averageOvertimeHours: string;

  /** 有給取得率 */
  paidLeaveRate: string;

  /** 受動喫煙対策 */
  smokingPolicy: string;

  /** ギャラリー画像URL */
  galleryUrls: string[];
}
