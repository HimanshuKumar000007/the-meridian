/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { trackError, generateRequestId } from '../../services/monitoring/errorTracker';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onReset?: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  requestId: string;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = {
    hasError: false,
    error: null,
    requestId: generateRequestId(),
  };

  public static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
      requestId: generateRequestId(),
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    const { requestId } = this.state;
    trackError(error, {
      requestId,
      service: 'frontend-react',
      action: 'component-crash',
      metadata: {
        componentStack: errorInfo.componentStack,
      },
    });
  }

  private handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null,
      requestId: generateRequestId(),
    });
    if (this.props.onReset) {
      this.props.onReset();
    } else {
      window.location.href = '/';
    }
  };

  public render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-[#FDFBF7] text-[#111111] flex flex-col items-center justify-center px-4 py-16">
          <div className="max-w-xl w-full text-center border border-[#E5E0D8] bg-white p-8 md:p-12 shadow-sm rounded-none">
            <header className="border-b border-[#111111] pb-4 mb-6">
              <span className="font-serif tracking-widest text-xs uppercase font-bold text-[#888888]">
                The Meridian — Platform Notice
              </span>
              <h1 className="font-serif text-3xl md:text-4xl font-normal text-[#111111] mt-2">
                Temporarily Unavailable
              </h1>
            </header>

            <p className="text-sm md:text-base text-[#444444] font-serif leading-relaxed mb-6">
              An unexpected technical condition occurred while loading this section of the publication.
              Our reliability systems have recorded the event for immediate editorial review.
            </p>

            <div className="bg-[#F8F7F4] border border-[#EBE7DF] p-3 mb-8 text-xs font-mono text-[#666666] select-all">
              Reference ID: {this.state.requestId}
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                type="button"
                onClick={this.handleReset}
                className="px-6 py-2.5 bg-[#111111] text-white text-xs uppercase tracking-wider font-semibold hover:bg-[#333333] transition-colors"
              >
                Return to Front Page
              </button>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="px-6 py-2.5 border border-[#111111] text-[#111111] text-xs uppercase tracking-wider font-semibold hover:bg-[#F0EEEA] transition-colors"
              >
                Reload Dispatch
              </button>
            </div>

            <footer className="mt-8 pt-4 border-t border-[#EBE7DF] text-[11px] text-[#888888] font-serif">
              The Meridian — Independent Global Newsroom & Technology
            </footer>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
