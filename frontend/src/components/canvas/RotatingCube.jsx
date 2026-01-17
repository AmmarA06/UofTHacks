import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { MeshWobbleMaterial } from '@react-three/drei'

function RotatingCube() {
  const meshRef = useRef()

  // Rotate the cube on each frame
  useFrame((state, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.x += delta * 0.5
      meshRef.current.rotation.y += delta * 0.7
    }
  })

  return (
    <mesh ref={meshRef}>
      <boxGeometry args={[2, 2, 2]} />
      <MeshWobbleMaterial 
        color="#ff6b6b"
        speed={1}
        factor={0.3}
      />
    </mesh>
  )
}

export default RotatingCube
