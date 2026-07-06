import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { ROBOT_ATTRIBUTES } from '../utils/initialData';
import { getPredictableColor } from '../utils/colors';
function AnimationControls({
  attributes,
  animationState,
  setAnimationState,
  paths,
  robot,
  setRobot
}) {
  const animationRef = useRef(null);
  const prevTimeRef = useRef(0);
  const [allPathsTime, setAllPathsTime] = useState(0);
  // Calculate path durations based on length
  const calculatePathDurations = useCallback((paths) => {
    const timeline = [];
    let cumulativeTime = 0;

    if (!paths || paths.length === 0) {
      return {
        timeline: [],
        totalTime: 0
      };
    }

    let endTimestampsAndColors = [];
    // First calculate all path lengths
    paths.forEach(path => {
      const pointArray = path.points;
      const pathPointArray = path.pathpoints;
      if ((pointArray.length * 2) >= pathPointArray.length) {
        // has not been optimized, so use acceleration to calculate time
        let pathTime = 0;
        const points = path.points;
        let pathDistance = 0;
        const segmentDistances = [];
        for (let i = 1; i < points.length; i++) {
          const dx = points[i].x - points[i - 1].x;
          const dy = points[i].y - points[i - 1].y;
          pathDistance += Math.sqrt(dx * dx + dy * dy);
          segmentDistances.push(pathDistance);
        }
        const acceleration = 1000; //mm/s just a heuristic not a optimizable variable
        const accelTime = robot.speed / acceleration;
        const accelDistance = 0.5 * acceleration * accelTime * accelTime;
        let timeAccel = 0;
        let timeDecel = 0;
        let timeCruise = 0;
        if (pathDistance < 2 * accelDistance) {
          // Triangle profile
          pathTime = 2 * Math.sqrt(pathDistance / acceleration);
          timeAccel = pathTime / 2;
          timeDecel = pathTime / 2;
        } else {
          // Trapezoidal profile
          const cruiseDistance = pathDistance - 2 * accelDistance;
          const cruiseTime = cruiseDistance / robot.speed;
          pathTime = 2 * accelTime + cruiseTime;
          timeAccel = accelTime;
          timeDecel = accelTime;
          timeCruise = cruiseTime;
        }
        const timeSteps = 30 * path.points.length; //matches optimizer
        for (let j = 0; j <= timeSteps; j++) {
          var timeTraveled = (j / timeSteps) * pathTime;
          var distanceForThisPoint = 0;
          if (timeTraveled <= timeAccel) {
            distanceForThisPoint = .5 * acceleration * timeTraveled * timeTraveled;
          } else if (timeTraveled < timeAccel + timeCruise) {
            const dAccelMax = 0.5 * acceleration * timeAccel * timeAccel;
            distanceForThisPoint = dAccelMax + (robot.speed * (timeTraveled - timeAccel));
          } else {
            const timeRemaining = pathTime - timeTraveled;
            distanceForThisPoint = pathDistance - (0.5 * acceleration * timeRemaining * timeRemaining);
          }

          const ratio = distanceForThisPoint / pathDistance;
          let segmentIndex = 0;
          while (segmentIndex < segmentDistances.length - 1 && segmentDistances[segmentIndex] < distanceForThisPoint) {
            segmentIndex++;
          }
          let segmentRatio = 0;
          const startDist = segmentIndex === 0 ? 0 : segmentDistances[segmentIndex - 1];
          const endDist = segmentDistances[segmentIndex];
          const segmentLength = endDist - startDist;
          if (segmentLength > 0) {
            segmentRatio = (distanceForThisPoint - startDist) / segmentLength;
          }
          const p1 = points[segmentIndex];
          const p2 = points[segmentIndex + 1] || p1;

          timeline.push({
            globalTime: cumulativeTime + timeTraveled,
            x: p1.x + segmentRatio * (p2.x - p1.x),
            y: p1.y + segmentRatio * (p2.y - p1.y),
            h: p1.h + segmentRatio * (shortestAngle(p1.h, p2.h)),
            v: robot.speed
          });
        }
        cumulativeTime += pathTime;
      } else {
        // has been optimized, so use timestamps
        let pathTime = 0;
        const points = path.pathpoints || [];

        if (points.length === 0) {
          return;
        }
        // timeline.push({
        //   globalTime: cumulativeTime,
        //   x: points[0].x,
        //   y: points[0].y,
        //   h: points[0].h || points[0].theta || 0,
        //   v: points[0].v || robot.speed
        // });
        for (let i = 0; i < points.length; i++) {
          // const dx = points[i].x - points[i - 1].x;
          // const dy = points[i].y - points[i - 1].y;
          // const segmentLength = Math.sqrt(dx * dx + dy * dy);
          // const velocity = Math.max(points[i].v * 1000 /*convert to mm/s from m/s*/ || 0, 10.0); // min speed to prevent infinite time on beginnings of paths
          // pathTime += segmentLength / velocity;


          timeline.push({ globalTime: cumulativeTime + points[i].t, x: points[i].x, y: points[i].y, h: points[i].h || 0, v: Math.sqrt(points[i].v_bx ** 2 + points[i].v_by ** 2) });
        }
        pathTime = points[points.length - 1].t
        cumulativeTime += pathTime;
      }
      endTimestampsAndColors.push({
        time: cumulativeTime,
        color: path.color
      });
    });

    return {
      timeline: timeline,
      totalTime: cumulativeTime,
      pathEndMarkers: endTimestampsAndColors
    };
  }, []);

  const shortestAngle = (from, to) => {
    const difference = to - from;
    return ((difference + 180) % 360) - 180;
  };

  const getStateAtTime = useCallback((timeline, time) => {
    if (timeline.length === 0) return null;
    if (time <= 0) return timeline[0];
    if (time >= timeline[timeline.length - 1].globalTime) return timeline[timeline.length - 1];
    // binary search
    let left = 0;
    while (left < timeline.length - 1 && timeline[left + 1].globalTime < time) {
      left++;
    }

    const prev = timeline[left];
    const next = timeline[left + 1];
    if (!prev || !next) return prev || next || null;

    const segmentTime = next.globalTime - prev.globalTime;
    const ratio = segmentTime > 0 ? (time - prev.globalTime) / segmentTime : 0;
    const timeIntoSegment = time - prev.globalTime;
    const x = prev.x + ratio * (next.x - prev.x);
    const y = prev.y + ratio * (next.y - prev.y);
    const h = prev.h + ratio * shortestAngle(prev.h, next.h);
    const v = prev.v + ratio * (next.v - prev.v);
    return { x, y, h, v };
  }, []);

  //main loop
  useEffect(() => {
    if (!animationState.isPlaying) {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      return;
    }

    // const { timeline, totalTime } = calculatePathDurations(paths);
    setAllPathsTime(totalTime);
    let lastTickTime = performance.now();

    const loop = (timestamp) => {
      const now = performance.now();
      const deltaTime = (now - lastTickTime) / 1000; // Time elapsed in seconds
      lastTickTime = now;
      setAnimationState((prev) => {
        let nextProgress = prev.totalProgress + (deltaTime / totalTime);

        if (nextProgress >= 1) {
          cancelAnimationFrame(animationRef.current);

          const lastFrame = timeline[timeline.length - 1];
          if (lastFrame) {
            setRobot(r => ({ ...r, x: lastFrame.x, y: lastFrame.y, heading: lastFrame.h }));
          }

          return { ...prev, isPlaying: false, totalProgress: 1 };
        }

        const currentTimeInstance = nextProgress * totalTime;
        const sampledFrame = getStateAtTime(timeline, currentTimeInstance);

        if (sampledFrame) {
          setRobot((prevRobot) => ({
            ...prevRobot,
            x: sampledFrame.x,
            y: sampledFrame.y,
            heading: sampledFrame.h,
            currentVelocity: sampledFrame.v
          }));
        }

        return { ...prev, totalProgress: nextProgress };
      });

      animationRef.current = requestAnimationFrame(loop);
    };

    animationRef.current = requestAnimationFrame(loop);

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [animationState.isPlaying, paths, calculatePathDurations, getStateAtTime, setAnimationState, setRobot]);

  const togglePlayPause = () => {
    console.log(paths);
    setAnimationState((prev) => {
      const isNowPlaying = !prev.isPlaying;
      if (isNowPlaying) {
        prevTimeRef.current = null;
      }
      return {
        ...prev,
        isPlaying: isNowPlaying,
        totalProgress: prev.totalProgress >= 1 ? 0 : prev.totalProgress
      };
    });
  };

  const { timeline, totalTime, pathEndMarkers } = useMemo(() => {
    return calculatePathDurations(paths) || { timeline: 0, totalTime: 0, pathEndMarkers: {} };
  }, [paths, calculatePathDurations]);


  return (
    <div className="animation-controls">
      <button onClick={togglePlayPause} style={{width: '80px'}}>
        {animationState.isPlaying ? 'Pause' : 'Play'}
      </button>
      <div style={{ flexGrow: 1, position: 'relative', display: 'flex', alignItems: 'center', margin: '0 10px' }}>      <input
        type="range"
        min="0"
        max="1"
        step="0.0001"
        style={{ flexGrow: 1, curosor: 'pointer' }}
        value={animationState.totalProgress}
        onChange={(e) => {
          const val = parseFloat(e.target.value);
          // const { timeline, totalTime } = calculatePathDurations(paths);
          setAllPathsTime(prev => totalTime);
          const sampledFrame = getStateAtTime(timeline, val * totalTime);

          setAnimationState(prev => ({
            ...prev,
            totalProgress: val,
            isPlaying: false
          }));

          if (sampledFrame) {
            setRobot(prevRobot => ({
              ...prevRobot,
              x: sampledFrame.x,
              y: sampledFrame.y,
              heading: sampledFrame.h
            }));
          }
        }} />
        {totalTime > 0 && pathEndMarkers != null && pathEndMarkers.map((marker, idx) => {
          const percentage = (marker.time / totalTime) * 100;

          return (
            <div
              key={idx}
              title={`Path "${paths[idx]?.name || idx}" finishes`}
              style={{
                position: 'absolute',
                left: `${percentage}%`,
                top: '50%',
                width: '12px',
                height: '12px',
                borderRadius: '50%',
                backgroundColor: marker.color,
                transform: 'translate(-50%, -50%)',
                pointerEvents: 'none',
                boxShadow: `0px 0px 10px ${marker.color}`,
                zIndex: 2
              }}
            />
          );
        })}
      </div>
      <span>
        {/* {Math.round(animationState.totalProgress * 100)}% */}
        {(animationState.totalProgress * allPathsTime).toFixed(1)}/{(allPathsTime).toFixed(1)}s
      </span>

    </div>
  );
}

export default AnimationControls;