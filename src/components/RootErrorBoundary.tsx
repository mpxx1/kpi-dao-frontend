import { Component, type ErrorInfo, type ReactNode } from 'react'

type Props = { children: ReactNode }

type State = { error: Error | null }

export class RootErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  override componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(error, info.componentStack)
  }

  override render() {
    if (this.state.error) {
      return (
        <div
          style={{
            padding: '1.5rem',
            fontFamily: 'system-ui, sans-serif',
            maxWidth: '40rem',
            margin: '0 auto',
          }}
        >
          <h1 style={{ color: '#b91c1c' }}>Ошибка при загрузке</h1>
          <pre
            style={{
              whiteSpace: 'pre-wrap',
              background: '#f3f4f6',
              padding: '1rem',
              borderRadius: 8,
              fontSize: 14,
            }}
          >
            {this.state.error.message}
          </pre>
          <p style={{ fontSize: 14, color: '#4b5563' }}>
            Откройте консоль разработчика (F12) для полного стека. Частая
            причина на Vite — отсутствует <code>process.env</code> у
            зависимостей; в проекте добавлен полифилл в{' '}
            <code>index.html</code>.
          </p>
        </div>
      )
    }
    return this.props.children
  }
}
