import { Component, type ReactNode } from "react";
import { PuppyMascot } from "./PuppyMascot";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-8">
          <div className="text-center">
            <PuppyMascot size={80} mood="sleeping" className="mx-auto" />
            <h2 className="text-lg font-bold mt-4">哎呀，出了点小状况</h2>
            <p className="text-sm text-[var(--color-muted-foreground)] mt-2">
              页面好像打了个盹，刷新试试吧
            </p>
            <button
              onClick={() => window.location.reload()}
              className="btn-primary text-xs mt-4 px-6 py-2.5"
            >
              刷新页面
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
