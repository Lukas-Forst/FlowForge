import type { ReactElement } from "react";

interface ControlsHelpModalProps {
  onClose: () => void;
  onResetTutorial?: () => void;
}

export function ControlsHelpModal({ onClose, onResetTutorial }: ControlsHelpModalProps): ReactElement {
  return (
    <div className="controls-help-backdrop" role="presentation" onClick={onClose}>
      <div className="controls-help-panel" role="dialog" aria-labelledby="controls-help-title" onClick={(e) => e.stopPropagation()}>
        <h2 id="controls-help-title">Controls & tips</h2>
        <table className="controls-help-table">
          <tbody>
            <tr>
              <th scope="row">Steer / thrust</th>
              <td>W A S D</td>
            </tr>
            <tr>
              <th scope="row">Cannon salvo</th>
              <td>Q (manual burst)</td>
            </tr>
            <tr>
              <th scope="row">Boost</th>
              <td>Space</td>
            </tr>
            <tr>
              <th scope="row">Pause / resume</th>
              <td>Esc or P</td>
            </tr>
            <tr>
              <th scope="row">This help</th>
              <td>? or F1</td>
            </tr>
            <tr>
              <th scope="row">After game over</th>
              <td>Enter — play again</td>
            </tr>
          </tbody>
        </table>
        <ul className="controls-help-tips">
          <li>Auto-cannons fire at the nearest threat; coins fill the top bar until you pick an upgrade.</li>
          <li>
            Every minute: <strong>Wave</strong> (full spawns) → <strong>Elite</strong> (every new ship is a gold-flag elite +
            chest) → <strong>Lull</strong> (breather + supply drop). After ~5 minutes, elites can also appear during normal
            waves.
          </li>
        </ul>
        <div className="controls-help-actions">
          {onResetTutorial ? (
            <button type="button" className="controls-help-secondary" onClick={onResetTutorial}>
              Show intro slides again
            </button>
          ) : null}
          <button type="button" onClick={onClose}>
            Close
          </button>
        </div>
        <p className="hint" style={{ margin: "12px 0 0", textAlign: "center" }}>
          Esc also closes this panel
        </p>
      </div>
    </div>
  );
}
