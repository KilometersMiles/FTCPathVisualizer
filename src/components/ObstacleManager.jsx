import { Plus, Minus, Trash2, Box, Zap, HelpCircle } from 'lucide-react';

function ObstacleManager({ obstacles, setObstacles, obstaclesExpanded, setObstaclesExpanded }) {

  const handleAddObstacle = () => {
    const newObstacle = {
      name: `Obstacle ${obstacles.length + 1}`,
      points: [
        { x: Math.random() * 600, y: Math.random() * 600 },
        { x: Math.random() * 600, y: Math.random() * 600 },
        { x: Math.random() * 600, y: Math.random() * 600 } // Start with 3 points
      ]
    };
    setObstacles(prev => [...prev, newObstacle]);
  };

  const handleRemoveObstacle = () => {
    if (obstacles.length > 0) {
      setObstacles(prev => prev.slice(0, -1));
    }
  }

  return (
    <div className="obstacle-manager">
      <div className="obstacle-header" onClick={() => setObstaclesExpanded(!obstaclesExpanded)}>
        <h5>Obstacles</h5>
        <span>{obstaclesExpanded ? '▼' : '▶'}</span>
      </div>

      {obstaclesExpanded && (
        <>
          {obstacles.map((obstacle, index) => (
            <ObstacleInput
              key={index}
              obstacle={obstacle}
              setObstacles={setObstacles}
              index={index}
              obstaclesExpanded={obstaclesExpanded}
              setObstaclesExpanded={setObstaclesExpanded}
            />
          ))}
        </>
      )}

      {obstaclesExpanded && (<div className="obstacle-controls">
        <button onClick={handleAddObstacle} title='Add Obstacle'>
          <Plus size={14} />&nbsp;&nbsp;Add Obstacle
        </button>
        <button
          onClick={handleRemoveObstacle}
          disabled={obstacles.length <= 0}
          title="Remove Obstacle"
        >
          <Trash2 size={14} />&nbsp;&nbsp;Remove Obstacle
        </button>
      </div>
      )}
    </div>
  );
}
function ObstacleInput({ obstacle, setObstacles, index, obstaclesExpanded, setObstaclesExpanded }) {
  const handleAddPoint = () => {
    setObstacles(prev => {
      const updated = [...prev];
      updated[index].points.push({
        x: Math.random() * 1200, // Randomly generate added points
        y: Math.random() * 1200
      });
      return updated;
    });
  };
  const handleRemovePoint = () => {
    setObstacles(prev => {
      const updated = [...prev];
      if (updated[index].points.length > 3) { // 3 points in a triangle
        updated[index].points.pop();
      }
      return updated;
    });
  };
  return (
    <div key={index} className="obstacle-container">
      <input
        type="text"
        value={obstacle.name}
        onChange={(e) => {
          setObstacles(prev => {
            const updated = [...prev];
            updated[index].name = e.target.value;
            return updated;
          });
        }}
        placeholder="Obstacle Name"
      />

      {obstacle.points.map((point, pointIndex) => (
        <div key={pointIndex} className="obstacle-point">
          <span>Point {pointIndex + 1}: </span>
          <input
            type="number"
            placeholder="X (mm)"
            value={point.x ?? 0}
            onBlur={(e) => {
              const val = e.target.value;
              if (val === "") {
                setPaths(prev => {
                  const updated = [...prev];
                  updated[pathIndex].points[pointIndex].x = 0;
                  return updated;
                });
              }
            }}
            onChange={(e) => {
              const val = e.target.value;
              const newX = parseFloat(val);
              if (val === "" || !isNaN(newX)) {
                setObstacles(prev => {
                  const updated = [...prev];
                  updated[index].points[pointIndex].x = newX;
                  return updated;
                });
              }
            }}
          />
          <input
            type="number"
            placeholder="Y (mm)"
            value={point.y ?? 0}
            onBlur={(e) => {
              const val = e.target.value;
              if (val === "") {
                setPaths(prev => {
                  const updated = [...prev];
                  updated[pathIndex].points[pointIndex].y = 0;
                  return updated;
                });
              }
            }}
            onChange={(e) => {
              const val = e.target.value;
              const newY = parseFloat(val);
              if (val === "" || !isNaN(newY)) {
                setObstacles(prev => {
                  const updated = [...prev];
                  updated[index].points[pointIndex].y = newY;
                  return updated;
                });
              }
            }}
          />
        </div>
      ))}
      <div className="obstacle-point-controls">
        <button onClick={handleAddPoint} title='Add Point'>
          <Plus size={14} />
        </button>
        <button
          onClick={handleRemovePoint}
          disabled={obstacle.points.length <= 3}
          title='Remove Icon'
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
}

export default ObstacleManager;