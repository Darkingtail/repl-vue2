/**
 * Proxy for communicating with the preview iframe
 */

export interface PreviewMessage {
  type: 'eval' | 'ready' | 'error' | 'console'
  [key: string]: any
}

export interface PreviewError {
  message: string
  source?: string
  line?: number
  column?: number
  stack?: string
}

export interface ConsoleMessage {
  level: 'log' | 'info' | 'warn' | 'error' | 'debug'
  args: string[]
}

export class PreviewProxy {
  private iframe: HTMLIFrameElement | null = null
  private readyPromise: Promise<void> | null = null
  private readyResolve: (() => void) | null = null

  private onError?: (error: PreviewError) => void
  private onConsole?: (message: ConsoleMessage) => void
  private onReady?: () => void

  constructor(options: {
    onError?: (error: PreviewError) => void
    onConsole?: (message: ConsoleMessage) => void
    onReady?: () => void
  } = {}) {
    this.onError = options.onError
    this.onConsole = options.onConsole
    this.onReady = options.onReady

    // Listen for messages from iframe
    window.addEventListener('message', this.handleMessage.bind(this))
  }

  private handleMessage(event: MessageEvent<PreviewMessage>) {
    const { type } = event.data

    switch (type) {
      case 'ready':
        this.readyResolve?.()
        this.onReady?.()
        break

      case 'error':
        this.onError?.(event.data.value as PreviewError)
        break

      case 'console':
        this.onConsole?.({
          level: event.data.level,
          args: event.data.args,
        })
        break
    }
  }

  setIframe(iframe: HTMLIFrameElement) {
    this.iframe = iframe
    this.resetReady()
  }

  private resetReady() {
    this.readyPromise = new Promise((resolve) => {
      this.readyResolve = resolve
    })
  }

  async waitForReady(timeout = 5000): Promise<boolean> {
    if (!this.readyPromise) return false

    try {
      await Promise.race([
        this.readyPromise,
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Preview timeout')), timeout)
        ),
      ])
      return true
    } catch {
      return false
    }
  }

  /**
   * Send compiled code to preview iframe
   */
  eval(data: {
    modules: Record<string, string>
    mainModule: string
    css: string
    importMapCode?: string
  }) {
    if (!this.iframe?.contentWindow) {
      console.warn('[PreviewProxy] iframe not ready')
      return
    }

    this.iframe.contentWindow.postMessage(
      {
        type: 'eval',
        ...data,
      },
      '*'
    )
  }

  destroy() {
    window.removeEventListener('message', this.handleMessage.bind(this))
    this.iframe = null
  }
}
