"use client";
import React from "react";

type Props = { children: React.ReactNode };
type State = { hasError: boolean; info?: string };

export default class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(error: any, info: any) {
    console.error("Map ErrorBoundary:", error, info);
    this.setState({ info: String(error?.message || error) });
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="p-4 bg-red-50 border border-red-200 rounded-md">
          <h2 className="font-semibold text-red-700 mb-1">Map failed to load</h2>
          <p className="text-sm text-red-600">Reload the page and check console logs.</p>
        </div>
      );
    }
    return this.props.children;
  }
}
