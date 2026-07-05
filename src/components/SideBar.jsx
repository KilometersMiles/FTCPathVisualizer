import { useRef } from 'react';
import AttributesInputField from './AttributesInputField';
import PathManager from './PathManager';
import ObstacleManager from './ObstacleManager';
import ModuleManager from './ModuleManager';
import AnimationControls from './AnimationControls';
import { saveFTCAutoFile, loadFTCAutoFile, exportPathData } from '../utils/fileHelpers';

function SideBar({ attributes, robot, setRobot, paths, setPaths, animationState, setAnimationState, obstacles, setObstacles, obstaclesExpanded, setObstaclesExpanded, modules, setModules, modulesExpanded, setModulesExpanded, addedModules, setAddedModules, abortControllers, pathsTotal, setPathsTotal, addNotification, boundaryRect, keepInRect }) {
  const fileInputRef = useRef();

  return (
    <div className="Side-bar">
      <PathManager attributes={attributes} paths={paths} setPaths={setPaths} setRobot={setRobot} setAnimationState={setAnimationState} obstacles={obstacles} robot={robot} abortControllers={abortControllers} pathsTotal={pathsTotal} setPathsTotal={setPathsTotal} modules={modules} setModules={setModules} addNotification={addNotification} boundaryRect={boundaryRect} keepInRect={keepInRect}/>
      <ObstacleManager obstacles={obstacles} setObstacles={setObstacles} obstaclesExpanded={obstaclesExpanded} setObstaclesExpanded={setObstaclesExpanded} />
      <ModuleManager modules={modules} setModules={setModules} modulesExpanded={modulesExpanded} setModulesExpanded={setModulesExpanded} addedModules={addedModules} setAddedModules={setAddedModules} paths={paths} setPaths={setPaths} pathsTotal={pathsTotal} setPathsTotal={setPathsTotal} obstacles={obstacles} robot={robot} addNotification={addNotification}/>
    </div>
  );
}

export default SideBar;