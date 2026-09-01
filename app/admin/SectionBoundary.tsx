'use client';

import { Component, type ReactNode } from 'react';

/** Keeps one broken section from taking down the whole admin page. */
export class SectionBoundary extends Component<
  { title: string; children: ReactNode },
  { error: Error | null }
> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div className="surf" style={{
          padding: 18, marginTop: 14, borderColor: 'var(--err)',
        }}>
          <strong style={{ color: 'var(--err)' }}>{this.props.title} could not load</strong>
          <p className="small mute" style={{ marginTop: 6, whiteSpace: 'pre-wrap' }}>
            {this.state.error.message}
          </p>
        </div>
      );
    }
    return this.props.children;
  }
}
