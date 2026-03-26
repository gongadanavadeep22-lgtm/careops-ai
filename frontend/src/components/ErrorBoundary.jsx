import { Component } from 'react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.error('[CareOps ErrorBoundary]', error, info?.componentStack);
    }
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-[#f0f4f8] px-4 py-12">
          <div className="w-full max-w-lg rounded-2xl border border-red-200 bg-white p-8 shadow-lg">
            <h1 className="text-lg font-bold text-gray-900">Something went wrong</h1>
            <p className="mt-2 text-sm text-gray-600">
              The page crashed while loading. This is often caused by unexpected data from the server.
              Try refreshing. If it keeps happening, contact your administrator.
            </p>
            {import.meta.env.DEV && this.state.error?.message && (
              <pre className="mt-4 max-h-40 overflow-auto rounded-lg bg-gray-100 p-3 text-xs text-red-800">
                {this.state.error.message}
              </pre>
            )}
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-6 w-full rounded-lg bg-primary-600 py-2.5 text-sm font-semibold text-white hover:bg-primary-700"
            >
              Reload page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
