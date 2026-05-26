import React, { useRef, useEffect } from "react";
import { useGLTF } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
// import { SkeletonHelper } from "three";

export function HandModel({
  isClosed,
  finger,
  flexion,
  reps,
  replayData,
  replayKey,
  simulateKey
}) {
  // —— Repetition-based simulate state (unchanged) ——
  const repsRef = useRef(Number(reps) || 0);
  const cycleCount = useRef(0);
  const cyclePhase = useRef('idle');

  // whenever simulateKey increments, restart simulate
  useEffect(() => {
    if (simulateKey > 0) {
      repsRef.current     = Number(reps) || 0;
      cycleCount.current  = 0;
      cyclePhase.current  = 'closing';
      targetRotation.current = 1;  // kick off closing
    }
  }, [simulateKey, reps]);

  // —— Three.js & animation state ——
  const group = useRef();
  const { scene } = useGLTF("/rigged_hand/scene.gltf");
  const { scene: threeScene } = useThree();
  const targetRotation = useRef(0);
  const currentRotation = useRef(0);

  // —— Replay-based timeline state ——
  const timestamps = useRef([]);
  const fingerTimelines = useRef({});
  const playbackStart = useRef(0);

  // —— When `isClosed` changes, update simulate target ——
  useEffect(() => {
    targetRotation.current = isClosed ? 1 : 0;
  }, [isClosed]);

  /* —— Skeleton helper visualization ——
  useEffect(() => {
    if (group.current) {
      const helper = new SkeletonHelper(group.current);
      helper.visible = true;
      threeScene.add(helper);
    }
  }, [threeScene]);*/

  // —— Keep repsRef up-to-date ——
  useEffect(() => {
    repsRef.current = Number(reps) || 0;
  }, [reps]);

  // —— Initialize replay timeline when `replayData` or `replayKey` changes ——
  useEffect(() => {
    if (!replayData || !replayKey) return;
    timestamps.current = replayData.timestamp_s || [];
    fingerTimelines.current = {
      thumb:  replayData.thumb  || [],
      index:  replayData.index  || [],
      middle: replayData.middle || [],
      ring:   replayData.ring   || [],
      pinky:  replayData.pinky  || []
    };
    playbackStart.current = performance.now();
    cyclePhase.current = 'done';
    cycleCount.current = 0;
  }, [replayData, replayKey]);

  // —— Finger definitions ——
  const fingerBones = {
    thumb: ["thumb_baseR_03","thumb_01R_08","thumb_02R_09","thumb_03R_010"],
    index: ["index_baseR_012","index_01R_017","index_02R_018","index_03R_019"],
    middle:["middle_baseR_020","middle_01R_025","middle_02R_026","middle_03R_027"],
    ring:  ["ring_baseR_028","ring_01R_033","ring_02R_034","ring_03R_035"],
    pinky: ["pinky_baseR_036","pinky_01R_041","pinky_02R_042","pinky_03R_043"]
  };

  const boneRotationTargets = {
    thumb_baseR_03: { startX:1.3, startY:-0.3, startZ:0.6, endX:0.760, endY:0.222, endZ:0.653 },
    thumb_01R_08:  { startX:-0.2, startY:0.5, startZ:-0.1, endX:0.274,endY:-1.147,endZ:0.707 },
    thumb_02R_09:  { startX:-0.4, startY:-0.3, startZ:0.4, endX:0.257,endY:-0.099,endZ:1.151 },
    thumb_03R_010: { startX:-0.3, startY:-0.4,  startZ:0.1, endX:0.033,endY:0.124,endZ:1.039 },
    index_baseR_012:{startX:0.65,startY:0.073,startZ:0.157,endX:0.604,endY:0.073,endZ:0.157},
    index_01R_017:{startX:-0.65,startY:0,startZ:0,   endX:-0.621,endY:0.104,endZ:0.766},
    index_02R_018:{startX:0,startY:0,startZ:0.1,endX:0.016,endY:-0.296,endZ:1.664},
    index_03R_019:{startX:0,startY:0,startZ:0.2,endX:0.019,endY:-0.078,endZ:1.443},
    middle_baseR_020:{startX:0.2,startY:-0.116,startZ:0,endX:0.135,endY:-0.116,endZ:0.093},
    middle_01R_025:{startX:-0.2,startY:0,startZ:0,endX:-0.128,endY:0.039,endZ:0.917},
    middle_02R_026:{startX:0,startY:0,startZ:0.2,endX:0.103,endY:0.027,endZ:1.725},
    middle_03R_027:{startX:0,startY:0,startZ:0.3,endX:0.041,endY:0.060,endZ:1.359},
    ring_baseR_028:  {startX:-0.4,startY:-0.036,startZ:0,endX:-0.455,endY:-0.036,endZ:0.162},
    ring_01R_033:  {startX:0.4,startY:0,startZ:0,endX:0.397,endY:-0.130,endZ:0.851},
    ring_02R_034:  {startX:0,startY:0,startZ:0.2,endX:0.051,endY:0.040,endZ:1.437},
    ring_03R_035:  {startX:0,startY:0,startZ:0.3,endX:0.033,endY:0.095,endZ:1.319},
    pinky_baseR_036:{startX:-1,startY:-0.102,startZ:0,endX:-0.968,endY:-0.102,endZ:0.246},
    pinky_01R_041:{startX:1,startY:0,startZ:0,endX:0.813,endY:-0.153,endZ:0.657},
    pinky_02R_042:{startX:0,startY:0,startZ:0.2,endX:0.292,endY:-0.067,endZ:0.911},
    pinky_03R_043:{startX:0,startY:0,startZ:0.3,endX:0.031,endY:0.176,endZ:0.980}
  };

  const fingerDelay = { thumb:0.0, index:0.0, middle:0.1, ring:0.2, pinky:0.3 };

  const easeInOutCubic = t =>
    t < 0.5 ? 4*t*t*t : 1 - Math.pow(-2*t+2,3)/2;

  useFrame(() => {
    if (!group.current) return;
    const rootJoint = group.current.getObjectByName("_rootJoint");
    if (!rootJoint) return;

    // —— 1. Replay logic ——
    if (timestamps.current.length) {
      const elapsed = (performance.now() - playbackStart.current) / 1000;
      let idx = timestamps.current.findIndex(t => t > elapsed) - 1;
      if (idx < 0) idx = 0;

      Object.entries(fingerBones).forEach(([fingerName,boneNames]) => {
        const angle = (fingerTimelines.current[fingerName] || [])[idx] || 0;
        const clenchScale = angle / 100;

        boneNames.forEach(name => {
          const bone = rootJoint.getObjectByName(name);
          const target = boneRotationTargets[name] || { startX:0,startY:0,startZ:0,endX:0,endY:0,endZ:0 };
          if (bone) {
            bone.rotation.x = target.startX + (target.endX - target.startX) * clenchScale;
            bone.rotation.y = target.startY + (target.endY - target.startY) * clenchScale;
            bone.rotation.z = target.startZ + (target.endZ - target.startZ) * clenchScale;
          }
        });
      });

      if (elapsed > timestamps.current[timestamps.current.length - 1]) {
        timestamps.current = [];
      }
      return; // skip simulate when replaying
    }

    // —— 2. Simulate logic (unchanged) ——
    //  a) ease currentRotation toward targetRotation
    const speed = 0.1;
    currentRotation.current += (targetRotation.current - currentRotation.current) * speed;

    //  b) rep-cycle state machine
    const ε = 0.01;
    if (cyclePhase.current === 'closing' && currentRotation.current > 1 - ε) {
      targetRotation.current = 0;
      cyclePhase.current = 'opening';
    } else if (cyclePhase.current === 'opening' && currentRotation.current < ε) {
      cycleCount.current += 1;
      if (cycleCount.current < repsRef.current) {
        targetRotation.current = 1;
        cyclePhase.current = 'closing';
      } else {
        cyclePhase.current = 'done';
      }
    }

    //  c) per-bone rotation
    Object.entries(fingerBones).forEach(([fingerName, boneNames]) => {
      const delay = fingerDelay[fingerName];
      const clenchPercent = finger === fingerName ? Number(flexion) || 0 : 0;
      const clenchScale = clenchPercent / 100;
      const delayedProg = Math.min(Math.max((currentRotation.current - delay) / (1 - delay), 0), 1);
      const easedProg = easeInOutCubic(delayedProg) * clenchScale;

      boneNames.forEach(name => {
        const bone = rootJoint.getObjectByName(name);
        const target = boneRotationTargets[name] || { startX:0,startY:0,startZ:0,endX:0,endY:0,endZ:0 };
        if (bone) {
          bone.rotation.x = target.startX + (target.endX - target.startX) * easedProg;
          bone.rotation.y = target.startY + (target.endY - target.startY) * easedProg;
          bone.rotation.z = target.startZ + (target.endZ - target.startZ) * easedProg;
        }
      });
    });
  });

  return <primitive ref={group} object={scene} scale={1.5} />;
}
