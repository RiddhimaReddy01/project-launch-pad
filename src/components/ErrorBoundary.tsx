import { Component, type ReactNode } from 'react';

interface Props { children: ReactNode; fallback?: ReactNode }
interface State { hasError: boolean; error: string }

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: '' };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error: error.message };
  }

  componentDidCatch(error: Error) {
    console.error('[ErrorBoundary]', error);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="flex items-center justify-center p-12" style={{ minHeight: '40vh' }}>
          <div className="text-center" style={{ maxWidth: 400 }}>
            <p style={{ fontSize: 18, fontWeight: 400, color: 'var(--text-primary)', marginBottom: 8 }}>
              Something went wrong
            </p>
            <p className="font-caption" style={{ fontSize: 13, marginBottom: 20 }}>
              {this.state.error || 'An unexpected error occurred'}
            </p>
            <button
              onClick={() => { this.setState({ hasError: false, error: '' }); }}
              className="btn-primary"
              style={{ fontSize: 14, padding: '10px 24px' }}
            >
              Try again
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
