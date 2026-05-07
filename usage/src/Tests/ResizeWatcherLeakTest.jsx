import { useContext, useEffect, useRef, useState } from 'react';

import {
  Algorithm,
  GeometryRepresentation,
  MultiViewRoot,
  ResizeWatcherContext,
  View,
} from 'react-vtk-js';

import vtkConeSource from '@kitware/vtk.js/Filters/Sources/ConeSource';

/**
 * Displays the current tracked-element count from the shared ResizeWatcher.
 * After removing all views and re-adding them, the count should return to the
 * baseline — if it keeps climbing, that is the memory leak.
 */
function ResizeWatcherStats({ cycleCount }) {
  const resizeWatcher = useContext(ResizeWatcherContext);
  const [trackedCount, setTrackedCount] = useState(0);

  useEffect(() => {
    // Read count after each render triggered by a cycle.
    if (resizeWatcher && typeof resizeWatcher.getTrackedElementCount === 'function') {
      setTrackedCount(resizeWatcher.getTrackedElementCount());
    }
  });

  return (
    <div
      style={{
        fontFamily: 'monospace',
        fontSize: '13px',
        background: '#1e1e1e',
        color: '#d4d4d4',
        padding: '8px 12px',
        borderRadius: '4px',
        lineHeight: '1.6',
      }}
    >
      <div>Viewport cycles: <strong>{cycleCount}</strong></div>
      <div>
        ResizeWatcher tracked elements:{' '}
        <strong style={{ color: trackedCount > 4 ? '#f44' : '#4f4' }}>
          {trackedCount}
        </strong>
        {trackedCount > 4 && (
          <span style={{ color: '#f44', marginLeft: '8px' }}>
            ⚠ leak detected — count should be ≤ 4
          </span>
        )}
      </div>
      <div style={{ color: '#888', fontSize: '11px', marginTop: '4px' }}>
        Expected: 2 elements per view (container + openGL container) = 4 total
        for 2 views.
      </div>
    </div>
  );
}

function TwoViews() {
  return (
    <div style={{ display: 'flex', width: '100%', height: '300px' }}>
      <div style={{ flex: 1, margin: '4px' }}>
        <View>
          <GeometryRepresentation>
            <Algorithm vtkClass={vtkConeSource} />
          </GeometryRepresentation>
        </View>
      </div>
      <div style={{ flex: 1, margin: '4px' }}>
        <View>
          <GeometryRepresentation>
            <Algorithm vtkClass={vtkConeSource} state={{ direction: [0, 1, 0] }} />
          </GeometryRepresentation>
        </View>
      </div>
    </div>
  );
}

function Example() {
  const [showViews, setShowViews] = useState(true);
  const [cycleCount, setCycleCount] = useState(0);
  const intervalRef = useRef(null);
  const [autoCycle, setAutoCycle] = useState(false);

  const cycle = () => {
    setShowViews(false);
    setTimeout(() => {
      setShowViews(true);
      setCycleCount((c) => c + 1);
    }, 200);
  };

  useEffect(() => {
    if (autoCycle) {
      intervalRef.current = setInterval(cycle, 800);
    } else {
      clearInterval(intervalRef.current);
    }
    return () => clearInterval(intervalRef.current);
  }, [autoCycle]);

  return (
    <MultiViewRoot style={{ width: '100%' }}>
      <div style={{ padding: '8px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button onClick={cycle}>Cycle views once</button>
          <button onClick={() => setAutoCycle((v) => !v)}>
            {autoCycle ? '⏹ Stop auto-cycle' : '▶ Start auto-cycle'}
          </button>
          <ResizeWatcherStats cycleCount={cycleCount} />
        </div>
        {showViews && <TwoViews />}
      </div>
    </MultiViewRoot>
  );
}

export default Example;
