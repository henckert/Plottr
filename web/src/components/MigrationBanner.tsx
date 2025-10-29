'use client';

import { useState, useEffect } from 'react';
import { X, AlertTriangle, ArrowRight } from 'lucide-react';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';

interface MigrationStatus {
  needs_migration: boolean;
  venues_count: number;
  sites_count: number;
  message: string;
}

export function MigrationBanner() {
  const [migrationStatus, setMigrationStatus] = useState<MigrationStatus | null>(null);
  const [isDismissed, setIsDismissed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if banner was previously dismissed
    const dismissed = localStorage.getItem('migration_banner_dismissed');
    if (dismissed === 'true') {
      setIsDismissed(true);
      setIsLoading(false);
      return;
    }

    // Fetch migration status from API
    fetchMigrationStatus();
  }, []);

  const fetchMigrationStatus = async () => {
    try {
      const response = await fetch('/api/migration/status');
      if (response.ok) {
        const data = await response.json();
        setMigrationStatus(data);
      }
    } catch (error) {
      console.error('[MigrationBanner] Failed to fetch migration status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDismiss = () => {
    setIsDismissed(true);
    localStorage.setItem('migration_banner_dismissed', 'true');
  };

  const handleMigrate = () => {
    // Redirect to migration guide
    window.location.href = '/migration-guide';
  };

  // Don't render if loading, dismissed, or no migration needed
  if (isLoading || isDismissed || !migrationStatus?.needs_migration) {
    return null;
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-50 animate-slide-down">
      <Alert className="rounded-none border-x-0 border-t-0 border-b-2 border-yellow-600 bg-yellow-50 dark:bg-yellow-900/20">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 flex-1">
            <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-500 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-yellow-900 dark:text-yellow-100 mb-1">
                Action Required: Migrate to New Sites Schema
              </h3>
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                {migrationStatus.message}. The old "Venues" and "Pitches" terminology is being replaced with "Sites" and "Layouts" for better clarity. Your data will be preserved during migration.
              </p>
              <div className="flex gap-3 mt-3">
                <Button
                  size="sm"
                  variant="primary"
                  onClick={handleMigrate}
                  className="bg-yellow-600 hover:bg-yellow-700 text-white"
                >
                  View Migration Guide
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleDismiss}
                  className="border-yellow-600 text-yellow-900 hover:bg-yellow-100 dark:border-yellow-500 dark:text-yellow-100 dark:hover:bg-yellow-900/30"
                >
                  Remind Me Later
                </Button>
              </div>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="text-yellow-600 hover:text-yellow-800 dark:text-yellow-500 dark:hover:text-yellow-300 transition-colors"
            aria-label="Dismiss banner"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </Alert>
    </div>
  );
}
