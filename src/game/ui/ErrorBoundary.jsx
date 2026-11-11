import { Component } from 'react'
import './overlay.css'

/** Shows a readable message if the 3D view cannot start (no WebGL, lost context...). */
export default class ErrorBoundary extends Component {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch(error) {
    console.error(error)
  }

  render() {
    if (!this.state.failed) return this.props.children
    return (
      <div className="overlay">
        <div className="card">
          <h1 className="card__title">The game could not start</h1>
          <p className="card__lead">
            Your browser could not run the 3D graphics this game needs. Try another browser or device.
          </p>
          <div className="card__actions">
            <a className="button button--accent" href="/">
              Back to portfolio
            </a>
          </div>
        </div>
      </div>
    )
  }
}
