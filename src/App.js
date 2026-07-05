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