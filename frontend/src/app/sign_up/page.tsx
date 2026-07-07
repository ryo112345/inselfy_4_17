import { GoogleSignUpButton } from "@/features/signup/components/GoogleSignUpButton";
import { SignUpForm } from "@/features/signup/components/SignUpForm";

export default function SignUpPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md rounded-lg border border-gray-200 bg-white p-8 shadow-sm">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold">inselfy</h1>
          <p className="mt-2 text-sm text-gray-600">アカウントを作成</p>
        </div>
        <GoogleSignUpButton />
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="bg-white px-2 text-gray-500">または</span>
          </div>
        </div>
        <SignUpForm />
      </div>
    </main>
  );
}
