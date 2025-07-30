import field from "./field_map.jpg";
import { useState, useRef, useEffect, useCallback } from 'react';import './App.css';

function App() {

  const [paths, setPaths] = useState([
    {
      name: "Main Path",
      startHeading: 0,
      endHeading: 90,
      headingControlType: "linear", // Options: "linear", "tangential, "constant"
      points: [
        {x: 0, y: 0},  // in mm
        {x: 500, y: 500},
        {x: 600, y: 1200}
      ]
    }
  ]);

  const [robot, setRobot] = useState({
    x: paths[0].points[0].x, 
    y: paths[0].points[0].y , 
    width: robotAttributes[0].defaultValue * 25.4, // Convert to mm
    length: robotAttributes[1].defaultValue * 25.4,// Convert to mm
    heading: 0,
    speed: robotAttributes[2].defaultValue,
    buffer: robotAttributes[3].defaultValue * 25.4 // Convert to mm
  });

  // Controls animation state
  const [animationState, setAnimationState] = useState({
    isPlaying: false,
    totalProgress: 0, // 0 to 1 across all paths
    pathProgress: 0, // 0 to 1 within current path
    currentPathIndex: 0,
    pathStartTimes: [], // stores when each path starts (in 0-1 progress)
  });

  // Tracks obstacles
  const [obstacles, setObstacles] = useState([
    {
      name: "Submersible",
      points: [
        {x: 375, y: 565}, // first point
        {x: 600, y: 565}, // second point
        {x: 600, y: 610},  // etc
        {x: -600, y: 610},
        {x: -600, y: 565},
        {x: -375, y: 565},
        {x: -375, y: -565},
        {x: -600, y: -565},
        {x: -600, y: -610},
        {x: 600, y: -610},
        {x: 600, y: -565},
        {x: 375, y: -565}
      ]
    },
    {
      name: "Blue Bucket",
      points: [
        {x: 1680, y: 1500},
        {x: 1770, y: 1630},
        {x: 1600, y: 1770},
        {x: 1500, y: 1670}
      ]
    },
    {
      name: "Red Bucket",
      points: [
        {x: -1680, y: -1500},
        {x: -1770, y: -1630},
        {x: -1600, y: -1770},
        {x: -1500, y: -1670}
      ]
    }

  ]);

  //toggles obstacles expanded state
  const [obstaclesExpanded, setObstaclesExpanded] = useState(false);

  return (
    <div className="App">
      <header className="App-header">
        <FieldMap robot={robot} setRobot={setRobot} paths={paths} setPaths={setPaths} obstacles={obstacles} setObstacles={setObstacles} showObstacles={obstaclesExpanded} />
        <SideBar robot={robot} setRobot={setRobot} paths={paths} setPaths={setPaths} animationState={animationState} setAnimationState={setAnimationState} obstacles={obstacles} setObstacles={setObstacles} obstaclesExpanded={obstaclesExpanded} setObstaclesExpanded={setObstaclesExpanded} />
      </header>
    </div>
  );
}

function FieldMap({ robot, setRobot, paths, setPaths, obstacles, setObstacles, showObstacles }) {
  const canvasRef = useRef(null);
  const pointsCanvasRef = useRef(null);
  const [draggingIndex, setDraggingIndex] = useState(null);
  const [pathDraggingIndex, setPathIndex] = useState(null);
  const [obstacleDragging, setObstacleDragging] = useState({
    obstacleIndex: null,
    pointIndex: null
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    const pointsCanvas = pointsCanvasRef.current;
    if (!canvas || !pointsCanvas) return;
    
    // Set both canvases to same size
    const container = canvas.parentElement;
    const displayWidth = container.clientWidth;
    const displayHeight = container.clientHeight;

    canvas.width = pointsCanvas.width = displayWidth;    
    canvas.height = pointsCanvas.height = displayHeight;

    const ctx = canvas.getContext('2d');
    const pointsCtx = pointsCanvas.getContext('2d');
    
    drawRobot(ctx, canvas, robot);
    drawPoints(pointsCtx, pointsCanvas);
    drawSplines(ctx, canvas);
    drawObstacles(ctx, canvas);
  }, [robot, setRobot, paths, setPaths, obstacles, setObstacles, showObstacles]); // Now this effect depends on the robot state


  const drawObstacles = (ctx, canvas) => {
    if (!showObstacles) return;  // Skip drawing if obstacles are hidden

    const scale = canvas.width / 3580;
    
    obstacles.forEach(obstacle => {
      if (obstacle.points.length < 2) return;
      
      ctx.fillStyle = 'rgba(255, 0, 0, 0.3)'; // Transparent red fill
      ctx.strokeStyle = '#FF0000'; // Solid red border
      ctx.lineWidth = 2;
      
      ctx.beginPath();
      obstacle.points.forEach((point, index) => {
        const x = (point.x * scale) + (canvas.width / 2);
        const y = canvas.height - (point.y * scale) - (canvas.height / 2);
        
        if (index === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
        
      });
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    });

      obstacles.forEach((obstacle, obsIndex) => {
      if (obstacle.points.length < 2) return;
      
      ctx.fillStyle = 'rgba(255, 0, 0, 0.3)';
      ctx.strokeStyle = '#FF0000';
      ctx.lineWidth = 2;
      
      ctx.beginPath();
      obstacle.points.forEach((point, pointIndex) => {
        const x = (point.x * scale) + (canvas.width / 2);
        const y = canvas.height - (point.y * scale) - (canvas.height / 2);
        
        if (pointIndex === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
        
        // Draw obstacle points
        ctx.fillStyle = '#FF0000'; //Red for points
        ctx.beginPath();
        ctx.arc(x, y, 8, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.closePath();
      ctx.fillStyle = 'rgba(255, 0, 0, 0.3)';
      ctx.fill();
      ctx.stroke();
    });

  };

  const drawPoints = (ctx, canvas) => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const scale = canvas.width / 3580;
    
    for (let i = 0; i < paths.length; i++) {
      const path = paths[i];
      path.points.forEach((point, index) => {
        // Convert to canvas coords (same as robot). Move origin to center without translating
        const x = (point.x * scale) + (canvas.width / 2);
        const y = canvas.height - (point.y * scale) - (canvas.height / 2); // Flip Y axis
        
        // Draw point
        ctx.fillStyle = index === 0 ? 'blue' : 'green';
        ctx.beginPath();
        ctx.arc(x, y, 10, 0, Math.PI * 2);
        ctx.fill();
      });
    }
  };

  const drawSplines = (ctx, canvas) => {
    const scale = canvas.width / 3580;
    
    paths.forEach(path => {
      if (path.points.length < 2) return;
      
      const splinePoints = generateSplinePath(path.points);
      
      ctx.beginPath();
      ctx.strokeStyle = '#FF0000'; // Red color for spline
      ctx.lineWidth = 2;
      
      // Draw the spline
      splinePoints.forEach((point, index) => {
        const x = (point.x * scale) + (canvas.width / 2);
        const y = canvas.height - (point.y * scale) - (canvas.height / 2);
        
        if (index === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });
      
      ctx.stroke();
    });
  };

  const drawRobot = (ctx, canvas, robot) => {
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Calculate scaling (3580mm field to canvas pixels)
    const scale = canvas.width / 3580;
    
    // Save context, translate/rotate, then draw
    ctx.save();
    // Move origin to center (now (0,0) is center of canvas)
    ctx.translate(canvas.width/2, canvas.height/2);
    
    // Flip Y axis so positive is up
    ctx.scale(1, -1);
    
    //get robot dimensions in scaled pixels
    const robotWidth = robot.width * scale; // Convert to pixels
    const robotLength = robot.length * scale; // Convert to pixels

    // Apply robot position (now in center-relative coords)
    ctx.translate(robot.x * scale, robot.y * scale);
    ctx.rotate(robot.heading * Math.PI / 180);
    
    // Draw robot body (centered)
    ctx.fillStyle = '#3a86ff'; // Nice blue color
    ctx.strokeStyle = '#1a4b9b'; // Darker blue for border
    ctx.lineWidth = 2;

    // Main robot body
    ctx.beginPath();
    ctx.roundRect(
      -robotWidth/2,
      -robotLength/2,
      robotWidth,
      robotLength,
      [robotWidth * 0.2] // Rounded corners
    );
    ctx.fill();
    ctx.stroke();
    
    // Draw wheels (4 wheels - one on each corner)
    const wheelWidth = robotWidth * 0.15;
    const wheelLength = robotLength * 0.25;
    const wheelOffset = 0.75; // How close to edge wheels are lengthwise
    const wheelWidthOffset = 0.85; // How close to edge wheels are widthwise
    
    ctx.fillStyle = '#333333';
    ctx.strokeStyle = '#000000';
    
    // Front left wheel
    ctx.fillRect(
      -robotWidth/2 * wheelWidthOffset- wheelWidth/2,
      robotLength/2 * wheelOffset - wheelLength/2,
      wheelWidth,
      wheelLength
    );
    
    // Front right wheel
    ctx.fillRect(
      robotWidth/2 * wheelWidthOffset - wheelWidth/2,
      robotLength/2 * wheelOffset - wheelLength/2,
      wheelWidth,
      wheelLength
    );
    
    // Rear left wheel
    ctx.fillRect(
      -robotWidth/2 * wheelWidthOffset - wheelWidth/2,
      -robotLength/2 * wheelOffset - wheelLength/2,
      wheelWidth,
      wheelLength
    );
    
    // Rear right wheel
    ctx.fillRect(
      robotWidth/2 * wheelWidthOffset - wheelWidth/2,
      -robotLength/2 * wheelOffset - wheelLength/2,
      wheelWidth,
      wheelLength
    );
    
    // Draw front indicator
    ctx.fillStyle = '#ff0000';
    ctx.beginPath();
    ctx.arc(0, robotLength/2 * 0.8, robotWidth * 0.1, 0, Math.PI * 2);
    ctx.fill();
    
    // Draw center point (for orientation debugging)
    ctx.fillStyle = '#00ff00';
    ctx.beginPath();
    ctx.arc(0, 0, 3, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.restore();
  };

  const handleMouseDown = (e) => {
    const canvas = pointsCanvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const scale = canvas.width / 3580;
    
    // Get mouse position in mm
    const mouseX = -((3580/2) - (e.clientX - rect.left) / scale);
    const mouseY = (3580/2) - ((e.clientY - rect.top) / scale); // Flip Y
    
    for (let i = 0; i < paths.length; i++) {
      const path = paths[i];
      const clickedIndex = path.points.findIndex(point => {
        const dx = mouseX - point.x;
        const dy = mouseY - point.y;
        return Math.sqrt(dx * dx + dy * dy) < 70; 
      });
      if (clickedIndex >= 0) {
        setDraggingIndex(clickedIndex);
        setPathIndex(i);
        return;
      }
    }

    // handles obstacle dragging
    for (let i = 0; i < obstacles.length; i++) {
      const obstacle = obstacles[i];
      const clickedIndex = obstacle.points.findIndex(point => {
        const dx = mouseX - point.x;
        const dy = mouseY - point.y;
        return Math.sqrt(dx * dx + dy * dy) < 70;
      });
      if (clickedIndex >= 0) {
        setObstacleDragging({
          obstacleIndex: i,
          pointIndex: clickedIndex
        });
        return;
      }
    }

  };

  const handleMouseMove = (e) => {
    if (draggingIndex === null && obstacleDragging.obstacleIndex === null) return;

    const canvas = pointsCanvasRef.current;
    if (!canvas) return; 
    
    const rect = canvas.getBoundingClientRect();
    const scale = canvas.width / 3580;
    
    if (obstacleDragging.obstacleIndex !== null) {
      const newX = -((3580/2) - (e.clientX - rect.left) / scale);
      const newY = (3580/2) - ((e.clientY - rect.top) / scale);
      
      setObstacles(prev => {
        const updated = [...prev];
        updated[obstacleDragging.obstacleIndex].points[obstacleDragging.pointIndex] = {x: newX, y: newY};
        return updated;
      });
      
      // Redraw
      const ctx = canvasRef.current.getContext('2d');
      drawRobot(ctx, canvasRef.current, robot);
      drawObstacles(ctx, canvasRef.current);
      return;
    }

    // Calculate new position in mm
    const newX = -((3580/2) - (e.clientX - rect.left) / scale);
    const newY = (3580/2) - ((e.clientY - rect.top) / scale); // Flip Y

    setPaths(prev => {
      const updated = [...prev];
      updated[pathDraggingIndex].points[draggingIndex] = {x: newX, y: newY};
      return updated;
    });

    // Update robot if first point
    if (draggingIndex === 0) {
      setRobot(prev => ({...prev, x: newX, y: newY}));
    }
    
    // Redraw
    const pointsCtx = pointsCanvasRef.current.getContext('2d');
    drawPoints(pointsCtx, pointsCanvasRef.current, robot);
  };

  const handleMouseUp = () => {
    setDraggingIndex(null);
    setPathIndex(null);
    setObstacleDragging({
      obstacleIndex: null,
      pointIndex: null
    });

  };

  useEffect(() => {
    if (draggingIndex !== null || obstacleDragging.obstacleIndex !== null) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [draggingIndex, pathDraggingIndex, obstacleDragging, handleMouseMove, handleMouseUp]);

  return (
    <div className="Field-map">
      <img src={field} alt="Field Map" className="Field-image" />
      <canvas className="Field-canvas" id="fieldCanvas" ref={canvasRef} />
      <canvas 
        className="Points-canvas" 
        ref={pointsCanvasRef}
        onMouseDown={handleMouseDown}
        //style={{ cursor: draggingIndex !== null ? 'grabbing' : 'pointer' }}
      />
    </div>
  );
}

function SideBar({ robot, setRobot, paths, setPaths, animationState, setAnimationState, obstacles, setObstacles, obstaclesExpanded, setObstaclesExpanded }) {

  return (
    <div className="Side-bar">
      <AttributesInputField robot={robot} setRobot={setRobot}/>
      <PathManager paths={paths} setPaths={setPaths} setRobot={setRobot} setAnimationState={setAnimationState} obstacles={obstacles} robot={robot} />
      <ObstacleManager obstacles={obstacles} setObstacles={setObstacles} obstaclesExpanded={obstaclesExpanded} setObstaclesExpanded={setObstaclesExpanded} />
      <AnimationControls animationState={animationState} setAnimationState={setAnimationState} paths={paths} robot={robot} setRobot={setRobot} />
    </div>
  );
}

function AnimationControls({ 
  animationState, 
  setAnimationState,
  paths,
  robot,
  setRobot
}) {
  const animationRef = useRef(null);
  const prevTimeRef = useRef(0);

  // Calculate path durations based on length
  const calculatePathDurations = useCallback((paths) => {
    const durations = [];
    let totalLength = 0;
    
    if (!paths || paths.length === 0) {
      return {
        pathLengths: [],
        totalLength: 0,
        startTimes: []
      };
    }

    // First calculate all path lengths
    const pathLengths = paths.map(path => {
      const points = generateSplinePath(path.points);
      let length = 0;
      for (let i = 1; i < points.length; i++) {
        const dx = points[i].x - points[i-1].x;
        const dy = points[i].y - points[i-1].y;
        length += Math.sqrt(dx*dx + dy*dy);
      }
      return length;
    });

    totalLength = pathLengths.reduce((sum, len) => sum + len, 0);
    
    // Calculate start times (0-1) for each path
    let accumulatedLength = 0;
    const startTimes = pathLengths.map(length => {
      const startTime = accumulatedLength / totalLength;
      accumulatedLength += length;
      return startTime;
    });

    return {
      pathLengths,
      totalLength,
      startTimes
    };
  }, []);

  // Animation frame callback
  const animate = (time) => {
    if (!prevTimeRef.current || !animationState.isPlaying) {
      prevTimeRef.current = time;
      animationRef.current = requestAnimationFrame(animate);
      return;
    }

    const deltaTime = (time - prevTimeRef.current) / 1000; // in seconds
    prevTimeRef.current = time;

    setAnimationState(prev => {
      if (!prev.isPlaying) return prev;
      
      const distanceTraveled = deltaTime * robot.speed; // Use current robot speed
      const pathData = calculatePathDurations(paths);
      const totalDistance = pathData.totalLength;
      
      var newTotalProgress = Math.min(
        prev.totalProgress + (distanceTraveled / totalDistance),
        1
      );

      if (isNaN(newTotalProgress) || newTotalProgress < 0 || newTotalProgress > 1) {
        newTotalProgress = 0;
      }

      return {
        ...prev,
        totalProgress: newTotalProgress
      };
    });

    animationRef.current = requestAnimationFrame(animate);
  };

  // Helper function to find shortest angle between two headings
  const shortestAngle = (from, to) => {
    const difference = to - from;
    return ((difference + 180) % 360) - 180;
  };

  useEffect(() => {
    if (animationState.isPlaying) {
      animationRef.current = requestAnimationFrame(animate);
    }
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [animationState.isPlaying, paths]);

  // Update robot position when progress changes
  useEffect(() => {
    if (!paths || paths.length === 0) return;

    const pathData = calculatePathDurations(paths);
      const { pathLengths, startTimes } = pathData;
      
      // Find current path index based on total progress
      let currentPathIndex = 0;
      let pathProgress = 0;
      
      for (let i = 0; i < startTimes.length; i++) {
        if (animationState.totalProgress >= startTimes[i]) {
          currentPathIndex = i;
          pathProgress = (animationState.totalProgress - startTimes[i]) / 
                        ((startTimes[i+1] || 1) - startTimes[i]);
        }
      }
      // Saftey check
      if (!paths[currentPathIndex]) return;

      const currentPath = paths[currentPathIndex];
      const splinePoints = generateSplinePath(currentPath.points);
      
      // Calculate exact position along path
      const targetDistance = pathProgress * pathLengths[currentPathIndex];
      let accumulatedDistance = 0;
      let pointIndex = 0;
      
      // Find segment where target distance falls
      for (let i = 1; i < splinePoints.length; i++) {
        const segmentLength = Math.sqrt(
          Math.pow(splinePoints[i].x - splinePoints[i-1].x, 2) +
          Math.pow(splinePoints[i].y - splinePoints[i-1].y, 2)
        );
        
        if (accumulatedDistance + segmentLength >= targetDistance) {
          pointIndex = i-1;
          break;
        }
        accumulatedDistance += segmentLength;
      }
      
      // Calculate exact position between points
      const remainingDistance = targetDistance - accumulatedDistance;
      const currentPoint = splinePoints[pointIndex];
      const nextPoint = splinePoints[pointIndex+1] || currentPoint;
      const segmentLength = Math.sqrt(
        Math.pow(nextPoint.x - currentPoint.x, 2) +
        Math.pow(nextPoint.y - currentPoint.y, 2)
      );
      
      const segmentProgress = segmentLength > 0 ? remainingDistance / segmentLength : 0;
      
      const newX = currentPoint.x + (nextPoint.x - currentPoint.x) * segmentProgress;
      const newY = currentPoint.y + (nextPoint.y - currentPoint.y) * segmentProgress;
      
      // Calculate heading based on control type
      let newHeading;
      switch(currentPath.headingControlType) {
        case 'constant':
          newHeading = currentPath.startHeading;
          break;
        case 'linear':
          const angleDiff = shortestAngle(currentPath.startHeading, currentPath.endHeading);
          newHeading = currentPath.startHeading + (angleDiff * pathProgress);
          break;
        case 'tangential':
          const dx = nextPoint.x - currentPoint.x;
          const dy = nextPoint.y - currentPoint.y;
          newHeading = Math.atan2(dy, dx) * (180 / Math.PI) - 90;
          break;
        default:
          newHeading = robot.heading;
      }

    // Normalize heading to 0-360
    newHeading = (newHeading % 360 + 360) % 360;

      setRobot(prev => ({
        ...prev,
        x: newX,
        y: newY,
        heading: newHeading
      }));

  }, [animationState.totalProgress, paths]);

  // Play/pause button handler
  const togglePlayPause = () => {
    setAnimationState(prev => {
      const isNowPlaying = !prev.isPlaying;
      
      // Reset the timestamp when pausing or playing
      if (isNowPlaying) {
        prevTimeRef.current = null;
      }
      var progress = prev.totalProgress;
      if (isNaN(progress) || progress < 0 || progress > 1 || progress === 1) {
        // Reset progress if it's invalid or at the end
        progress = 0;
      }

      return {
        ...prev,
        isPlaying: isNowPlaying,
        totalProgress: progress
      };
    });
    console.log("animation state", animationState);
  };

  return (
    <div className="animation-controls">
      <button onClick={togglePlayPause}>
        {animationState.isPlaying ? 'Pause' : 'Play'}
      </button>
      
      <input                       
        type="range"
        min="0"
        max="1"
        step="0.0001"
        value={animationState.totalProgress}
        onChange={(e) => {
          setAnimationState(prev => ({
            ...prev,
            totalProgress: parseFloat(e.target.value),
            isPlaying: false
          }));
        }}
      />
      <span>
        {Math.round(animationState.totalProgress * 100)}%
      </span>

    </div>
  );
}

const robotAttributes = [
  {name: "Width", defaultValue: 15},
  {name: "Length", defaultValue: 15},
  {name: "Speed", defaultValue: 1000}, // This is in mm/s
  {name: "Buffer", defaultValue: 2} // This is for the path generation.
];

function AttributesInputField({ robot, setRobot }) {
  const listItems = robotAttributes.map((attribute) => (
    <div key={attribute.name} className="Attribute-input-item">
      <label>{attribute.name}:</label>
      <input 
        className="Attribute-input-number" 
        type="number" 
        defaultValue={attribute.defaultValue}
        onChange={(e) => {
          const newValue = parseFloat(e.target.value);
          if (!isNaN(newValue)) {
            setRobot(prev => {
              const updated = {...prev};
              if (attribute.name === "Speed") {
                updated.speed = newValue; // Store directly in mm/s
              } else {
                updated[attribute.name.toLowerCase()] = newValue * 25.4; // Convert to mm
              }
              return updated;
            });
          }
          console.log("Robot attributes updated:", robot);
        }} 
      />
    </div>
  ));
  
  return (
    <div className="Input-field">
      <h5>Robot Attributes</h5>
      <div className="Attribute-input-items-container">
        {listItems}
      </div>
    </div>
  );
}

function PathPointInputField({ point, setPaths, pathIndex, pointIndex, setRobot }) {
  return (
    <div className="Path-point-input">
      <span>Point {pointIndex + 1}: </span>
      <input 
        type="number" 
        placeholder="X (mm)" 
        value={point.x || 0} 
        onChange={(e) => {
          const newX = parseFloat(e.target.value);
          if (!isNaN(newX)) {
            setPaths(prev => {
              const updated = [...prev];
              updated[pathIndex].points[pointIndex].x = newX;
              return updated;
            });
            // Update robot position if this is the first point
            if (pointIndex === 0) {
              setRobot(prev => ({...prev, x: newX}));
            }
          }
        }} 
      />
      <input 
        type="number" 
        placeholder="Y (mm)" 
        value={point.y || 0} 
        onChange={(e) => {
          const newY = parseFloat(e.target.value);
          if (!isNaN(newY)) {
            setPaths(prev => {
              const updated = [...prev];
              updated[pathIndex].points[pointIndex].y = newY;
              return updated;
            });
            // Update robot position if this is the first point
            if (pointIndex === 0) {
              setRobot(prev => ({...prev, y: newY}));
            }

          }
        }} 
      />
      <button
        onClick={() => {
          setPaths(prev => {
            const updated = [...prev];
            updated[pathIndex].points.splice(pointIndex, 1);
            return updated;
          });
        }}
      >
        Delete Point
      </button>
      <button
        onClick={() => {
          setPaths(prev => {
            const updated = [...prev];
            const newPoint = {x: point.x + (Math.random() * 600 - 300), y: point.y + (Math.random() * 600 - 300)}; // Add random -600-600mm offset
            updated[pathIndex].points.splice(pointIndex + 1, 0, newPoint);
            return updated;
          });
        }}
      >
        Add Point Below
      </button>
    </div>
  );
}

function PathInput({ path, paths, setPaths, index, setRobot, obstacles, robot }) {
  const selectOption = useRef(null); // Initialize with null

  const handleAddPoint = (e) => {
    e.stopPropagation(); // Prevent event bubbling
    e.preventDefault(); // Prevent default behavior
    //new point should be randomly generated within 600mm of previous point
    const lastPoint = path.points[path.points.length - 1];
    const newPoint = {
      x: lastPoint.x + (Math.random() * 600 - 300), //
      y: lastPoint.y + (Math.random() * 600 - 300) // Randomly within 600mm of last point
    };

    setPaths(prev => {
      const updated = [...prev];
      updated[index].points = [...updated[index].points, newPoint];
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
      }
      return updated;
    });
  };
  return (
    <div className="Path-input">
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
      <select
        value={path.headingControlType}
        ref={selectOption}
        onChange={(e) => {
          const newType = e.target.value;
          setPaths(prev => {
            const updated = [...prev];
            updated[index].headingControlType = newType;
            return updated;
          });
        }}
      >
        <option value="linear">Linear</option>
        <option value="tangential">Tangential</option>
        <option value="constant">Constant</option>
      </select>

      
      { (path.headingControlType == "linear" || path.headingControlType == "constant")  && 
        <input 
          type="number" 
          placeholder="Start Heading (degrees)"
          value={path.startHeading || 0}
          onChange={(e) => {
            const newHeading = parseFloat(e.target.value);
          if (!isNaN(newHeading)) {
            setPaths(prev => {
              const updated = [...prev];
              updated[index].startHeading = newHeading;
              if (path.headingControlType == "constant") {
                updated[index].endHeading = newHeading;
              }
              return updated;
            });
          }
        }}
      /> }

      { path.headingControlType == "linear" && 
      <input 
        type="number" 
        placeholder="End Heading (degrees)"
        value={path.endHeading || 0}
        onChange={(e) => {
          const newHeading = parseFloat(e.target.value);
          if (!isNaN(newHeading)) {
            setPaths(prev => {
              const updated = [...prev];
              updated[index].endHeading = newHeading;
              return updated;
            });
          }
        }}
      /> }

      {path.points.map((point, pointIndex) => (
        <PathPointInputField 
          key={pointIndex} 
          point={point} 
          setPaths={setPaths} 
          pathIndex={index} 
          pointIndex={pointIndex} 
          setRobot={setRobot}
        />
      ))}
      
      <div className="point-controls">
        <button onClick={handleAddPoint}>
          Add Point
        </button>
        <button 
          onClick={handleRemovePoint} 
          disabled={path.points.length <= 1}
        >
          Remove Point
        </button>
        <button 
          onClick={() => {
            setPaths(prev => {
              const updated = [...prev];
              updated.splice(index, 1);
              return updated;
            });
          }}
          disabled={paths.length <= 1}
        >
          Delete Path
        </button>
        <button
          onClick={() => {
            setPaths(prev => {
              const updated = [...prev];
              const newPath = {
                name: `Path ${updated.length + 1}`,
                points: [{x: path.points[path.points.length - 1].x, y: path.points[path.points.length - 1].y}, {x: path.points[path.points.length - 1].x + (Math.random() * 600 - 300), y: path.points[path.points.length - 1].y + (Math.random() * 600 - 300)}],
                headingControlType: path.headingControlType,
                startHeading: path.startHeading,
                endHeading: path.endHeading
              };
              updated.splice(index + 1, 0, newPath);
              return updated;
            });
          }}
        >
          Add Path Below
        </button>
        <button
          onClick={() => {
            if (path.points.length === 2) {
              const newPath = generateOptimalPath(path, obstacles, robot);
              setPaths(prev => {
                const updated = [...prev];
                updated[index].points = newPath.points;
                return updated;
              });
            }
          }}
          disabled={path.points.length != 2}
        >
          Generate Path
        </button>
      </div>
    </div>
  );
}

function PathManager({ paths, setPaths, setRobot, setAnimationState, robot, obstacles }) {
  // Fixed: Single path add/remove
  const handleAddPath = () => {
    //first point is by defaut the same as the last point of the previous path
    const lastPath = paths[paths.length - 1];
    const firstPoint = lastPath ? lastPath.points[lastPath.points.length - 1] : {x: 0, y: 0};
    // Add new path with first point at the last point of the previous path and a new point after it
    const newPoint = {
      x: firstPoint.x + (Math.random() * 600 - 300), //
      y: firstPoint.y + (Math.random() * 600 - 300) // Randomly within 600mm of last point
    };

    // or at (0, 0) if no paths exist
    if (paths.length > 0 && firstPoint) {
      setPaths(prev => [...prev, {
        name: `Path ${prev.length+1}`,
        points: [{x: firstPoint.x, y: firstPoint.y}, newPoint],
        headingControlType: "tangential",
        startHeading: 0,  // Add default start heading
        endHeading: 0     // Add default end heading
      }]);
        
    } else {
      // If no paths exist, start with a default point at (0, 0)
      setPaths(prev => [...prev, {
        name: `Path ${prev.length+1}`,
        points: [{x: 0, y: 0}, newPoint],
        headingControlType: "tangential",
        startHeading: 0,
        endHeading: 0
      }]);
    }
    // Reset animation state when adding new path
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
      width: robotAttributes[0].defaultValue * 25.4, // Convert to
      length: robotAttributes[1].defaultValue * 25.4, // Convert to mm
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
        <div key={index} className="path-container">
          <PathInput 
            path={path} 
            paths={paths}
            setPaths={setPaths} 
            index={index} 
            setRobot={setRobot}
            obstacles={obstacles}
            robot={robot}
          />
        </div>
      ))}
      
      <div className="path-controls">
        <button onClick={handleAddPath}>
          Add Path
        </button>
        <button 
          onClick={handleRemovePath} 
          disabled={paths.length <= 1}
        >
          Remove Path
        </button>
      </div>
    </div>
  );
}

function ObstacleManager({ obstacles, setObstacles, obstaclesExpanded, setObstaclesExpanded }) {

  const handleAddObstacle = () => {
    const newObstacle = {
      name: `Obstacle ${obstacles.length + 1}`,
      points: [
        {x: Math.random() * 600, y: Math.random() * 600},
        {x: Math.random() * 600, y: Math.random() * 600},
        {x: Math.random() * 600, y: Math.random() * 600} // Start with 3 points
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
        <button onClick={handleAddObstacle}>
          Add Obstacle
        </button>
        <button 
          onClick={handleRemoveObstacle} 
          disabled={obstacles.length <= 0}
        >
          Remove Obstacle
        </button>
      </div>
      )}
    </div>
  );
}

function ObstacleInput({ obstacle, setObstacles, index, obstaclesExpanded, setObstaclesExpanded }) {
  //handle adding a new point to the obstacle
  const handleAddPoint = () => {
    setObstacles(prev => {
      const updated = [...prev];
      updated[index].points.push({
        x: Math.random() * 600, // Randomly generate new point
        y: Math.random() * 600
      });
      return updated;
    });
  };
  //handle removing the last point from the obstacle
  const handleRemovePoint = () => {
    setObstacles(prev => {
      const updated = [...prev];
      if (updated[index].points.length > 3) { // Keep at least 3
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
            value={point.x || 0}
            onChange={(e) => {
              const newX = parseFloat(e.target.value);
              if (!isNaN(newX)) {
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
            value={point.y || 0}
            onChange={(e) => {
              const newY = parseFloat(e.target.value);
              if (!isNaN(newY)) {
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
        <button onClick={handleAddPoint}>
          Add Point
        </button>
        <button 
          onClick={handleRemovePoint} 
          disabled={obstacle.points.length <= 3}
        >
          Remove Point
        </button>
      </div>
    </div> 
  );
}

// Catmull-Rom interpolation function
const catmullRomInterpolate = (p0, p1, p2, p3, t, tension = 0.5) => {
  const t2 = t * t;
  const t3 = t2 * t;
  
  const a0 = -tension * t3 + 2 * tension * t2 - tension * t;
  const a1 = (2 - tension) * t3 + (tension - 3) * t2 + 1;
  const a2 = (tension - 2) * t3 + (3 - 2 * tension) * t2 + tension * t;
  const a3 = tension * t3 - tension * t2;

  return {
    x: a0 * p0.x + a1 * p1.x + a2 * p2.x + a3 * p3.x,
    y: a0 * p0.y + a1 * p1.y + a2 * p2.y + a3 * p3.y
  };
};

// Main spline generation function
const generateSplinePath = (points, numSegments = 25, tension = 0.5) => {
  const path = [];
  
  if (points.length < 2) {
    return points; // Not enough points for a spline
  }

  if (points.length === 2) {
    // Simple linear interpolation for just two points
    const [p1, p2] = points;
    for (let i = 0; i < 100; i++) {
      const t = i / 99;
      path.push({
        x: p1.x + t * (p2.x - p1.x),
        y: p1.y + t * (p2.y - p1.y)
      });
    }
    return path;
  }

  for (let i = 0; i < points.length - 1; i++) {
    const p0 = i > 0 ? points[i - 1] : points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = i < points.length - 2 ? points[i + 2] : p2;

    for (let j = 0; j < numSegments; j++) {
      const t = j / numSegments;
      const interpolatedPoint = catmullRomInterpolate(p0, p1, p2, p3, t, tension);
      path.push(interpolatedPoint);
    }
  }

  // Add the last point
  path.push(points[points.length - 1]);
  return path;
};

function generateOptimalPath(path, obstacles, robot) {
  //make sure the path only has a start and end point
  if (path.points.length !== 2) {
    console.error("Path must have exactly two points for optimal path generation.");
    return path;
  }
  
  const worldToGrid = (x, y) => ({
    x: Math.floor((x + 1790) / gridSize),
    y: Math.floor((y + 1790) / gridSize)
  });

  //track time per step
  const startTime = performance.now();
  console.log("Starting optimal path generation...");
  //First, we need to define the coordinate grid
  const gridSize = 10; // Size of each grid cell in mm
  const gridWidth = Math.ceil(3580 / gridSize);
  const gridHeight = Math.ceil(3580 / gridSize);
  const grid = Array.from({ length: gridHeight }, () => Array(gridWidth).fill(0));

  //Mark non-walkable nodes based on obstacles and robot size.
  //Mark any node within an obstacle as non-walkable
  // Mark obstacles
  obstacles.forEach(obstacle => {
    if (obstacle.points.length < 3) return;
    
    // Get bounding box of obstacle
    const minX = Math.min(...obstacle.points.map(p => p.x));
    const maxX = Math.max(...obstacle.points.map(p => p.x));
    const minY = Math.min(...obstacle.points.map(p => p.y));
    const maxY = Math.max(...obstacle.points.map(p => p.y));
    
    // Convert to grid coordinates
    const gridMin = worldToGrid(minX, minY);
    const gridMax = worldToGrid(maxX, maxY);
    
    // Mark cells in bounding box
    for (let x = gridMin.x; x <= gridMax.x; x++) {
      for (let y = gridMin.y; y <= gridMax.y; y++) {
        const worldPos = {
          x: x * gridSize - 1790,
          y: y * gridSize - 1790
        };
        if (isPointInPolygon(
          obstacle.points.map(p => [p.x, p.y]), 
          [worldPos.x, worldPos.y]
        )) {
          grid[y][x] = -1;
        }
      }
    }
  });
  //Time update
  const obstacleTime = performance.now();
  console.log(`Obstacle marking took ${obstacleTime - startTime} ms`);
  //Then, mark any node within the buffer space as non-walkable (less than buffer distance from any non-walkable node)
  // Create distance field using a brushfire algorithm
  const bufferCells = Math.ceil((Math.sqrt((robot.width/2)**2 + (robot.length/2)**2) + robot.buffer) / gridSize);
  const distanceField = Array.from({length: gridHeight}, () => Array(gridWidth).fill(Infinity));

  // Initialize queue with obstacle cells
  const queue = [];
  for (let y = 0; y < gridHeight; y++) {
      for (let x = 0; x < gridWidth; x++) {
          if (grid[y][x] === -1) {
              distanceField[y][x] = 0;
              queue.push({x, y});
          }
      }
  }

  // 4-directional neighbors for brushfire spread
  const directions = [
      {dx: 1, dy: 0},
      {dx: -1, dy: 0}, 
      {dx: 0, dy: 1},
      {dx: 0, dy: -1}
  ];

  // Process queue
  while (queue.length > 0) {
      const current = queue.shift();
      
      for (const dir of directions) {
          const nx = current.x + dir.dx;
          const ny = current.y + dir.dy;
          
          if (nx >= 0 && nx < gridWidth && ny >= 0 && ny < gridHeight) {
              const newDist = distanceField[current.y][current.x] + 1;
              if (newDist < distanceField[ny][nx]) {
                  distanceField[ny][nx] = newDist;
                  if (newDist <= bufferCells) {
                      queue.push({x: nx, y: ny});
                  }
              }
          }
      }
  }

  // 3. Mark buffer zones
  for (let y = 0; y < gridHeight; y++) {
      for (let x = 0; x < gridWidth; x++) {
          if (distanceField[y][x] <= bufferCells && grid[y][x] !== -1) {
              grid[y][x] = -1;
          }
      }
  }
  //Time update
  const bufferTime = performance.now();
  console.log(`Buffer marking took ${bufferTime - obstacleTime} ms`);
  // Theta* implementation with Priority Queue
  const startNode = {
      x: Math.floor((path.points[0].x + 1790) / gridSize),
      y: Math.floor((path.points[0].y + 1790) / gridSize)
  };
  const endNode = {
      x: Math.floor((path.points[1].x + 1790) / gridSize),
      y: Math.floor((path.points[1].y + 1790) / gridSize)
  };

  // Theta* algorithm implementation
  const openSet = new PriorityQueue();
  const closedSet = new Set();
  const cameFrom = {};
  const gScore = {};
  const fScore = {};

  // Euclidean distance heuristic
  const heuristic = (a, b) => Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);

  // Initialize scores
  gScore[`${startNode.x},${startNode.y}`] = 0;
  fScore[`${startNode.x},${startNode.y}`] = heuristic(startNode, endNode);
  openSet.enqueue(startNode, fScore[`${startNode.x},${startNode.y}`]);

  while (!openSet.isEmpty()) {
      // Get node with lowest fScore (O(1) with priority queue)
      const currentNode = openSet.dequeue();

      // Path found
      if (currentNode.x === endNode.x && currentNode.y === endNode.y) {
          let newPath = [];
          let node = currentNode;
          while (node) {
              newPath.push({
                  x: node.x * gridSize - 1790,
                  y: node.y * gridSize - 1790
              });
              node = cameFrom[`${node.x},${node.y}`];
          }
          newPath.reverse();
          
          // Time update
          const pathTime = performance.now();
          console.log(`Path found in ${pathTime - bufferTime} ms`);
          
          // Simplify the path
          newPath = simplifyPath(newPath);
          
          // Time update
          const simplifyTime = performance.now();
          console.log(`Path simplification took ${simplifyTime - pathTime} ms`);
          
          // Ensure exact endpoint match
          newPath[newPath.length - 1] = {
              x: path.points[1].x,
              y: path.points[1].y
          };

          // Time update: total time
          const totalTime = performance.now();
          console.log(`Total time taken: ${totalTime - startTime} ms`);
          
          return {
              name: path.name,
              startHeading: path.startHeading,
              endHeading: path.endHeading,
              headingControlType: path.headingControlType,
              points: newPath,
          };
      }

      closedSet.add(`${currentNode.x},${currentNode.y}`);

      // Generate neighbors (8-directional)
      const neighbors = [
          // Cardinal directions
          {x: currentNode.x + 1, y: currentNode.y},
          {x: currentNode.x - 1, y: currentNode.y},
          {x: currentNode.x, y: currentNode.y + 1},
          {x: currentNode.x, y: currentNode.y - 1},
          // Diagonal directions
          {x: currentNode.x + 1, y: currentNode.y + 1},
          {x: currentNode.x - 1, y: currentNode.y + 1},
          {x: currentNode.x + 1, y: currentNode.y - 1},
          {x: currentNode.x - 1, y: currentNode.y - 1}
      ];

      for (const neighbor of neighbors) {
          // Skip invalid neighbors
          if (neighbor.x < 0 || neighbor.x >= gridWidth || 
              neighbor.y < 0 || neighbor.y >= gridHeight) continue;
          if (grid[neighbor.y][neighbor.x] === -1 || 
              closedSet.has(`${neighbor.x},${neighbor.y}`)) continue;

          // Theta* modification: Try to connect to grandparent
          let newGScore;
          if (cameFrom[`${currentNode.x},${currentNode.y}`]) {
              const grandparent = cameFrom[`${currentNode.x},${currentNode.y}`];
              if (hasLineOfSight(grid, grandparent, neighbor)) {
                  // Euclidean distance if line-of-sight exists
                  newGScore = gScore[`${grandparent.x},${grandparent.y}`] + 
                            heuristic(grandparent, neighbor);
                  
                  if (!gScore[`${neighbor.x},${neighbor.y}`] || 
                      newGScore < gScore[`${neighbor.x},${neighbor.y}`]) {
                      cameFrom[`${neighbor.x},${neighbor.y}`] = grandparent;
                      gScore[`${neighbor.x},${neighbor.y}`] = newGScore;
                      fScore[`${neighbor.x},${neighbor.y}`] = newGScore + heuristic(neighbor, endNode);
                      
                      if (!openSet.contains(neighbor)) {
                          openSet.enqueue(neighbor, fScore[`${neighbor.x},${neighbor.y}`]);
                      }
                      continue;
                  }
              }
          }

          // Standard A* update (grid-based distance)
          const tentativeGScore = gScore[`${currentNode.x},${currentNode.y}`] + 
                                heuristic(currentNode, neighbor);
          
          if (!gScore[`${neighbor.x},${neighbor.y}`] || 
              tentativeGScore < gScore[`${neighbor.x},${neighbor.y}`]) {
              cameFrom[`${neighbor.x},${neighbor.y}`] = currentNode;
              gScore[`${neighbor.x},${neighbor.y}`] = tentativeGScore;
              fScore[`${neighbor.x},${neighbor.y}`] = tentativeGScore + heuristic(neighbor, endNode);
              
              if (!openSet.contains(neighbor)) {
                  openSet.enqueue(neighbor, fScore[`${neighbor.x},${neighbor.y}`]);
              }
          }
      }
  }

  // No path found
  return path;
}

function isPointInPolygon(polygon, point) {
    let isInside = false;
    const x = point[0];
    const y = point[1];

    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        const xi = polygon[i][0];
        const yi = polygon[i][1];
        const xj = polygon[j][0];
        const yj = polygon[j][1];

        const intersect = ((yi > y) !== (yj > y)) &&
            (x < (xj - xi) * (y - yi) / (yj - yi) + xi);

        if (intersect) {
            isInside = !isInside;
        }
    }
    return isInside;
}

function simplifyPath(points, epsilon = 50) {
  if (points.length <= 2) return points;
  
  // Find the point with the maximum distance
  let maxDist = 0;
  let index = 0;
  const end = points.length - 1;
  
  for (let i = 1; i < end; i++) {
    const dist = perpendicularDistance(points[i], points[0], points[end]);
    if (dist > maxDist) {
      maxDist = dist;
      index = i;
    }
  }
  
  // If max distance is greater than epsilon, recursively simplify
  if (maxDist > epsilon) {
    const left = simplifyPath(points.slice(0, index + 1), epsilon);
    const right = simplifyPath(points.slice(index), epsilon);
    return left.slice(0, -1).concat(right);
  }
  
  // Otherwise, return just the endpoints
  return [points[0], points[end]];
}

function hasLineOfSight(grid, a, b) {
    // Bresenham's line algorithm
    let x0 = a.x, y0 = a.y;
    let x1 = b.x, y1 = b.y;
    const dx = Math.abs(x1 - x0);
    const dy = Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx - dy;

    while (true) {
        if (grid[y0][x0] === -1) return false;
        if (x0 === x1 && y0 === y1) break;
        
        const e2 = 2 * err;
        if (e2 > -dy) {
            err -= dy;
            x0 += sx;
        }
        if (e2 < dx) {
            err += dx;
            y0 += sy;
        }
    }
    return true;
}

function perpendicularDistance(point, lineStart, lineEnd) {
  const area = Math.abs(
    (lineEnd.x - lineStart.x) * (lineStart.y - point.y) - 
    (lineStart.x - point.x) * (lineEnd.y - lineStart.y)
  );
  const lineLength = Math.sqrt(
    Math.pow(lineEnd.x - lineStart.x, 2) + 
    Math.pow(lineEnd.y - lineStart.y, 2)
  );
  return area / lineLength;
}

// Priority Queue implementation for Theta*
class PriorityQueue {
    constructor() {
        this.elements = [];
    }

    enqueue(element, priority) {
        this.elements.push({element, priority});
        this.bubbleUp(this.elements.length - 1);
    }

    dequeue() {
        const min = this.elements[0];
        const end = this.elements.pop();
        if (this.elements.length > 0) {
            this.elements[0] = end;
            this.sinkDown(0);
        }
        return min.element;
    }

    bubbleUp(index) {
        const element = this.elements[index];
        while (index > 0) {
            const parentIndex = Math.floor((index - 1) / 2);
            const parent = this.elements[parentIndex];
            if (element.priority >= parent.priority) break;
            this.elements[parentIndex] = element;
            this.elements[index] = parent;
            index = parentIndex;
        }
    }

    sinkDown(index) {
        const length = this.elements.length;
        const element = this.elements[index];
        while (true) {
            let leftChildIndex = 2 * index + 1;
            let rightChildIndex = 2 * index + 2;
            let leftChild, rightChild;
            let swap = null;

            if (leftChildIndex < length) {
                leftChild = this.elements[leftChildIndex];
                if (leftChild.priority < element.priority) {
                    swap = leftChildIndex;
                }
            }
            if (rightChildIndex < length) {
                rightChild = this.elements[rightChildIndex];
                if (
                    (swap === null && rightChild.priority < element.priority) ||
                    (swap !== null && rightChild.priority < leftChild.priority)
                ) {
                    swap = rightChildIndex;
                }
            }
            if (swap === null) break;
            this.elements[index] = this.elements[swap];
            this.elements[swap] = element;
            index = swap;
        }
    }

    isEmpty() {
        return this.elements.length === 0;
    }

    contains(node) {
        return this.elements.some(item => 
            item.element.x === node.x && item.element.y === node.y
        );
    }
}

// Obstacle input
export default App;
