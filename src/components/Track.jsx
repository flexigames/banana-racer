import React, { useEffect } from 'react';
import { useModelWithMaterials, prepareModel } from '../lib/loaders';

const Track = () => {
  // Load track pieces
  const cornerSmall = useModelWithMaterials(
    '/assets/track-narrow-corner-small-ramp.obj',
    '/assets/track-narrow-corner-small-ramp.mtl'
  );
  
  const cornerLarge = useModelWithMaterials(
    '/assets/track-narrow-corner-large.obj',
    '/assets/track-narrow-corner-large.mtl'
  );
  
  const gate = useModelWithMaterials(
    '/assets/gate.obj',
    '/assets/gate.mtl'
  );
  
  // Prepare models
  useEffect(() => {
    [cornerSmall, cornerLarge, gate].forEach(model => {
      if (model) prepareModel(model);
    });
  }, [cornerSmall, cornerLarge, gate]);
  
  // Create a simple oval track
  return (
    <group>
      {/* Starting straight */}
      <group position={[0, 0, 0]}>
        <primitive 
          object={gate.clone()} 
          position={[0, 0, 0]} 
          scale={[0.5, 0.5, 0.5]}
        />
      </group>
      
      {/* First corner */}
      <group position={[0, 0, 15]}>
        <primitive 
          object={cornerLarge.clone()} 
          rotation={[0, Math.PI, 0]}
        />
      </group>
      
      {/* Second straight */}
      <group position={[15, 0, 30]}>
        <primitive 
          object={cornerSmall.clone()} 
          rotation={[0, Math.PI * 1.5, 0]}
        />
      </group>
      
      {/* Second corner */}
      <group position={[30, 0, 30]}>
        <primitive 
          object={cornerLarge.clone()} 
          rotation={[0, Math.PI * 1.5, 0]}
        />
      </group>
      
      {/* Third straight */}
      <group position={[45, 0, 15]}>
        <primitive 
          object={cornerSmall.clone()} 
          rotation={[0, 0, 0]}
        />
      </group>
      
      {/* Third corner */}
      <group position={[45, 0, 0]}>
        <primitive 
          object={cornerLarge.clone()} 
          rotation={[0, 0, 0]}
        />
      </group>
      
      {/* Fourth straight */}
      <group position={[30, 0, -15]}>
        <primitive 
          object={cornerSmall.clone()} 
          rotation={[0, Math.PI * 0.5, 0]}
        />
      </group>
      
      {/* Fourth corner */}
      <group position={[15, 0, -15]}>
        <primitive 
          object={cornerLarge.clone()} 
          rotation={[0, Math.PI * 0.5, 0]}
        />
      </group>
    </group>
  );
};

export default Track; 