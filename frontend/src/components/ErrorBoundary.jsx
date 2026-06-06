import { Component } from 'react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error('Extensio UI error', error, info);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <main className="grid min-h-screen place-items-center bg-[#030712] p-6 text-[#F9FAFB]">
        <section className="max-w-md rounded-3xl border border-[#1F2937] bg-[#111827] p-6 text-center shadow-2xl">
          <p className="text-xs font-black uppercase tracking-[0.24em] text-[#00E599]">Extensio.ai</p>
          <h1 className="mt-3 text-2xl font-black">Something went wrong</h1>
          <p className="mt-2 text-sm leading-6 text-[#9CA3AF]">
            The workspace hit an unexpected UI error. Refresh the page to continue.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="mt-5 rounded-xl premium-gradient px-5 py-3 font-black text-[#030712]"
          >
            Reload workspace
          </button>
        </section>
      </main>
    );
  }
}
