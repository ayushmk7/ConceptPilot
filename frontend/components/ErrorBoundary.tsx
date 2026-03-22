'use client';

import React, { Component } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="min-h-[300px] flex items-center justify-center p-8">
          <div className="text-center max-w-md">
            <div className="w-14 h-14 rounded-2xl bg-destructive/10 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-7 h-7 text-destructive" />
            </div>
            <h3 className="text-lg font-semibold text-primary mb-2">Something went wrong</h3>
            <p className="text-sm text-secondary-text mb-4">
              {this.state.error?.message || 'An unexpected error occurred. Please try again.'}
            </p>
            <button
              onClick={this.handleReset}
              className="btn-primary inline-flex items-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              Try Again
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// ── Inline error state for sections ──
export function ErrorState({
  message = 'Failed to load data',
  onRetry,
}: {
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="flex items-center justify-center p-8 text-center">
      <div>
        <div className="w-12 h-12 rounded-xl bg-destructive/10 flex items-center justify-center mx-auto mb-3">
          <AlertTriangle className="w-5 h-5 text-destructive" />
        </div>
        <p className="text-sm text-secondary-text mb-3">{message}</p>
        {onRetry && (
          <button onClick={onRetry} className="text-sm text-primary font-medium hover:underline inline-flex items-center gap-1.5">
            <RotateCcw className="w-3.5 h-3.5" />
            Retry
          </button>
        )}
      </div>
    </div>
  );
}
