import { getPredictableColor } from "./colors";
import { goToClosestShootingPosition, goToClosestParkingPosition } from "./geometry";

export const ROBOT_ATTRIBUTES = [
  { name: "Width (in)", defaultValue: 15 },
  { name: "Length (in)", defaultValue: 15 },
  { name: "Mass (kg)", defaultValue: 15 },
  { name: "Moment of Inertia (kgm2)", defaultValue: .9 },
  { name: "Wheel radius (m)", defaultValue: .052 },
  { name: "Max Angular Velocity (rad/s)", defaultValue: 6 },
  { name: "Max Forward Speed (mm/s)", defaultValue: 1900 }, // This is in mm/s
  { name: "Max Strafing Speed (mm/s)", defaultValue: 1680 }, // This is in mm/s
  { name: "Coefficient of Friction", defaultValue: .5 },
  { name: "Buffer (in)", defaultValue: 2 } // This is for the path generation.
];

export const INITIAL_ROBOT = {
  x: 0,
  y: 0,
  width: ROBOT_ATTRIBUTES[0].defaultValue * 25.4,
  length: ROBOT_ATTRIBUTES[1].defaultValue * 25.4,
  heading: 0,
  maxforwardspeed: ROBOT_ATTRIBUTES[6].defaultValue,
  maxstrafingspeed: ROBOT_ATTRIBUTES[7].defaultValue,
  get speed() {
    return 1 / ((Math.cos(this.heading * (Math.PI / 180))/this.maxforwardspeed)+(Math.sin(this.heading * (Math.PI / 180))/this.maxstrafingspeed))
  },
  buffer: ROBOT_ATTRIBUTES[9].defaultValue * 25.4
};

export const INITIAL_MODULES = [
  {
    name: "Pick Up Stack 1",
    path: {
      name: "Stack 1 Approach",
      startHeading: 180,
      endHeading: 180,
      headingControlType: "constant",
      points: [
        { x: -300, y: -600 },
        { x: -300, y: -750 },
        { x: -300, y: -1200 }
      ]
    }
  },
  {
    name: "Pick Up Stack 2",
    path: {
      name: "Stack 2 Approach",
      startHeading: 180,
      endHeading: 180,
      headingControlType: "constant",
      points: [
        { x: 300, y: -600 },
        { x: 300, y: -750 },
        { x: 300, y: -1200 }
      ]
    }
  },
  {
    name: "Pick Up Stack 3",
    path: {
      name: "Stack 3 Approach",
      startHeading: 180,
      endHeading: 180,
      headingControlType: "constant",
      points: [
        { x: 900, y: -600 },
        { x: 900, y: -750 },
        { x: 900, y: -1200 }
      ]
    }
  },
  //these ones rely on function excecution and cannot be saved or run as is. do later
  // {
  //   name: "Shoot 3 Balls",
  //   path: {
  //     name: "Stack 3 Approach",
  //     startHeading: 0,
  //     endHeading: 90,
  //     headingControlType: "tangential",
  //     getPathPoints: ({ paths }) => goToClosestShootingPosition(paths, robot, obstacles)
  //   }
  // },
  // {
  //   name: "Open Gate",
  //   path: {
  //     name: "Gate Approach",
  //     startHeading: 0,
  //     endHeading: 90,
  //     headingControlType: "linear",
  //     getPathPoints: () => [
  //       { x: 50, y: -1200 },
  //       { x: 50, y: -1400 }
  //     ]
  //   }
  // },
  // {
  //   name: "Park",
  //   path: {
  //     name: "Park Approach",
  //     startHeading: 0,
  //     endHeading: 90,
  //     headingControlType: "linear",
  //     getPathPoints: ({ paths }) => goToClosestParkingPosition(paths, robot, obstacles)
  //   }
  // }
];

export const INITIAL_OBSTACLES = [
  {
    name: "Red Goal",
    points: [
      { x: -1125, y: 1625 }, // first point
      { x: -1770, y: 1125 }, // second point
      { x: -1770, y: 1770 },  // etc
      { x: 100, y: 1770 },
      { x: 100, y: 1625 }
    ]
  },
  {
    name: "Blue Goal",
    points: [
      { x: -1125, y: -1625 },
      { x: -1770, y: -1125 },
      { x: -1770, y: -1770 },
      { x: 100, y: -1770 },
      { x: 100, y: -1625 }
    ]
  }
];

export const INITIAL_PATHS = [
  {
    name: "Start",
    color: getPredictableColor(0),
    points: [ //these are the user defined waypoints
      {
        x: 0, //mm
        y: 0, //mm
        h: 0, //degrees
        constrainHeading: true,
        stop: true,
      }, {
        x: 600, //mm
        y: 0, //mm
        h: 0, //degrees
        constrainHeading: true,
        stop: true,
      }
    ],
    pathpoints: [ //these are the points that get drawn
      { x: 0, y: 0, h: 0, v: 0 },  // in mm
      { x: 600, y: 0, h: 0, v: 0 },  // in mm
    ]
  }
];

export const INITIAL_BOUNDARY = {
  isVisible: false,
  maxX: 1775,
  maxY: 1775,
  minX: -1775,
  minY: -1775
}

export const DEFAULT_NOTIFICATION = [
        {
            time: Date.now(),
            type: "success" | "error" | "warning" | "loading",
            title: "Optimization failed" | "Optimization succeded",
            message: "Could not converge, check constraints",
            duration: 5000 //ms
        }
    ]
