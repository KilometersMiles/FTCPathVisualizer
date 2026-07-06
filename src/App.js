import { useState, useRef, useEffect } from 'react';
import FieldMap from './components/FieldMap';
import SideBar from './components/SideBar';
import AnimationControls from './components/AnimationControls';
import NotificationManager from './components/NotificationManager';
import { INITIAL_PATHS, INITIAL_OBSTACLES, INITIAL_MODULES, ROBOT_ATTRIBUTES, INITIAL_ROBOT, INITIAL_BOUNDARY } from './utils/initialData';
import './App.css';
import TopBar from './components/TopBar';

function App() {
    const [paths, setPaths] = useState(INITIAL_PATHS);
    const [pathsTotal, setPathsTotal] = useState(1);
    const [pathLoadingStates, setPathLoadingStates] = useState({});
    const [obstacles, setObstacles] = useState(INITIAL_OBSTACLES);
    const [modules, setModules] = useState(INITIAL_MODULES);
    const [addedModules, setAddedModules] = useState([]);
    const [attributes, setAttributes] = useState(ROBOT_ATTRIBUTES)
    const [obstaclesExpanded, setObstaclesExpanded] = useState(false);
    const [modulesExpanded, setModulesExpanded] = useState(false);
    const [notifications, setNotifications] = useState([]);
    const [showSpeedGradient, setShowSpeedGradient] = useState(false);
    const [keepInRect, setKeepInRect] = useState(false);
    const [boundaryRect, setBoundaryRect] = useState(INITIAL_BOUNDARY);

    const addNotification = (type, title, message, duration = 4000) => {
        let t = Math.random().toString(36).substr(2, 9)
        setNotifications(prev => [...prev, {
            time: t,
            type,
            title,
            message,
            duration
        }]);
        // setTimeout(() => {
        //     setNotifications(prevItems => prevItems.filter(item => item.time !== t));
        // }, duration);
    };

    const removeNotification = (time) => {
        setNotifications(prev => prev.filter(item => item.time !== time));
    };

    //TODO: update and handle loading for all paths. if path is already loading, skip it. make sure nothing breaks :)
    const handleGenerateAllPaths = async () => {
        if (paths.length === 0) return;
        addNotification('info', 'Generating All Paths', 'This may take a while...');
        await Promise.all(paths.map(async (path, index) => {
            if (pathLoadingStates[index]) return;

            await generateOnePath(index, path);
        }));
    };

    const generateOnePath = async (index, currentPath) => {
        const targetPath = currentPath || paths[index];
        if (!targetPath) return;

        setPathLoadingStates(prev => ({ ...prev, [index]: true }));
        const controller = new AbortController();
        abortControllers.current[index] = controller;

        try {
            const pathName = targetPath.name;
            addNotification('info', 'Optimizing path...', `Running solver parameters for ${pathName}`, 1000);

            let robotRadius = Math.sqrt(((robot.length) / 2) ** 2 + ((robot.width) / 2) ** 2);
            let maxX = 20000000, minX = -20000000, maxY = 20000000, minY = -20000000;

            if (keepInRect) {
                maxX = boundaryRect.maxX - robotRadius;
                minX = boundaryRect.minX + robotRadius;
                maxY = boundaryRect.maxY - robotRadius;
                minY = boundaryRect.minY + robotRadius;
            }

            const optimizedPoints = await window.electronAPI.runOptimizer({
                waypoints: targetPath.points,
                obstacles: obstacles,
                attributes: attributes,
                boundary: { maxX, minX, maxY, minY }
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
                addNotification("success", "Completed Optimization", targetPath.name + " is now optimized.");
            }

        } catch (error) {
            const pathName = targetPath.name;
            if (error.name === 'Aborted error oof') {
                addNotification('warning', 'Optimization Canceled', `Aborted by user. ${pathName} generation canceled`, 3000);
            } else if (error.message?.toString().includes("1")) {
                addNotification('error', 'Infeasible Spline Constraints', 'Path is impossible to execute. Try changing constraints or boundaries.', 5000);
            } else {
                console.error("Optimization failed:", error);
                addNotification('error', 'Optimization Failed', error.message || 'An unexpected backend issue has occurred.', 5000);
            }
        } finally {
            // Turn off loading for this specific path index
            setPathLoadingStates(prev => {
                const updated = { ...prev };
                delete updated[index];
                return updated;
            });
            delete abortControllers.current[index];
        }
    };
    const [robot, setRobot] = useState(INITIAL_ROBOT);

    const [animationState, setAnimationState] = useState({
        isPlaying: false,
        totalProgress: 0,
        pathProgress: 0,
        currentPathIndex: 0,
        pathStartTimes: [],
    });

    const abortControllers = useRef({});
    const fileInputRef = useRef();

    return (
        <div className="App Workspace-Layout">
            <TopBar
                attributes={attributes}
                setAttributes={setAttributes}
                robot={robot}
                setRobot={setRobot}
                paths={paths}
                setPaths={setPaths}
                obstacles={obstacles}
                setObstacles={setObstacles}
                fileInputRef={fileInputRef}
                showSpeedGradient={showSpeedGradient}
                setShowSpeedGradient={setShowSpeedGradient}
                keepInRect={keepInRect}
                setKeepInRect={setKeepInRect}
                boundaryRect={boundaryRect}
                setBoundaryRect={setBoundaryRect}
                handleGenerateAllPaths={handleGenerateAllPaths}
                generateOnePath={generateOnePath}
                setPathLoadingStates={setPathLoadingStates}
                pathLoadingStates={pathLoadingStates}
            />
            <div className="Main-Content">
                <NotificationManager
                    notifications={notifications}
                    setNotifications={setNotifications}
                    addNotification={addNotification}
                />
                <FieldMap
                    robot={robot}
                    setRobot={setRobot}
                    paths={paths}
                    setPaths={setPaths}
                    obstacles={obstacles}
                    setObstacles={setObstacles}
                    showObstacles={obstaclesExpanded}
                    abortControllers={abortControllers}
                    showSpeedGradient={showSpeedGradient}
                    boundaryRect={boundaryRect}
                    setBoundaryRect={setBoundaryRect}
                />
                <SideBar
                    attributes={attributes}
                    robot={robot}
                    setRobot={setRobot}
                    paths={paths}
                    setPaths={setPaths}
                    animationState={animationState}
                    setAnimationState={setAnimationState}
                    obstacles={obstacles}
                    setObstacles={setObstacles}
                    obstaclesExpanded={obstaclesExpanded}
                    setObstaclesExpanded={setObstaclesExpanded}
                    modules={modules}
                    setModules={setModules}
                    modulesExpanded={modulesExpanded}
                    setModulesExpanded={setModulesExpanded}
                    addedModules={addedModules}
                    setAddedModules={setAddedModules}
                    abortControllers={abortControllers}
                    pathsTotal={pathsTotal}
                    setPathsTotal={setPathsTotal}
                    addNotification={addNotification}
                    boundaryRect={boundaryRect}
                    keepInRect={keepInRect}
                    handleGenerateAllPaths={handleGenerateAllPaths}
                    generateOnePath={generateOnePath}
                    setPathLoadingStates={setPathLoadingStates}
                    pathLoadingStates={pathLoadingStates}
                />
            </div>
            <div className="Bottom-playback-bar">
                <AnimationControls
                    attributes={attributes}
                    animationState={animationState}
                    setAnimationState={setAnimationState}
                    paths={paths}
                    robot={robot}
                    setRobot={setRobot}
                />
            </div>
        </div>
    );
}

export default App;