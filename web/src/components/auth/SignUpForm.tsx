'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useSignUp } from '@clerk/nextjs';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { signUpSchema, validatePassword, type SignUpFormData } from '@/lib/authValidation';
import { ZodError } from 'zod';

interface SignUpFormProps {
  redirectUrl?: string;
}

export const SignUpForm: React.FC<SignUpFormProps> = ({ redirectUrl = '/app' }) => {
  const { signUp, isLoaded, setActive } = useSignUp();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingVerification, setPendingVerification] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [formData, setFormData] = useState<SignUpFormData>({
    email: '',
    password: '',
    passwordConfirm: '',
    firstName: '',
    lastName: '',
    acceptTerms: false,
  });
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [passwordStrength, setPasswordStrength] = useState<{ valid: boolean; errors: string[] }>({
    valid: false,
    errors: [],
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, type, value, checked } = e.target;
    const fieldValue = type === 'checkbox' ? checked : value;

    setFormData((prev) => ({
      ...prev,
      [name]: fieldValue,
    }));

    // Update password strength indicator
    if (name === 'password') {
      setPasswordStrength(validatePassword(value));
    }

    // Clear validation error for this field
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
      if (!isLoaded || !signUp) {
        setError('Authentication service is not ready. Please try again.');
        setIsLoading(false);
        return;
      }

      // Validate form
      const validatedData = signUpSchema.parse(formData);

      // Create user with Clerk
      const result = await signUp.create({
        emailAddress: validatedData.email,
        password: validatedData.password,
        firstName: validatedData.firstName,
        lastName: validatedData.lastName,
      });

      // Check verification status
      if (result.status === 'missing_requirements') {
        setPendingVerification(true);
      } else if (result.status === 'complete') {
        await setActive({ session: result.createdSessionId });
        window.location.href = redirectUrl;
      }
    } catch (err) {
      if (err instanceof ZodError) {
        const errors: Record<string, string> = {};
        err.errors.forEach((error) => {
          const path = error.path[0] as string;
          errors[path] = error.message;
        });
        setValidationErrors(errors);
      } else if (err instanceof Error) {
        if (err.message.includes('email')) {
          setError('This email is already registered. Try signing in instead.');
        } else if (err.message.includes('password')) {
          setError('Password does not meet security requirements.');
        } else {
          setError(err.message || 'Sign up failed. Please try again.');
        }
      } else {
        setError('An unexpected error occurred. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerification = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      if (!isLoaded || !signUp) {
        setError('Authentication service is not ready. Please try again.');
        setIsLoading(false);
        return;
      }

      // Attempt verification
      const completeSignUp = await signUp.attemptEmailAddressVerification({
        code: verificationCode,
      });

      if (completeSignUp.status === 'complete') {
        await setActive({ session: completeSignUp.createdSessionId });
        window.location.href = redirectUrl;
      } else {
        setError('Verification failed. Please check the code and try again.');
      }
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message || 'Verification failed. Please try again.');
      } else {
        setError('Verification failed. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (pendingVerification) {
    return (
      <form onSubmit={handleVerification} className="space-y-4">
        <Alert type="info" title="Verify Your Email">
          We&apos;ve sent a verification code to {formData.email}. Enter it below to complete
          your account.
        </Alert>

        {error && (
          <Alert type="error" title="Verification Error" dismissible onDismiss={() => setError(null)}>
            {error}
          </Alert>
        )}

        <Input
          label="Verification Code"
          type="text"
          placeholder="000000"
          value={verificationCode}
          onChange={(e) => setVerificationCode(e.target.value)}
          disabled={isLoading}
          required
        />

        <Button type="submit" fullWidth isLoading={isLoading} size="lg">
          Verify Email
        </Button>

        <div className="text-center text-sm text-gray-600">
          Didn&apos;t receive the code?{' '}
          <button
            type="button"
            onClick={() => setPendingVerification(false)}
            className="text-blue-600 hover:text-blue-700 font-semibold"
          >
            Try again
          </button>
        </div>
      </form>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <Alert type="error" title="Sign Up Error" dismissible onDismiss={() => setError(null)}>
          {error}
        </Alert>
      )}

      <div className="grid grid-cols-2 gap-4">
        <Input
          label="First Name"
          type="text"
          name="firstName"
          placeholder="John"
          value={formData.firstName}
          onChange={handleInputChange}
          error={validationErrors.firstName}
          disabled={isLoading}
          required
        />
        <Input
          label="Last Name"
          type="text"
          name="lastName"
          placeholder="Doe"
          value={formData.lastName}
          onChange={handleInputChange}
          error={validationErrors.lastName}
          disabled={isLoading}
          required
        />
      </div>

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

      <div>
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
        {formData.password && !passwordStrength.valid && (
          <div className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded text-sm text-amber-800">
            <p className="font-semibold mb-1">Password needs:</p>
            <ul className="list-disc list-inside space-y-1">
              {passwordStrength.errors.map((error) => (
                <li key={error}>{error}</li>
              ))}
            </ul>
          </div>
        )}
        {passwordStrength.valid && (
          <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded text-sm text-green-800">
            ✓ Strong password
          </div>
        )}
      </div>

      <Input
        label="Confirm Password"
        type="password"
        name="passwordConfirm"
        placeholder="••••••••"
        value={formData.passwordConfirm}
        onChange={handleInputChange}
        error={validationErrors.passwordConfirm}
        disabled={isLoading}
        required
      />

      <label className="flex items-start gap-2">
        <input
          type="checkbox"
          name="acceptTerms"
          checked={formData.acceptTerms}
          onChange={handleInputChange}
          className="mt-1 rounded border-gray-300"
          disabled={isLoading}
          required
        />
        <span className="text-sm text-gray-600">
          I agree to the{' '}
          <Link href="/terms" className="text-blue-600 hover:text-blue-700">
            Terms and Conditions
          </Link>{' '}
          and{' '}
          <Link href="/privacy" className="text-blue-600 hover:text-blue-700">
            Privacy Policy
          </Link>
        </span>
      </label>
      {validationErrors.acceptTerms && (
        <p className="text-sm text-red-600 font-medium">{validationErrors.acceptTerms}</p>
      )}

      <Button type="submit" fullWidth isLoading={isLoading} size="lg">
        Create Account
      </Button>

      <div className="text-center text-sm text-gray-600">
        Already have an account?{' '}
        <Link href="/auth/sign-in" className="text-blue-600 hover:text-blue-700 font-semibold">
          Sign In
        </Link>
      </div>
    </form>
  );
};
