import { Component, type ReactNode, type ErrorInfo } from 'react';
import { RefreshCw } from 'lucide-react';

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary] Caught error:', error, info);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? (
        <div className="min-h-screen bg-[#1a1528] flex items-center justify-center px-4">
          <div className="max-w-md text-center">
            <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
              <RefreshCw size={28} className="text-slate-600" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Er is iets misgegaan</h1>
            <p className="text-slate-400 text-sm mb-6">
              We hebben een onverwachte fout ontmoet. Probeer de pagina opnieuw te laden.
            </p>
            {this.state.error && (
              <p className="text-xs text-slate-500 mb-6 font-mono break-words bg-white/5 p-3 rounded-lg">
                {this.state.error.message}
              </p>
            )}
            <button
              onClick={this.handleReset}
              className="flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-500 text-white font-semibold px-6 py-3 rounded-xl transition-colors w-full"
            >
              <RefreshCw size={16} /> Pagina herladen
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
