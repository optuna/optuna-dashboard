import ClearIcon from "@mui/icons-material/Clear"
import { Box, Modal, useTheme } from "@mui/material"
import IconButton from "@mui/material/IconButton"
import { GizmoHelper, GizmoViewport, OrbitControls } from "@react-three/drei"
import { Canvas } from "@react-three/fiber"
import React, { useEffect, useState, ReactNode } from "react"
import * as THREE from "three"
import { PerspectiveCamera } from "three"
import { Rhino3dmLoader } from "three/examples/jsm/loaders/3DMLoader"
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader"
import { STLLoader } from "three/examples/jsm/loaders/STLLoader"
import { Artifact } from "ts/types/optuna"

export const isThreejsArtifact = (artifact: Artifact): boolean => {
  return (
    artifact.filename.endsWith(".stl") ||
    artifact.filename.endsWith(".3dm") ||
    artifact.filename.endsWith(".obj")
  )
}

interface ThreejsArtifactViewerProps {
  src: string
  width: string
  height: string
  hasGizmo: boolean
  filetype: string | undefined
}

const CustomGizmoHelper: React.FC = () => {
  return (
    <GizmoHelper alignment="bottom-right" margin={[80, 80]}>
      <GizmoViewport
        axisColors={["red", "green", "skyblue"]}
        labelColor="black"
      />
    </GizmoHelper>
  )
}

const computeBoundingBox = (geometries: THREE.BufferGeometry[]) => {
  const boundingBox = new THREE.Box3()
  geometries.forEach((geometry) => {
    const mesh = new THREE.Mesh(geometry)
    boundingBox.expandByObject(mesh)
  })
  return boundingBox
}

export const ThreejsArtifactViewer: React.FC<ThreejsArtifactViewerProps> = (
  props
) => {
  const [geometry, setGeometry] = useState<THREE.BufferGeometry[]>([])
  const [boundingBox, setBoundingBox] = useState<THREE.Box3>(
    new THREE.Box3(
      new THREE.Vector3(-10, -10, -10),
      new THREE.Vector3(10, 10, 10)
    )
  )
  const [cameraSettings, setCameraSettings] = useState<PerspectiveCamera>(
    new THREE.PerspectiveCamera()
  )

  const handleLoadedGeometries = (geometries: THREE.BufferGeometry[]) => {
    setGeometry(geometries)
    const boundingBox = computeBoundingBox(geometries)
    if (boundingBox !== null) {
      setBoundingBox(boundingBox)
    }
    return boundingBox
  }

  useEffect(() => {
    if ("stl" === props.filetype) {
      loadSTL(props, handleLoadedGeometries)
    } else if ("3dm" === props.filetype) {
      loadRhino3dm(props, handleLoadedGeometries)
    } else if ("obj" === props.filetype) {
      loadOBJ(props, handleLoadedGeometries)
    }
  }, [])

  useEffect(() => {
    const cameraSet = new THREE.PerspectiveCamera(
      50,
      window.innerWidth / window.innerHeight,
      0.1,
      boundingBox.getSize(new THREE.Vector3()).length() * 100
    )
    const maxPosition = Math.max(
      boundingBox.max.x,
      boundingBox.max.y,
      boundingBox.max.z
    )
    cameraSet.position.set(
      maxPosition * 1.5,
      maxPosition * 1.5,
      maxPosition * 1.5
    )
    const center = boundingBox.getCenter(new THREE.Vector3())
    cameraSet.lookAt(center.x, center.y, center.z)
    setCameraSettings(cameraSet)
  }, [boundingBox])

  return (
    <Canvas
      frameloop="demand"
      camera={cameraSettings}
      style={{ width: props.width, height: props.height }}
    >
      <ambientLight />
      <OrbitControls />
      <gridHelper args={[Math.max(boundingBox.max.x, boundingBox.max.y) * 5]} />
      {props.hasGizmo && <CustomGizmoHelper />}
      <axesHelper />
      {geometry.length > 0 &&
        geometry.map((geo, index) => (
          <mesh key={index} geometry={geo}>
            <meshNormalMaterial side={THREE.DoubleSide} />
          </mesh>
        ))}
    </Canvas>
  )
}

export const useThreejsArtifactModal = (): [
  (path: string, artifact: Artifact) => void,
  () => ReactNode,
] => {
  const [open, setOpen] = useState(false)
  const [target, setTarget] = useState<[string, Artifact | null]>(["", null])
  const theme = useTheme()

  const openModal = (artifactUrlPath: string, artifact: Artifact) => {
    setTarget([artifactUrlPath, artifact])
    setOpen(true)
  }

  const renderDeleteStudyDialog = () => {
    return (
      <Modal
        open={open}
        onClose={() => {
          setOpen(false)
          setTarget(["", null])
        }}
      >
        <Box
          component="div"
          sx={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            bgcolor: "background.paper",
            borderRadius: "15px",
          }}
        >
          <IconButton
            sx={{
              position: "absolute",
              top: theme.spacing(2),
              right: theme.spacing(2),
            }}
            onClick={() => {
              setOpen(false)
              setTarget(["", null])
            }}
          >
            <ClearIcon />
          </IconButton>
          <ThreejsArtifactViewer
            src={target[0]}
            width={`${innerWidth * 0.8}px`}
            height={`${innerHeight * 0.8}px`}
            hasGizmo={true}
            filetype={target[1]?.filename.split(".").pop()}
          />
        </Box>
      </Modal>
    )
  }
  return [openModal, renderDeleteStudyDialog]
}

function loadSTL(
  props: ThreejsArtifactViewerProps,
  handleLoadedGeometries: (geometries: THREE.BufferGeometry[]) => THREE.Box3
) {
  const stlLoader = new STLLoader()
  stlLoader.load(props.src, (stlGeometries: THREE.BufferGeometry) => {
    if (stlGeometries) {
      handleLoadedGeometries([stlGeometries])
    }
  })
}

function loadRhino3dm(
  props: ThreejsArtifactViewerProps,
  handleLoadedGeometries: (geometries: THREE.BufferGeometry[]) => THREE.Box3
) {
  const rhino3dmLoader = new Rhino3dmLoader()
  rhino3dmLoader.setLibraryPath("https://cdn.jsdelivr.net/npm/rhino3dm@8.4.0/")
  rhino3dmLoader.load(props.src, (object: THREE.Object3D) => {
    const meshes = object.children as THREE.Mesh[]
    const rhinoGeometries = meshes.map((mesh) => mesh.geometry)
    THREE.Object3D.DEFAULT_UP.set(0, 0, 1)
    if (rhinoGeometries.length > 0) {
      handleLoadedGeometries(rhinoGeometries)
    }
  })
}

function loadOBJ(
  props: ThreejsArtifactViewerProps,
  handleLoadedGeometries: (geometries: THREE.BufferGeometry[]) => THREE.Box3
) {
  const objLoader = new OBJLoader()
  objLoader.load(props.src, (object: THREE.Object3D) => {
    const meshes = object.children as THREE.Mesh[]
    const objGeometries = meshes.map((mesh) => mesh.geometry)
    if (objGeometries.length > 0) {
      handleLoadedGeometries(objGeometries)
    }
  })
}
