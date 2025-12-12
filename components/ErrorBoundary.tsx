
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-slate-50 text-slate-800 font-sans">
          <div className="bg-red-50 p-4 rounded-full mb-4">
            <AlertTriangle className="w-12 h-12 text-red-500" />
          </div>
          <h1 className="text-xl font-bold mb-2 text-slate-900">Ops! Ocorreu um erro.</h1>
          <p className="text-slate-600 mb-6 text-center text-sm max-w-xs">
            Não foi possível carregar o aplicativo.
          </p>
          
          <div className="w-full max-w-md bg-slate-100 p-4 rounded-lg overflow-auto mb-6 border border-slate-200">
             <p className="font-mono text-xs text-red-600 break-words">
               {this.state.error?.message || 'Erro desconhecido'}
             </p>
          </div>

          <button 
            onClick={() => window.location.reload()}
            className="px-8 py-3 bg-[#036271] text-white rounded-xl font-bold hover:bg-[#024d59] transition-colors shadow-lg"
          >
            Tentar Novamente
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
