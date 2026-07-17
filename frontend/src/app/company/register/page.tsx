"use client";

import Link from "next/link";
import { useState } from "react";
import { companyAuthCompanyRegister } from "@/external/client/api/orval/generated/endpoints/company-auth/company-auth";
import { ApiError } from "@/lib/api-result";

export default function CompanyRegisterPage() {
  const [form, setForm] = useState({
    email: "",
    password: "",
    passwordConfirm: "",
    companyName: "",
    contactPersonName: "",
    phoneNumber: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (form.password !== form.passwordConfirm) {
      setError("パスワードが一致しません。");
      return;
    }
    if (form.password.length < 8) {
      setError("パスワードは8文字以上で入力してください。");
      return;
    }

    setIsSubmitting(true);
    try {
      await companyAuthCompanyRegister({
        email: form.email,
        password: form.password,
        companyName: form.companyName,
        contactPersonName: form.contactPersonName,
        phoneNumber: form.phoneNumber,
      });
      setIsRegistered(true);
    } catch (err) {
      if (err instanceof ApiError && err.code === "CONFLICT") {
        setError("このメールアドレスは既に登録されています。");
      } else {
        setError((err instanceof ApiError && err.message) || "登録に失敗しました。");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isRegistered) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="w-full max-w-md space-y-6 rounded-xl bg-white p-8 shadow-sm text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
            <svg
              aria-hidden="true"
              className="h-6 w-6 text-green-600"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900">登録を受け付けました</h2>
          <p className="text-sm text-gray-600">
            管理者による審査が完了次第、ログインできるようになります。
            <br />
            しばらくお待ちください。
          </p>
          <Link
            href="/company/login"
            className="inline-block rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
          >
            ログインページへ
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-md space-y-6 rounded-xl bg-white p-8 shadow-sm">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">企業アカウント登録</h1>
          <p className="mt-2 text-sm text-gray-600">
            登録後、管理者の審査が完了するとログインできます
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="companyName" className="block text-sm font-medium text-gray-700">
              企業名 <span className="text-red-500">*</span>
            </label>
            <input
              id="companyName"
              name="companyName"
              type="text"
              required
              value={form.companyName}
              onChange={handleChange}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label htmlFor="contactPersonName" className="block text-sm font-medium text-gray-700">
              担当者名 <span className="text-red-500">*</span>
            </label>
            <input
              id="contactPersonName"
              name="contactPersonName"
              type="text"
              required
              value={form.contactPersonName}
              onChange={handleChange}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-700">
              電話番号 <span className="text-red-500">*</span>
            </label>
            <input
              id="phoneNumber"
              name="phoneNumber"
              type="tel"
              required
              value={form.phoneNumber}
              onChange={handleChange}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
              メールアドレス <span className="text-red-500">*</span>
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              value={form.email}
              onChange={handleChange}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
              パスワード <span className="text-red-500">*</span>
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              minLength={8}
              value={form.password}
              onChange={handleChange}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
            />
            <p className="mt-1 text-xs text-gray-500">8文字以上</p>
          </div>

          <div>
            <label htmlFor="passwordConfirm" className="block text-sm font-medium text-gray-700">
              パスワード（確認） <span className="text-red-500">*</span>
            </label>
            <input
              id="passwordConfirm"
              name="passwordConfirm"
              type="password"
              required
              minLength={8}
              value={form.passwordConfirm}
              onChange={handleChange}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {isSubmitting ? "登録中..." : "登録する"}
          </button>
        </form>

        <p className="text-center text-sm text-gray-600">
          すでにアカウントをお持ちの方は{" "}
          <Link href="/company/login" className="font-medium text-blue-600 hover:text-blue-500">
            ログイン
          </Link>
        </p>
      </div>
    </div>
  );
}
