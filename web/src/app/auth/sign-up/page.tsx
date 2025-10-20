import { SignedIn, SignedOut } from '@clerk/nextjs';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { SignUpForm } from '@/components/auth/SignUpForm';
import { OAuthButtons } from '@/components/auth/OAuthButtons';

export const metadata = {
  title: 'Sign Up - Plottr',
  description: 'Create a new Plottr account',
};

export default function SignUpPage() {
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

            {/* Sign Up Card */}
            <Card className="shadow-lg">
              <CardHeader>
                <h2 className="text-2xl font-bold text-gray-900">Create Account</h2>
                <p className="text-gray-600 text-sm mt-1">Join Plottr to start planning fields</p>
              </CardHeader>
              <CardBody className="space-y-6">
                <SignUpForm />
                <OAuthButtons mode="signup" />
              </CardBody>
            </Card>

            {/* Footer Links */}
            <div className="mt-6 text-center text-sm text-gray-600">
              <p>
                Already have an account?{' '}
                <Link href="/auth/sign-in" className="text-blue-600 hover:text-blue-700 font-semibold">
                  Sign in
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
