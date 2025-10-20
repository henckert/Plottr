import { SignedIn, SignedOut } from '@clerk/nextjs';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { SignInForm } from '@/components/auth/SignInForm';
import { OAuthButtons } from '@/components/auth/OAuthButtons';

export const metadata = {
  title: 'Sign In - Plottr',
  description: 'Sign in to your Plottr account',
};

export default function SignInPage() {
  return (
    <>
      <SignedIn>
        <>{redirect('/app')}</>
      </SignedIn>
      <SignedOut>
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center px-4 py-12">
          <div className="w-full max-w-md">
            {/* Logo/Header */}
            <div className="text-center mb-8">
              <Link href="/" className="inline-block">
                <h1 className="text-3xl font-bold text-gray-900">Plottr</h1>
              </Link>
              <p className="text-gray-600 mt-2">Plan and visualize field layouts</p>
            </div>

            {/* Sign In Card */}
            <Card className="shadow-lg">
              <CardHeader>
                <h2 className="text-2xl font-bold text-gray-900">Welcome Back</h2>
                <p className="text-gray-600 text-sm mt-1">Sign in to your account to continue</p>
              </CardHeader>
              <CardBody className="space-y-6">
                <SignInForm />
                <OAuthButtons mode="signin" />
              </CardBody>
            </Card>

            {/* Footer Links */}
            <div className="mt-6 text-center text-sm text-gray-600">
              <p>
                Don&apos;t have an account?{' '}
                <Link href="/auth/sign-up" className="text-blue-600 hover:text-blue-700 font-semibold">
                  Create one
                </Link>
              </p>
              <p className="mt-4">
                <Link href="/privacy" className="text-blue-600 hover:text-blue-700">
                  Privacy Policy
                </Link>
                {' • '}
                <Link href="/terms" className="text-blue-600 hover:text-blue-700">
                  Terms of Service
                </Link>
              </p>
            </div>
          </div>
        </div>
      </SignedOut>
    </>
  );
}
