'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useSignIn } from '@clerk/nextjs';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { signInSchema, type SignInFormData } from '@/lib/authValidation';
import { ZodError } from 'zod';

interface SignInFormProps {
  redirectUrl?: string;
}

export const SignInForm: React.FC<SignInFormProps> = ({ redirectUrl = '/app' }) => {
  const { signIn, isLoaded, setActive } = useSignIn();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<SignInFormData>({
    email: '',
    password: '',
  });
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    // Clear validation error for this field when user starts typing
    if (validationErrors[name]) {
      setValidationErrors((prev) => ({
        ...prev,
        [name]: '',
      }));
    }
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setValidationErrors({});
    setIsLoading(true);

    try {
      // Validate form
      const validatedData = signInSchema.parse(formData);

      // Sign in with Clerk
      if (!isLoaded || !signIn) {
        setError('Authentication service is not ready. Please try again.');
        setIsLoading(false);
        return;
      }

      const result = await signIn.create({
        identifier: validatedData.email,
        password: validatedData.password,
      });

      if (result.status === 'complete') {
        await setActive({ session: result.createdSessionId });
        // Redirect will happen automatically via Clerk
        window.location.href = redirectUrl;
      } else {
        setError('Sign in failed. Please try again.');
      }
    } catch (err) {
      if (err instanceof ZodError) {
        // Handle validation errors
        const errors: Record<string, string> = {};
        err.errors.forEach((error) => {
          const path = error.path[0] as string;
          errors[path] = error.message;
        });
        setValidationErrors(errors);
      } else if (err instanceof Error) {
        // Handle Clerk errors
        if (err.message.includes('401') || err.message.includes('Invalid password')) {
          setError('Invalid email or password. Please try again.');
        } else if (err.message.includes('rate')) {
          setError('Too many sign-in attempts. Please try again later.');
        } else {
          setError(err.message || 'Sign in failed. Please try again.');
        }
      } else {
        setError('An unexpected error occurred. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <Alert type="error" title="Sign In Error" dismissible onDismiss={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Input
        label="Email Address"
        type="email"
        name="email"
        placeholder="you@example.com"
        value={formData.email}
        onChange={handleInputChange}
        error={validationErrors.email}
        disabled={isLoading}
        required
      />

      <Input
        label="Password"
        type="password"
        name="password"
        placeholder="••••••••"
        value={formData.password}
        onChange={handleInputChange}
        error={validationErrors.password}
        disabled={isLoading}
        required
      />

      <div className="flex items-center justify-between pt-2">
        <label className="flex items-center gap-2">
          <input type="checkbox" className="rounded border-gray-300" />
          <span className="text-sm text-gray-600">Remember me</span>
        </label>
        <Link href="/auth/forgot-password" className="text-sm text-blue-600 hover:text-blue-700">
          Forgot password?
        </Link>
      </div>

      <Button type="submit" fullWidth isLoading={isLoading} size="lg">
        Sign In
      </Button>

      <div className="text-center text-sm text-gray-600">
        Don&apos;t have an account?{' '}
        <Link href="/auth/sign-up" className="text-blue-600 hover:text-blue-700 font-semibold">
          Sign Up
        </Link>
      </div>
    </form>
  );
};
