'use client'

import { Component, type ReactNode } from 'react'
import { AlertCircle } from 'lucide-react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-text-muted">
          <AlertCircle size={32} />
          <p className="text-sm">Bir şeyler ters gitti. Lütfen sayfayı yenileyin.</p>
        </div>
      )
    }
    return this.props.children
  }
}
