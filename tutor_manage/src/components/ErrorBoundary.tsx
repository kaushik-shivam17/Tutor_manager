import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  errorMessage: string;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    errorMessage: ''
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, errorMessage: error.message };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  private handleGlobalError = (event: ErrorEvent) => {
    event.preventDefault();
    this.setState({ hasError: true, errorMessage: event.error?.message || event.message });
  };

  private handleGlobalRejection = (event: PromiseRejectionEvent) => {
    event.preventDefault();
    this.setState({ hasError: true, errorMessage: event.reason?.message || String(event.reason) });
  };

  public componentDidMount() {
    window.addEventListener('error', this.handleGlobalError);
    window.addEventListener('unhandledrejection', this.handleGlobalRejection);
  }

  public componentWillUnmount() {
    window.removeEventListener('error', this.handleGlobalError);
    window.removeEventListener('unhandledrejection', this.handleGlobalRejection);
  }

  public render() {
    if (this.state.hasError) {
      // Try to parse the error message to see if it's a Firestore error
      let displayMessage = this.state.errorMessage;
      let isFirestoreError = false;
      try {
        const parsed = JSON.parse(this.state.errorMessage);
        if (parsed.error && parsed.operationType) {
          isFirestoreError = true;
          displayMessage = `Database Error (${parsed.operationType}): ${parsed.error}`;
        }
      } catch (e) {
        // Not a JSON error
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
          <div className="max-w-md w-full bg-white p-8 rounded-xl shadow-lg">
            <h2 className="text-2xl font-bold text-red-600 mb-4">
              {isFirestoreError ? 'Access Denied' : 'Something went wrong'}
            </h2>
            <div className="bg-red-50 p-4 rounded-md overflow-auto max-h-64 text-sm text-red-800 font-mono mb-4">
              {displayMessage}
            </div>
            {isFirestoreError && (
              <p className="text-sm text-slate-600 mb-4">
                You might not have permission to access this data, or the database rules need to be updated.
              </p>
            )}
            <button
              className="w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 transition-colors"
              onClick={() => {
                this.setState({ hasError: false, errorMessage: '' });
                window.location.reload();
              }}
            >
              Reload Application
            </button>
          </div>
        </div>
      );
    }

    return (this as any).props.children;
  }
}
