'use client';

import React, { useState } from 'react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

interface SearchInputProps {
  onSearch: (query: string) => void;
  onLocationClick?: () => void;
  loading?: boolean;
  error?: string;
  placeholder?: string;
  showLocationButton?: boolean;
}

export const SearchInput: React.FC<SearchInputProps> = ({
  onSearch,
  onLocationClick,
  loading = false,
  error,
  placeholder = 'Search for an address or place...',
  showLocationButton = true,
}) => {
  const [query, setQuery] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      onSearch(query.trim());
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
  };

  const handleLocationClick = () => {
    onLocationClick?.();
  };

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <div className="flex gap-2">
        <Input
          type="text"
          placeholder={placeholder}
          value={query}
          onChange={handleInputChange}
          error={error}
          disabled={loading}
          className="flex-1"
        />
        <Button
          type="submit"
          isLoading={loading}
          disabled={loading || !query.trim()}
          className="flex-shrink-0"
        >
          Search
        </Button>
        {showLocationButton && (
          <Button
            type="button"
            variant="outline"
            onClick={handleLocationClick}
            disabled={loading}
            title="Use my location"
            className="flex-shrink-0 px-3"
          >
            📍
          </Button>
        )}
      </div>
    </form>
  );
};
