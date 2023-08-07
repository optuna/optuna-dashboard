import * as THREE from "three"
import React, { useState } from "react"
import { Canvas } from "@react-three/fiber"
import { GizmoHelper, GizmoViewport, OrbitControls } from "@react-three/drei"
import { STLLoader } from "three/examples/jsm/loaders/STLLoader"
import { PerspectiveCamera } from "three"

interface ModelViewerProps {
  src: string
  alt: string
  width: string
  height: string
  hasGizmo: boolean
}

function CustomGizmoHelper(): JSX.Element {
  return (
    <GizmoHelper alignment="bottom-right" margin={[80, 80]}>
      <GizmoViewport
        axisColors={["red", "green", "skyblue"]}
        labelColor="black"
      />
    </GizmoHelper>
  )
}

export function ModelViewer(props: ModelViewerProps): JSX.Element {
  const [geometry, setGeometry] = useState<THREE.BufferGeometry>()
  const [modelSize, setModelSize] = useState<THREE.Vector3>()

  React.useEffect(() => {
    const loader = new STLLoader()
    loader.load(props.src, (geometry: THREE.BufferGeometry) => {
      if (geometry) {
        setGeometry(geometry)
        geometry.computeBoundingBox()
        if (geometry.boundingBox === null) {
          setModelSize(new THREE.Vector3(10, 10, 10))
        } else {
          const size = geometry.boundingBox.getSize(new THREE.Vector3())
          setModelSize(size)
        }
      }
    })
  }, [])
  const cameraPosition = modelSize
    ? [modelSize.x * 1.5, modelSize.y * 1.5, modelSize.z * 1.5]
    : [10, 10, 10]
  const cameraSettings: PerspectiveCamera = {
    fov: modelSize
      ? Math.min(45, Math.atan(modelSize.y / modelSize.z) * (180 / Math.PI) * 2)
      : 45,
    aspect: window.innerWidth / window.innerHeight,
    near: 0.1,
    far: 1000,
    position: cameraPosition,
  }

  const viewerWidth = `${parseInt(props.width) * 2}px`

  return (
    <Canvas
      camera={cameraSettings}
      style={{ width: viewerWidth, height: props.height }}
    >
      <ambientLight />
      <OrbitControls />
      <gridHelper
        args={modelSize && [Math.max(modelSize?.x, modelSize?.y) * 5]}
      />
      {props.hasGizmo && <CustomGizmoHelper />}
      <axesHelper />
      <pointLight position={[10, 10, 10]} />
      {geometry && (
        <mesh geometry={geometry}>
          <meshNormalMaterial />
        </mesh>
      )}
    </Canvas>
  )
}
