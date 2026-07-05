import { useState, useRef, useEffect } from 'react';
import { Save, FolderOpen, Download, Settings, HelpCircle } from 'lucide-react';
import { saveFTCAutoFile, loadFTCAutoFile, exportPathData } from '../utils/fileHelpers';
import AttributesInputField from './AttributesInputField';
import Logo from "../assets/favicon-228.png";
import MainHelp from "./MainHelp.jsx";
import { INITIAL_BOUNDARY } from '../utils/initialData.js';

function TopBar({ attributes, setAttributes, robot, setRobot, paths, setPaths, obstacles, setObstacles, fileInputRef, showSpeedGradient, setShowSpeedGradient, keepInRect, setKeepInRect, boundaryRect, setBoundaryRect }) {
    const [isConfigOpen, setIsConfigOpen] = useState(false);
    const [isHelpOpen, setIsHelpOpen] = useState(false);
    const configRef = useRef(null);
    const helpRef = useRef(null);

    useEffect(() => {
        function handleClickOutside(event) {
            if (configRef.current && !configRef.current.contains(event.target) && !boundaryRect.isVisible) {
                console.log(!boundaryRect.isVisible);
                setIsConfigOpen(false);
            }
            if (helpRef.current && !helpRef.current.contains(event.target)) {
                setIsHelpOpen(false);
            }
        }
        if (isConfigOpen || isHelpOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isConfigOpen, isHelpOpen, boundaryRect]);

    useEffect(() => {
        setBoundaryRect(prev => ({
            ...prev,
            isVisible: isConfigOpen && keepInRect
        }));
    }, [isConfigOpen, keepInRect, setBoundaryRect]);

    return (
        <div className='Top-bar'>
            <div className="LogoContainer">
                <img className="Logo" src={Logo} alt="FTC Lightspeed" />
                <h3>FTC LIGHTSPEED</h3>
            </div>

            <div className='Top-bar-buttons'>
                <input
                    type="file"
                    accept=".lightspeed,application/json"
                    ref={fileInputRef}
                    style={{ display: "none" }}
                    onChange={(e) => {
                        const file = e.target.files[0];
                        if (file) {
                            loadFTCAutoFile(file, { setRobot, setPaths, setObstacles });
                            e.target.value = ""; // Reset input so re-selecting same file works
                        }
                    }}
                />
                <button onClick={() => fileInputRef.current?.click()} title="Load Lightspeed file">
                    <FolderOpen size={16} />
                </button>

                <button onClick={() => saveFTCAutoFile({ robot, paths, obstacles })} title="Save Lightspeed file">
                    <Save size={16} />
                </button>

                <button onClick={() => exportPathData(paths)} title="Export Paths for Pathing">
                    <Download size={16} />
                </button>

                <div className='Divider' />

                <div className="Config-container" ref={configRef}>
                    <button
                        className={isConfigOpen ? 'active' : ''}
                        onClick={() => {
                            setIsConfigOpen(!isConfigOpen);
                        }}
                        title="Robot Configuration"
                    >
                        <Settings size={16} />
                    </button>

                    {isConfigOpen && (
                        <div className="Config-dropdown">
                            <AttributesInputField attributes={attributes} setAttributes={setAttributes} robot={robot} setRobot={setRobot} />
                            <div className='DropdownDivider' />
                            <span className="Setting-label">Show Path Velocity</span>
                            <label className="cyber-switch">
                                <input
                                    type="checkbox"
                                    checked={showSpeedGradient}
                                    onChange={(e) => setShowSpeedGradient(e.target.checked)}
                                />
                                <span className="cyber-slider" />
                            </label>
                            <div className='DropdownDivider' />
                            <span className="Setting-label">Keep In Rect</span>
                            <label className="cyber-switch">
                                <input
                                    type="checkbox"
                                    checked={keepInRect}
                                    onChange={(e) => {
                                        setKeepInRect(e.target.checked);
                                    }}
                                />
                                <span className="cyber-slider" />
                            </label>
                            {keepInRect && (
                                <div className="BoundaryRectContainer" style={{ marginTop: '8px' }}>
                                    <div className='boundary-input-item'>
                                        <label>Max X Coordinate</label>
                                        <input
                                            type="number"
                                            placeholder="Max X"
                                            value={boundaryRect.maxX || INITIAL_BOUNDARY.maxX}
                                            onChange={(e) => {
                                                const newX = parseFloat(e.target.value);
                                                if (!isNaN(newX)) {
                                                    setBoundaryRect(prev => ({
                                                        ...prev,
                                                        maxX: newX
                                                    }));
                                                }
                                            }}
                                        />
                                    </div>
                                    <div className='boundary-input-item'>
                                        <label>Max Y Coordinate</label>
                                        <input
                                            type="number"
                                            placeholder="Max Y"
                                            value={boundaryRect.maxY || INITIAL_BOUNDARY.maxY}
                                            onChange={(e) => {
                                                const newY = parseFloat(e.target.value);
                                                if (!isNaN(newY)) {
                                                    setBoundaryRect(prev => ({
                                                        ...prev,
                                                        maxY: newY
                                                    }));
                                                }
                                            }}
                                        />
                                    </div>
                                    <div className='boundary-input-item'>
                                        <label>Min X Coordinate</label>
                                        <input
                                            type="number"
                                            placeholder="Min X"
                                            value={boundaryRect.minX || INITIAL_BOUNDARY.minX}
                                            onChange={(e) => {
                                                const newX = parseFloat(e.target.value);
                                                if (!isNaN(newX)) {
                                                    setBoundaryRect(prev => ({
                                                        ...prev,
                                                        minX: newX
                                                    }));
                                                }
                                            }}
                                        />
                                    </div>
                                    <div className='boundary-input-item'>
                                        <label>Min Y Coordinate</label>
                                        <input
                                            type="number"
                                            placeholder="Min Y"
                                            value={boundaryRect.minY || INITIAL_BOUNDARY.minY}
                                            onChange={(e) => {
                                                const newY = parseFloat(e.target.value);
                                                if (!isNaN(newY)) {
                                                    setBoundaryRect(prev => ({
                                                        ...prev,
                                                        minY: newY
                                                    }));
                                                }
                                            }}
                                        />
                                    </div>

                                </div>
                            )}

                        </div>
                    )}
                </div>
                <div className='Divider' />
                <div className='Help-container' ref={helpRef}>
                    <button
                        onClick={() => setIsHelpOpen(!isHelpOpen)}
                        title="Open Documentation"
                        className={isHelpOpen ? 'active' : ''}
                    >
                        <HelpCircle size={16} />
                    </button>
                    {isHelpOpen && (
                        <div className="Help-dropdown">
                            <MainHelp />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default TopBar;