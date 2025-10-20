'use client';

import React from 'react';
import { useSignIn, useSignUp } from '@clerk/nextjs';
import { Button } from '@/components/ui/Button';

interface OAuthButtonsProps {
  mode?: 'signin' | 'signup';
}

export const OAuthButtons: React.FC<OAuthButtonsProps> = ({ mode = 'signin' }) => {
  const { signIn, isLoaded: signInLoaded } = useSignIn();
  const { signUp, isLoaded: signUpLoaded } = useSignUp();
  const [isLoading, setIsLoading] = React.useState<string | null>(null);

  const isLoaded = mode === 'signin' ? signInLoaded : signUpLoaded;

  const handleOAuthSignIn = async (provider: 'google' | 'github' | 'microsoft') => {
    if (!isLoaded) return;

    setIsLoading(provider);

    try {
      if (mode === 'signin' && signIn) {
        await signIn.authenticateWithRedirect({
          strategy: `oauth_${provider}` as 'oauth_google' | 'oauth_github' | 'oauth_microsoft',
          redirectUrl: '/auth/callback',
          redirectUrlComplete: '/app',
        });
      } else if (mode === 'signup' && signUp) {
        await signUp.authenticateWithRedirect({
          strategy: `oauth_${provider}` as 'oauth_google' | 'oauth_github' | 'oauth_microsoft',
          redirectUrl: '/auth/callback',
          redirectUrlComplete: '/app',
        });
      }
    } catch (err) {
      console.error(`OAuth ${provider} error:`, err);
      setIsLoading(null);
    }
  };

  const providers: Array<{
    name: string;
    provider: 'google' | 'github' | 'microsoft';
    icon: string;
  }> = [
    { name: 'Google', provider: 'google', icon: '🔍' },
    { name: 'GitHub', provider: 'github', icon: '⚙️' },
    { name: 'Microsoft', provider: 'microsoft', icon: '🪟' },
  ];

  return (
    <div className="space-y-3">
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-300" />
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-2 bg-white text-gray-500">Or continue with</span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {providers.map(({ name, provider, icon }) => (
          <Button
            key={provider}
            type="button"
            variant="outline"
            onClick={() => handleOAuthSignIn(provider)}
            disabled={!isLoaded || isLoading !== null}
            isLoading={isLoading === provider}
            className="flex-col py-4"
          >
            <span className="text-lg">{icon}</span>
            <span className="text-xs mt-1 hidden sm:inline">{name}</span>
          </Button>
        ))}
      </div>
    </div>
  );
};
