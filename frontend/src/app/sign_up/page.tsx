import { SignUpForm } from "@/features/signup/components/SignUpForm";

export default function SignUpPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md rounded-lg border border-gray-200 bg-white p-8 shadow-sm">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold">inselfy</h1>
          <p className="mt-2 text-sm text-gray-600">アカウントを作成</p>
        </div>
        <SignUpForm />
      </div>
    </main>
  );
}
