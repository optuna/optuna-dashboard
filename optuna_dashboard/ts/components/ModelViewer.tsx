import * as THREE from "three"
import React, { useState } from "react"
import { Canvas } from "@react-three/fiber"
import { GizmoHelper, GizmoViewport, OrbitControls } from "@react-three/drei"
import { STLLoader } from "three/examples/jsm/loaders/STLLoader"
import { Rhino3dmLoader } from "three/examples/jsm/loaders/3DMLoader"
import { PerspectiveCamera } from "three"

interface ModelViewerProps {
  src: string
  width: string
  height: string
  hasGizmo: boolean
  filetype: string | undefined
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
  const [geometry, setGeometry] = useState<THREE.BufferGeometry[]>([])
  const [modelSize, setModelSize] = useState<THREE.Vector3>()

  React.useEffect(() => {
    if ("stl" === props.filetype) {
      const stlLoader = new STLLoader()
      stlLoader.load(props.src, (stlMesh: THREE.BufferGeometry) => {
        if (stlMesh) {
          setGeometry([stlMesh])
          stlMesh.computeBoundingBox()
          if (stlMesh.boundingBox === null) {
            setModelSize(new THREE.Vector3(10, 10, 10))
          } else {
            const size = stlMesh.boundingBox.getSize(new THREE.Vector3())
            setModelSize(size)
          }
        }
      })
    } else if ("3dm" === props.filetype) {
      const loader = new Rhino3dmLoader()
      loader.setLibraryPath("https://cdn.jsdelivr.net/npm/rhino3dm@7.15.0/")
      loader.load(props.src, (object: THREE.Object3D) => {
        object.traverse(function (child) {
          // rotate to y-up
          child.rotateX(-Math.PI / 4)
        })
        const meshes = object.children as THREE.Mesh[]
        const rhinoMeshes = meshes.map((mesh) => mesh.geometry)
        if (rhinoMeshes.length > 0) {
          setGeometry(rhinoMeshes)
          rhinoMeshes[0].computeBoundingBox()
          if (rhinoMeshes[0].boundingBox === null) {
            setModelSize(new THREE.Vector3(10, 10, 10))
          } else {
            const size = rhinoMeshes[0].boundingBox.getSize(new THREE.Vector3())
            setModelSize(size)
          }
        }
      })
    }
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
    position: new THREE.Vector3(...cameraPosition),
    far: 1000,
  }

  return (
    <Canvas
      camera={cameraSettings}
      style={{ width: props.width, height: props.height }}
    >
      <ambientLight />
      <OrbitControls />
      <gridHelper
        args={modelSize && [Math.max(modelSize?.x, modelSize?.y) * 5]}
      />
      {props.hasGizmo && <CustomGizmoHelper />}
      <axesHelper />
      {geometry.length > 0 &&
        geometry.map((geo, index) => (
          <mesh key={index} geometry={geo}>
            <meshNormalMaterial />
          </mesh>
        ))}
    </Canvas>
  )
}
