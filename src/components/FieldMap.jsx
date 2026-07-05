import { useEffect, useRef, useState } from 'react';
import { getSpeedColor } from '../utils/colors';
import field from '../assets/DecodeField.jpg';

function FieldMap({ robot, setRobot, paths, setPaths, obstacles, setObstacles, showObstacles, abortControllers, showSpeedGradient, boundaryRect, setBoundaryRect }) {
  const canvasRef = useRef(null);
  const pointsCanvasRef = useRef(null);
  const [draggingIndex, setDraggingIndex] = useState(null);
  const [pathDraggingIndex, setPathIndex] = useState(null);
  const [obstacleDragging, setObstacleDragging] = useState({
    obstacleIndex: null,
    pointIndex: null
  });
  const [boundaryDragging, setBoundaryDragging] = useState(null);

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
    drawBoundaryRect(ctx, canvas);
    drawPoints(pointsCtx, pointsCanvas);
    drawObstacles(ctx, canvas);
  }, [robot, setRobot, paths, setPaths, obstacles, setObstacles, showObstacles, showSpeedGradient, boundaryRect]);


  const drawObstacles = (ctx, canvas) => {
    if (!showObstacles) return;  // Skip drawing if obstacles are hidden

    const scale = canvas.width / 3580;

    obstacles.forEach(obstacle => {
      if (obstacle.points.length < 2) return;

      ctx.fillStyle = 'rgba(255, 0, 0, 0.3)';
      ctx.strokeStyle = '#FF0000';
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

        ctx.fillStyle = '#FF0000';
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

  const drawBoundaryRect = (ctx, canvas) => {
    if (!boundaryRect.isVisible) return;
    const scale = canvas.width / 3580;

    ctx.fillStyle = 'rgba(43, 255, 0, 0.2)';
    ctx.strokeStyle = '#00ff0d';
    ctx.lineWidth = 2;

    let maxXCoord = (boundaryRect.maxX * scale) + (canvas.width / 2);
    let minXCoord = (boundaryRect.minX * scale) + (canvas.width / 2);
    let minYCoord = canvas.height - (boundaryRect.minY * scale) - (canvas.height / 2);
    let maxYCoord = canvas.height - (boundaryRect.maxY * scale) - (canvas.height / 2);

    ctx.beginPath();
    ctx.rect(minXCoord, maxYCoord, maxXCoord - minXCoord, minYCoord - maxYCoord);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  };

  const drawPoints = (ctx, canvas) => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const scale = canvas.width / 3580;

    for (let i = 0; i < paths.length; i++) {
      const path = paths[i];
      const pathColor = path.color || '#00FF00';

      const canGraphColor = path.pathpoints[0].v !== undefined && (path.pathpoints.length > path.points.length * 2);

      if (path.pathpoints && path.pathpoints.length > 1) {
        if (canGraphColor && showSpeedGradient) {
          ctx.lineWidth = 3;
          for (let j = 0; j < path.pathpoints.length - 1; j++) {
            const p1 = path.pathpoints[j];
            const p2 = path.pathpoints[j + 1];

            const x1 = (p1.x * scale) + (canvas.width / 2);
            const y1 = canvas.height - (p1.y * scale) - (canvas.height / 2);
            const x2 = (p2.x * scale) + (canvas.width / 2);
            const y2 = canvas.height - (p2.y * scale) - (canvas.height / 2);

            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);

            const velocity = p1.v || 0;
            ctx.strokeStyle = getSpeedColor(velocity, 2.0);
            ctx.stroke();
          }
        } else {
          ctx.lineWidth = 3;
          ctx.strokeStyle = pathColor;
          //not optimized = dash
          if (!(path.pathpoints.length > path.points.length * 2)) {
            ctx.setLineDash([8, 8]);
          } else {
            ctx.setLineDash([]);
          }
          path.pathpoints.forEach((pt, idx) => {
            const x = (pt.x * scale) + (canvas.width / 2);
            const y = canvas.height - (pt.y * scale) - (canvas.height / 2);
            if (idx === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          });
          ctx.stroke();

        }
      }
      path.points.forEach((point, index) => {
        // Convert to canvas coords (same as robot). Move origin to center without translating
        const x = (point.x * scale) + (canvas.width / 2);
        const y = canvas.height - (point.y * scale) - (canvas.height / 2); // Flip Y axis

        // Draw point
        ctx.fillStyle = pathColor; // Default to green if no color
        ctx.beginPath();
        ctx.arc(x, y, 10, 0, Math.PI * 2);
        ctx.fill();
      });
    }
  };

  const drawRobot = (ctx, canvas, robot) => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const scale = canvas.width / 3580;
    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.scale(1, -1);

    const robotWidth = robot.width * scale; // Convert to pixels
    const robotLength = robot.length * scale; // Convert to pixels

    ctx.translate(robot.x * scale, robot.y * scale);
    ctx.rotate((robot.heading * Math.PI / 180) + Math.PI / 2);

    ctx.fillStyle = 'rgba(6, 6, 26, 0.84)';
    ctx.strokeStyle = '#7dd3fc';
    ctx.shadowColor = '#7dd3fc';
    ctx.shadowBlur = 3;
    ctx.lineWidth = 3.5;

    ctx.beginPath();
    ctx.roundRect(
      -robotWidth / 2,
      -robotLength / 2,
      robotWidth,
      robotLength,
      [robotWidth * 0.22]
    );

    ctx.fill();
    ctx.stroke();

    const wheelWidth = robotWidth * 0.15;
    const wheelLength = robotLength * 0.25;
    const wheelOffset = 0.75;
    const wheelWidthOffset = 0.85;

    // ctx.fillStyle = '#333333';
    // ctx.strokeStyle = '#000000';
    ctx.shadowBlur = 0;

    // ctx.fillRect(
    //   -robotWidth / 2 * wheelWidthOffset - wheelWidth / 2,
    //   robotLength / 2 * wheelOffset - wheelLength / 2,
    //   wheelWidth,
    //   wheelLength
    // );

    // ctx.fillRect(
    //   robotWidth / 2 * wheelWidthOffset - wheelWidth / 2,
    //   robotLength / 2 * wheelOffset - wheelLength / 2,
    //   wheelWidth,
    //   wheelLength
    // );

    // ctx.fillRect(
    //   -robotWidth / 2 * wheelWidthOffset - wheelWidth / 2,
    //   -robotLength / 2 * wheelOffset - wheelLength / 2,
    //   wheelWidth,
    //   wheelLength
    // );

    // ctx.fillRect(
    //   robotWidth / 2 * wheelWidthOffset - wheelWidth / 2,
    //   -robotLength / 2 * wheelOffset - wheelLength / 2,
    //   wheelWidth,
    //   wheelLength
    // );

    // ctx.fillStyle = '#ff0000';
    // ctx.beginPath();
    // ctx.arc(0, robotLength / 2 * 0.8, robotWidth * 0.1, 0, Math.PI * 2);
    // ctx.fill();

    //dot
    ctx.fillStyle = '#7dd3fc';
    ctx.beginPath();
    ctx.arc(0, 0, 5, 0, Math.PI * 2);
    ctx.fill();

    // arroww
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, robotLength / 2);
    ctx.stroke();
    ctx.shadowBlur = 3
    ctx.beginPath();
    ctx.moveTo(-robotWidth * 0.14, robotLength / 2 - 2);
    ctx.lineTo(robotWidth * 0.14, robotLength / 2 - 2);
    ctx.lineTo(0, robotLength / 2 + robotLength * 0.2);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  };

  const handleMouseDown = (e) => {
    const canvas = pointsCanvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scale = canvas.width / 3580;

    // Get mouse position in mm
    const mouseX = -((3580 / 2) - (e.clientX - rect.left) / scale);
    const mouseY = (3580 / 2) - ((e.clientY - rect.top) / scale); // Flip Y

    if (boundaryRect.isVisible) {
      const tolerance = 50;
      if (Math.abs(mouseX - boundaryRect.minX) < tolerance && mouseY <= boundaryRect.maxY && mouseY >= boundaryRect.minY) {
        setBoundaryDragging('minX');
        return;
      }
      if (Math.abs(mouseX - boundaryRect.maxX) < tolerance && mouseY <= boundaryRect.maxY && mouseY >= boundaryRect.minY) {
        setBoundaryDragging('maxX');
        return;
      }
      if (Math.abs(mouseY - boundaryRect.minY) < tolerance && mouseX <= boundaryRect.maxX && mouseX >= boundaryRect.minX) {
        setBoundaryDragging('minY');
        return;
      }
      if (Math.abs(mouseY - boundaryRect.maxY) < tolerance && mouseX <= boundaryRect.maxX && mouseX >= boundaryRect.minX) {
        setBoundaryDragging('maxY');
        return;
      }
    }

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
    if (draggingIndex === null && obstacleDragging.obstacleIndex === null && boundaryDragging === null) return;

    const canvas = pointsCanvasRef.current;
    if (!canvas) return;

    if (boundaryDragging !== null) {
      const rect = pointsCanvasRef.current.getBoundingClientRect();
      const scale = pointsCanvasRef.current.width / 3580;
      const currentX = -((3580 / 2) - (e.clientX - rect.left) / scale);
      const currentY = (3580 / 2) - ((e.clientY - rect.top) / scale);

      setBoundaryRect(prev => {
        let next = { ...prev, [boundaryDragging]: boundaryDragging.endsWith('X') ? currentX : currentY };
        if (next.minX > next.maxX) {
          [next.minX, next.maxX] = [next.maxX, next.minX];
          setBoundaryDragging(boundaryDragging === 'minX' ? 'maxX' : 'minX');
        }
        if (next.minY > next.maxY) {
          [next.minY, next.maxY] = [next.maxY, next.minY];
          setBoundaryDragging(boundaryDragging === 'minY' ? 'maxY' : 'minY');
        }
        return next;
      });
      return;
    }

    const rect = canvas.getBoundingClientRect();
    const scale = canvas.width / 3580;

    if (obstacleDragging.obstacleIndex !== null) {
      const newX = -((3580 / 2) - (e.clientX - rect.left) / scale);
      const newY = (3580 / 2) - ((e.clientY - rect.top) / scale);

      setObstacles(prev => {
        const updated = [...prev];
        updated[obstacleDragging.obstacleIndex].points[obstacleDragging.pointIndex] = { x: newX, y: newY };
        return updated;
      });

      const ctx = canvasRef.current.getContext('2d');
      drawRobot(ctx, canvasRef.current, robot);
      drawObstacles(ctx, canvasRef.current);
      return;
    }

    const newX = -((3580 / 2) - (e.clientX - rect.left) / scale);
    const newY = (3580 / 2) - ((e.clientY - rect.top) / scale); // Flip Y


    setPaths(prev => {
      const updated = [...prev];
      updated[pathDraggingIndex].points[draggingIndex] = { x: newX, y: newY };
      const newPathPoints = [];
      for (let i = 0; i < updated[pathDraggingIndex].points.length - 1; i++) {
        const p1 = updated[pathDraggingIndex].points[i];
        const p2 = updated[pathDraggingIndex].points[i + 1];

        // Simple 2-point linear path for each segment
        newPathPoints.push({ x: p1.x, y: p1.y });
        newPathPoints.push({ x: p2.x, y: p2.y });
      }
      updated[pathDraggingIndex].pathpoints = newPathPoints;
      return updated;
    });

    if (draggingIndex === 0) {
      setRobot(prev => ({ ...prev, x: newX, y: newY }));
    }

    //abort optimization on drag, cause the points changed
    const abortController = abortControllers.current[pathDraggingIndex];
    if (abortController) {
      abortController.abort();
    }

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
    setBoundaryDragging(null);
  };

  useEffect(() => {
    if (draggingIndex !== null || obstacleDragging.obstacleIndex !== null || boundaryDragging != null) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [draggingIndex, pathDraggingIndex, obstacleDragging, boundaryDragging, handleMouseMove, handleMouseUp]);

  return (
    <div className="Field-map">
      <img src={field} alt="Field Map" className="Field-image" />
      <canvas className="Field-canvas" id="fieldCanvas" ref={canvasRef} />
      <canvas
        className="Points-canvas"
        ref={pointsCanvasRef}
        onMouseDown={handleMouseDown}
      />
    </div>
  );
}

export default FieldMap;