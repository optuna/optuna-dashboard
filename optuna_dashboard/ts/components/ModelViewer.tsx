import * as THREE from "three"
import React, { useEffect, useState } from "react"
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

const calculateBoundingBox = (geometries: THREE.BufferGeometry[]) => {
  const boundingBox = new THREE.Box3()
  geometries.forEach((geometry) => {
    const mesh = new THREE.Mesh(geometry)
    boundingBox.expandByObject(mesh)
  })
  return boundingBox
}

export function ModelViewer(props: ModelViewerProps): JSX.Element {
  const [geometry, setGeometry] = useState<THREE.BufferGeometry[]>([])
  const [modelSize, setModelSize] = useState<THREE.Vector3>(
    new THREE.Vector3(10, 10, 10)
  )
  const [cameraSettings, setCameraSettings] = useState<PerspectiveCamera>(
    new THREE.PerspectiveCamera()
  )

  const handleLoadedGeometries = (geometries: THREE.BufferGeometry[]) => {
    setGeometry(geometries)
    const boundingBox = calculateBoundingBox(geometries)
    if (boundingBox !== null) {
      const size = boundingBox.getSize(new THREE.Vector3())
      setModelSize(size)
    }
  }

  useEffect(() => {
    if ("stl" === props.filetype) {
      const stlLoader = new STLLoader()
      stlLoader.load(props.src, (stlGeometries: THREE.BufferGeometry) => {
        if (stlGeometries) {
          handleLoadedGeometries([stlGeometries])
        }
      })
    } else if ("3dm" === props.filetype) {
      const loader = new Rhino3dmLoader()
      loader.setLibraryPath("https://cdn.jsdelivr.net/npm/rhino3dm@7.15.0/")
      loader.load(props.src, (object: THREE.Object3D) => {
        const meshes = object.children as THREE.Mesh[]
        const rhinoGeometries = meshes.map((mesh) => mesh.geometry)
        if (rhinoGeometries.length > 0) {
          rhinoGeometries.forEach((rhinoGeometry) => {
            rhinoGeometry.rotateX(-Math.PI / 4)
          })
          handleLoadedGeometries(rhinoGeometries)
        }
      })
    }
    const maxModelSize = Math.max(modelSize.x, modelSize.y, modelSize.z)
    const cameraSet = new THREE.PerspectiveCamera(
      modelSize
        ? Math.min(
            45,
            Math.atan(modelSize.y / modelSize.z) * (180 / Math.PI) * 2
          )
        : 45,
      window.innerWidth / window.innerHeight
    )
    cameraSet.position.set(maxModelSize * 2, maxModelSize * 2, maxModelSize * 2)
    setCameraSettings(cameraSet)
  }, [])

  return (
    <Canvas
      camera={cameraSettings}
      style={{ width: props.width, height: props.height }}
    >
      <ambientLight />
      <OrbitControls />
      <gridHelper args={[Math.max(modelSize?.x, modelSize?.y) * 5]} />
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
