import { useState, useRef, useCallback } from 'react';
import { Plus, Minus, Trash2, Box, Zap, Route } from 'lucide-react';
import { getPredictableColor } from '../utils/colors';
import { ROBOT_ATTRIBUTES } from '../utils/initialData';
import { generateOptimalPath } from '../utils/pathfinding/ThetaStar';
import LightningButton from './LightningButton';

const updateCheckboxDefaults = (points) => {
  return points.map((point, index) => {
    const isFirstOrLast = index === 0 || index === points.length - 1;
    return {
      ...point,
      stop: point.userEditedStop !== undefined ? point.userEditedStop : isFirstOrLast,
      constrainHeading: point.userEditedConstrain !== undefined ? point.userEditedConstrain : isFirstOrLast
    };
  });
};

function PathManager({ attributes, paths, setPaths, setRobot, setAnimationState, robot, obstacles, abortControllers, pathsTotal, setPathsTotal, modules, setModules, addNotification, boundaryRect, keepInRect }) {
  // Fixed: Single path add/remove
  const handleAddPath = () => {
    setPathsTotal(prev => prev + 1);
    //first point is by defaut the same as the last point of the previous path
    const lastPath = paths[paths.length - 1];
    const firstPoint = lastPath ? lastPath.points[lastPath.points.length - 1] : { x: 0, y: 0, h: 0, stop: true, constrainHeading: true };
    // Add new path with first point at the last point of the previous path and a new point after it
    const newPoint = {
      x: firstPoint.x + (Math.random() * 600 - 300), //
      y: firstPoint.y + (Math.random() * 600 - 300), // Randomly within 600mm of last point
      h: firstPoint.h || 0,
      stop: true,
      constrainHeading: true
    };

    // or at (0, 0) if no paths exist
    if (paths.length > 0 && firstPoint) {
      setPaths(prev => [...prev, {
        name: `Path ${prev.length + 1}`,
        points: updateCheckboxDefaults([{ x: firstPoint.x, y: firstPoint.y }, newPoint]),
        pathpoints: [{ x: firstPoint.x, y: firstPoint.y }, newPoint],
        color: getPredictableColor(pathsTotal)
      }]);

    } else {
      // default point at (0, 0)
      setPaths(prev => [...prev, {
        name: `Path ${prev.length + 1}`,
        points: updateCheckboxDefaults([{ x: 0, y: 0 }, newPoint]),
        pathpoints: [{ x: 0, y: 0 }, newPoint],
        color: getPredictableColor(pathsTotal)
      }]);
    }
    // Reset animation state when adding new path so things don't go crazy
    setAnimationState(prev => ({
      ...prev,
      isPlaying: false,
      totalProgress: 0,
      currentPathIndex: 0
    }));

    // Also set the robot to the first point of the new path
    setRobot(prev => ({
      ...prev,  // Keep existing robot state
      x: firstPoint.x,
      y: firstPoint.y,
      width: ROBOT_ATTRIBUTES[0].defaultValue * 25.4, // Convert to
      length: ROBOT_ATTRIBUTES[1].defaultValue * 25.4, // Convert to mm
      heading: 90 // Default heading
    }));
  };

  const handleRemovePath = () => {
    if (paths.length > 0) {
      setPaths(prev => prev.slice(0, -1));
    }
  };

  return (
    <div className="path-manager">
      <h5>Paths</h5>

      {paths.map((path, index) => (
        <div key={index} className="path-container" style={{ border: `1px solid ${path.color}` }}>
          <PathInput
            attributes={attributes}
            path={path}
            paths={paths}
            setPaths={setPaths}
            index={index}
            setRobot={setRobot}
            obstacles={obstacles}
            robot={robot}
            abortControllers={abortControllers}
            pathsTotal={pathsTotal}
            setPathsTotal={setPathsTotal}
            setModules={setModules}
            modules={modules}
            addNotification={addNotification}
            boundaryRect={boundaryRect}
            keepInRect={keepInRect}
          />
        </div>
      ))}

      <div className="path-controls">
        <button onClick={handleAddPath} title='Add Path'>
          <Plus size={14} />&nbsp;&nbsp;Add Path
        </button>
        <button
          onClick={handleRemovePath}
          disabled={paths.length <= 1}
          title='Remove Path'
        >
          <Trash2 size={14} />&nbsp;&nbsp;Remove Path
        </button>
      </div>
    </div>
  );
}

function PathInput({ attributes, path, paths, setPaths, index, setRobot, obstacles, robot, abortControllers, pathsTotal, setPathsTotal, modules, setModules, addNotification, boundaryRect, keepInRect }) {
  const selectOption = useRef(null);
  const [isLoading, setIsLoading] = useState(false);
  const handleAddPoint = (e) => {
    e.stopPropagation(); // Prevent event bubbling
    e.preventDefault(); // Prevent default behavior
    const lastPoint = path.points[path.points.length - 1];
    const newPoint = {
      x: lastPoint.x + (Math.random() * 1200 - 300), //
      y: lastPoint.y + (Math.random() * 1200 - 300), // 
      h: lastPoint.h || 0,
      stop: false,
      constrainHeading: true
    };

    setPaths(prev => {
      const updated = [...prev];
      updated[index].points = [...updated[index].points, newPoint];
      const newPathPoints = [];
      for (let i = 0; i < updated[index].points.length - 1; i++) {
        const p1 = updated[index].points[i];
        const p2 = updated[index].points[i + 1];

        // Simple 2-point linear path for each segment
        newPathPoints.push({ x: p1.x, y: p1.y });
        newPathPoints.push({ x: p2.x, y: p2.y });
      }
      updated[index].pathpoints = newPathPoints;
      return updated;
    });
  };

  const handleRemovePoint = (e) => {
    e.stopPropagation();
    e.preventDefault();
    setPaths(prev => {
      const updated = [...prev];
      if (updated[index].points.length > 0) {
        updated[index].points = updated[index].points.slice(0, -1);
        const newPathPoints = [];
        for (let i = 0; i < updated[index].points.length - 1; i++) {
          const p1 = updated[index].points[i];
          const p2 = updated[index].points[i + 1];

          // Simple 2-point linear path for each segment
          newPathPoints.push({ x: p1.x, y: p1.y });
          newPathPoints.push({ x: p2.x, y: p2.y });
        }
        updated[index].pathpoints = newPathPoints;

      }
      return updated;
    });
  };
  const handleGeneratePath = async () => {
    if (isLoading) {
      return; // Prevent multiple clicks
    }
    setIsLoading(true);
    const controller = new AbortController();
    abortControllers.current[index] = controller;
    try {
      const pathName = path.name;
      addNotification('info', 'Optimizing path...', `Running solver parameters for ${pathName}`, 1000);
      console.log("Starting optimization for:", pathName);
      let robotRadius = Math.sqrt(((robot.length) / 2) ** 2 + ((robot.width) / 2) ** 2);
      let maxX = 20000000; //probably wont break if so big...
      let minX = -20000000;
      let maxY = 20000000;
      let minY = -20000000;
      if (keepInRect) {
        maxX = boundaryRect.maxX - robotRadius;
        minX = boundaryRect.minX + robotRadius;
        maxY = boundaryRect.maxY - robotRadius;
        minY = boundaryRect.minY + robotRadius;
      }
      const optimizedPoints = await window.electronAPI.runOptimizer({
        waypoints: updateCheckboxDefaults(path.points),
        obstacles: obstacles,
        attributes: attributes,
        boundary: {
          maxX: maxX,
          minX: minX,
          maxY: maxY,
          minY: minY
        }
      }, controller.signal);

      const abort = new Promise((_, reject) => {
        controller.signal.addEventListener('abort', () => {
          reject(new DOMException('Aborted', "Aborted error oof"))
        });
      });

      const safeOptimizedPoints = await Promise.race([optimizedPoints, abort]);

      let optimizedSuccess = true;
      setPaths(prev => {
        const optimizedPathIndexSafe = prev.findIndex(p => p.name === pathName);
        if (optimizedPathIndexSafe === -1) {
          addNotification('warning', 'Optimization Canceled', `Path deleted probably. ${pathName} generation canceled`, 3000);
          optimizedSuccess = false;
          console.log(optimizedSuccess);
          return prev;
        }
        const updated = [...prev];
        updated[optimizedPathIndexSafe] = {
          ...updated[optimizedPathIndexSafe],
          pathpoints: safeOptimizedPoints
        };
        return updated;
      });
      if (optimizedSuccess) {
        console.log(optimizedSuccess);
        addNotification("success", "Completed Optimization", path.name + " is now optimized.");
      }
      console.log("Optimization completed for:", path.name);
      console.log(path);

    } catch (error) {
      if (error.name === 'Aborted error oof') {
        console.log(`Path ${index} generation canceled.`);
        addNotification('warning', 'Optimization Canceled', `Aborted by user. ${pathName} generation canceled`, 3000);
      } else if (error.message.toString().includes("1")) {
        addNotification(
          'error', 'Infeasible Spline Constraints', 'Path is impossible to execute. Try changing constraints or boundaries.', 5000);
      } else {
        console.error("Optimization failed:", error);
        addNotification(
          'error',
          'Optimization Failed',
          error.message || 'An unexpected backend issue has occured.',
          5000
        );
      }
    } finally {
      setIsLoading(false);
      delete abortControllers.current[index];
    }
  };

  const handleRunThetaStar = () => {
    if (path.points.length === 2) {
      const newPath = generateOptimalPath(path, obstacles, robot, addNotification);
      setPaths(prev => {
        const updated = [...prev];
        updated[index].points = updateCheckboxDefaults(newPath.points);
        const newPathPoints = [];
        for (let i = 0; i < updated[index].points.length - 1; i++) {
          const p1 = updated[index].points[i];
          const p2 = updated[index].points[i + 1];

          // Simple 2-point linear path for each segment
          newPathPoints.push({ x: p1.x, y: p1.y });
          newPathPoints.push({ x: p2.x, y: p2.y });
        }
        updated[index].pathpoints = newPathPoints;
        return updated;
      });
    }
  };

  const handleCreateModule = (e) => {
    const modulePoints = [];
    for (let i = 0; i < path.points.length; i++) {
      var point = path.points[i];
      modulePoints.push(point);
    }
    const moduleName = path.name;
    setModules(prev => [...prev, {
      name: moduleName,
      path: {
        name: moduleName,
        startHeading: 180,
        endHeading: 180,
        headingControlType: "constant",
        points: modulePoints
      }
    }]);
    addNotification("success", "Module successfully created", `${path.name} was saved as a module.`)
  };

  return (
    <div>
      <input
        type="text"
        value={path.name}
        onChange={(e) => {
          setPaths(prev => {
            const updated = [...prev];
            updated[index].name = e.target.value;
            return updated;
          });
        }}
      />

      {path.points.map((point, pointIndex) => (
        <PathPointInputField
          key={pointIndex}
          point={point}
          setPaths={setPaths}
          pathIndex={index}
          pointIndex={pointIndex}
          setRobot={setRobot}
          paths={paths}
        />
      ))}

      <div className="point-controls">
        {/*These buttons are kinda repetative, idk whether or not to keep them */}
        {/* <button onClick={handleAddPoint} title='Add Point to End'>
          <Plus size={14} />
        </button>
        <button
          onClick={handleRemovePoint}
          disabled={path.points.length <= 1}
          title='Remove Point from end'
        >
          <Minus size={14} />
        </button> */}
        <button
          onClick={() => {
            setPathsTotal(prev => prev + 1);
            setPaths(prev => {
              const updated = [...prev];
              const newPath = {
                name: `Path ${updated.length + 1}`,
                points: updateCheckboxDefaults([{ x: path.points[path.points.length - 1].x, y: path.points[path.points.length - 1].y }, { x: path.points[path.points.length - 1].x + (Math.random() * 600 - 300), y: path.points[path.points.length - 1].y + (Math.random() * 600 - 300) }]),
                pathpoints: [{ x: path.points[path.points.length - 1].x, y: path.points[path.points.length - 1].y }, { x: path.points[path.points.length - 1].x + (Math.random() * 600 - 300), y: path.points[path.points.length - 1].y + (Math.random() * 600 - 300) }],
                color: getPredictableColor(pathsTotal)
              };
              updated.splice(index + 1, 0, newPath);
              return updated;
            });
          }}
          title='Add Path'
        >
          <Plus size={14} />&nbsp;&nbsp;Add Path
        </button>
        <button
          onClick={() => {
            if (abortControllers.current[index]) {
              abortControllers.current[index].abort();
            }
            setPaths(prev => {
              const updated = [...prev];
              updated.splice(index, 1);
              return updated;
            });
          }}
          disabled={paths.length <= 1}
          title="Delete Path"
        >
          <Trash2 size={14} />&nbsp;&nbsp;Delete Path
        </button>

        <button
          onClick={() => handleCreateModule()}
          title='Create Module'
        >
          <Box size={14} />
        </button>
        <button
          onClick={() => handleRunThetaStar()}
          title='Find best points'
          disabled={path.points.length != 2}
        >
          <Route size={14} />
        </button>
        <LightningButton
          className={`generate-btn ${isLoading ? 'loading' : ''}`}
          onClick={() => handleGeneratePath(index)}
          disabled={path.points.length < 2 || isLoading}
          isLoading={isLoading}
        >
          {!isLoading ? (
            <Zap size={14} />
          ) : (
            <div style={{ display: 'none' }} />
          )}
        </LightningButton>
      </div>
    </div>
  );
}

function PathPointInputField({ point, setPaths, pathIndex, pointIndex, setRobot, paths }) {
  return (
    <div className="Path-point-input">
      <span style={{ fontWeight: 'bold' }}>P{pointIndex + 1}</span>
      <div className='coordinates-row'>
        <input
          type="number"
          className="Path-point-input-number"
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
              setPaths(prev => {
                const updated = [...prev];
                updated[pathIndex].points[pointIndex].x = newX;
                const newPathPoints = [];
                for (let i = 0; i < updated[pathIndex].points.length - 1; i++) {
                  const p1 = updated[pathIndex].points[i];
                  const p2 = updated[pathIndex].points[i + 1];

                  // adds two points so drawing easier
                  newPathPoints.push({ x: p1.x, y: p1.y });
                  newPathPoints.push({ x: p2.x, y: p2.y });
                }
                updated[pathIndex].pathpoints = newPathPoints;
                return updated;
              });
              // only robot position if this is the first point
              if (pointIndex === 0) {
                setRobot(prev => ({ ...prev, x: newX }));
              }
            }
          }}
        />
        <input
          type="number"
          className="Path-point-input-number"
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
              setPaths(prev => {
                const updated = [...prev];
                updated[pathIndex].points[pointIndex].y = newY;
                const newPathPoints = [];
                for (let i = 0; i < updated[pathIndex].points.length - 1; i++) {
                  const p1 = updated[pathIndex].points[i];
                  const p2 = updated[pathIndex].points[i + 1];

                  // Simple 2-point linear path for each segment
                  newPathPoints.push({ x: p1.x, y: p1.y });
                  newPathPoints.push({ x: p2.x, y: p2.y });
                }
                updated[pathIndex].pathpoints = newPathPoints;
                return updated;
              });
              // Update robot position if this is the first point
              if (pointIndex === 0) {
                setRobot(prev => ({ ...prev, y: newY }));
              }

            }
          }}
        />
        <input
          type="number"
          className="Path-point-input-number"
          placeholder="H (degrees)"
          value={point.h ?? 0}
          onBlur={(e) => {
            const val = e.target.value;
            if (val === "") {
              setPaths(prev => {
                const updated = [...prev];
                updated[pathIndex].points[pointIndex].h = 0;
                return updated;
              });
            }
          }}
          onChange={(e) => {
            const val = e.target.value;
            const newH = parseFloat(val);
            if (val === "" || !isNaN(newH)) {
              setPaths(prev => {
                const updated = [...prev];
                updated[pathIndex].points[pointIndex].h = newH;
                return updated;
              });
              // Update robot position if this is the first point
              if (pointIndex === 0) {
                setRobot(prev => ({ ...prev, heading: newH }));
              }
            }
          }}
        />
      </div>
      <div className='controls-row'>
        <label className="toggle-label">
          <input type="checkbox" checked={point.stop}
            onChange={(e) =>
              setPaths(prev => {
                const updated = [...prev];
                updated[pathIndex].points[pointIndex] = {
                  ...updated[pathIndex].points[pointIndex],
                  stop: e.target.checked,
                  userEditedStop: e.target.checked
                };
                updated[pathIndex].points = updateCheckboxDefaults(updated[pathIndex].points);
                return updated;
              })
            }
          /> Stop
        </label>

        <label className="toggle-label">
          <input type="checkbox" checked={point.constrainHeading}
            onChange={(e) =>
              setPaths(prev => {
                const updated = [...prev];
                updated[pathIndex].points[pointIndex] = {
                  ...updated[pathIndex].points[pointIndex],
                  constrainHeading: e.target.checked,
                  userEditedConstrain: e.target.checked
                };
                updated[pathIndex].points = updateCheckboxDefaults(updated[pathIndex].points);
                return updated;
              })
            }
          /> Lock H
        </label>

        <button
          onClick={() => {
            setPaths(prev => {
              const updated = [...prev];
              const newPoint = { x: point.x + (Math.random() * 600 - 300), y: point.y + (Math.random() * 600 - 300) }; // Add random -600-600mm offset
              updated[pathIndex].points.splice(pointIndex + 1, 0, newPoint);
              updated[pathIndex].points = updateCheckboxDefaults(updated[pathIndex].points);
              const newPathPoints = [];
              for (let i = 0; i < updated[pathIndex].points.length - 1; i++) {
                const p1 = updated[pathIndex].points[i];
                const p2 = updated[pathIndex].points[i + 1];

                // Simple 2-point linear path for each segment
                newPathPoints.push({ x: p1.x, y: p1.y });
                newPathPoints.push({ x: p2.x, y: p2.y });
              }
              updated[pathIndex].pathpoints = newPathPoints;

              return updated;
            });
          }}
          title='Add Point'
        >
          <Plus size={14} />
        </button>
        <button
          onClick={() => {
            setPaths(prev => {
              const updated = [...prev];
              updated[pathIndex].points.splice(pointIndex, 1);
              updated[pathIndex].points = updateCheckboxDefaults(updated[pathIndex].points);
              const newPathPoints = [];
              for (let i = 0; i < updated[pathIndex].points.length - 1; i++) {
                const p1 = updated[pathIndex].points[i];
                const p2 = updated[pathIndex].points[i + 1];

                // Simple 2-point linear path for each segment
                newPathPoints.push({ x: p1.x, y: p1.y });
                newPathPoints.push({ x: p2.x, y: p2.y });
              }
              updated[pathIndex].pathpoints = newPathPoints;

              return updated;
            });
          }}
          disabled={paths[pathIndex].points.length <= 2}
          title='Delete Point'
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
}

export default PathManager;