import React, { useState, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Text, Float, MeshDistortMaterial, MeshWobbleMaterial, PerspectiveCamera, Environment, ContactShadows } from '@react-three/drei';
import { XR, createXRStore } from '@react-three/xr';

const store = createXRStore();
import { motion, AnimatePresence } from 'framer-motion';
import { X, Box, Maximize2, Info, BarChart3, PieChart } from 'lucide-react';

interface Tax3DVisualizerProps {
  data: {
    grossSalary: number;
    taxableIncome: number;
    totalTax: number;
    deductions: number;
    standardDeduction: number;
    section80C?: number;
    section80D?: number;
  };
  onClose: () => void;
}

function Bar({ position, height, color, label, value }: { position: [number, number, number], height: number, color: string, label: string, value: string }) {
  const [hovered, setHovered] = useState(false);

  return (
    <group position={position}>
      <Float speed={2} rotationIntensity={0.5} floatIntensity={0.5}>
        <mesh 
          position={[0, height / 2, 0]}
          onPointerOver={() => setHovered(true)}
          onPointerOut={() => setHovered(false)}
        >
          <boxGeometry args={[0.8, height, 0.8]} />
          <MeshWobbleMaterial 
            color={hovered ? "#ffffff" : color} 
            factor={hovered ? 0.3 : 0.1} 
            speed={hovered ? 2 : 1} 
          />
        </mesh>
        <Text
          position={[0, height + 0.5, 0]}
          fontSize={0.2}
          color={hovered ? "#3b82f6" : "black"}
          anchorX="center"
          anchorY="middle"
        >
          {label}\n{value}
        </Text>
      </Float>
    </group>
  );
}

function TaxSlabs({ slabs }: { slabs: any[] }) {
  return (
    <group position={[3, -2, -2]}>
      {slabs.map((slab, i) => (
        <mesh key={i} position={[0, i * 0.5, -i * 0.5]}>
          <boxGeometry args={[2, 0.5, 1]} />
          <meshStandardMaterial color={`hsl(${200 + i * 30}, 70%, 60%)`} />
          <Text
            position={[0, 0.3, 0.6]}
            fontSize={0.15}
            color="white"
            anchorX="center"
          >
            {slab.rate}% Slab
          </Text>
        </mesh>
      ))}
      <Text
        position={[0, slabs.length * 0.5 + 0.5, -slabs.length * 0.5]}
        fontSize={0.3}
        color="black"
      >
        Tax Progress
      </Text>
    </group>
  );
}

function MonthlyGrid({ monthlyData }: { monthlyData: any[] }) {
  return (
    <group position={[0, -2, 5]}>
      {monthlyData.map((m, i) => (
        <group key={i} position={[(i % 4) * 2 - 3, Math.floor(i / 4) * 1.5, 0]}>
          <mesh>
            <planeGeometry args={[1.8, 1.2]} />
            <meshStandardMaterial color="#ffffff" opacity={0.8} transparent />
          </mesh>
          <Text
            position={[0, 0.3, 0.01]}
            fontSize={0.15}
            color="#1e293b"
            anchorX="center"
          >
            {m.month}
          </Text>
          <Text
            position={[0, 0, 0.01]}
            fontSize={0.12}
            color="#3b82f6"
            anchorX="center"
          >
            Basic: ₹{m.basicPay.toLocaleString()}
          </Text>
          <Text
            position={[0, -0.3, 0.01]}
            fontSize={0.1}
            color="#64748b"
            anchorX="center"
          >
            Gross: ₹{(m.basicPay + m.da + m.hra).toLocaleString()}
          </Text>
        </group>
      ))}
      <Text
        position={[0, 5, 0]}
        fontSize={0.4}
        color="black"
      >
        Monthly Breakdown
      </Text>
    </group>
  );
}

function TaxScene({ data, activeFY, regime, monthlyData }: { data: Tax3DVisualizerProps['data'], activeFY: any, regime: string, monthlyData: any[] }) {
  const maxVal = Math.max(data.grossSalary, data.taxableIncome, data.totalTax, data.deductions);
  const scale = 5 / maxVal;
  const slabs = regime === 'New' ? activeFY.newRegimeSlabs : activeFY.oldRegimeSlabs;

  return (
    <>
      <ambientLight intensity={0.5} />
      <pointLight position={[10, 10, 10]} intensity={1} />
      <spotLight position={[-10, 10, 10]} angle={0.15} penumbra={1} intensity={1} castShadow />
      
      <group position={[-3, -2, 0]}>
        <Bar 
          position={[0, 0, 0]} 
          height={data.grossSalary * scale} 
          color="#3b82f6" 
          label="Gross Salary" 
          value={`₹${data.grossSalary.toLocaleString()}`} 
        />
        <Bar 
          position={[1.5, 0, 0]} 
          height={data.taxableIncome * scale} 
          color="#10b981" 
          label="Taxable Income" 
          value={`₹${data.taxableIncome.toLocaleString()}`} 
        />
        <Bar 
          position={[3, 0, 0]} 
          height={data.deductions * scale} 
          color="#f59e0b" 
          label="Deductions" 
          value={`₹${data.deductions.toLocaleString()}`} 
        />
        <Bar 
          position={[4.5, 0, 0]} 
          height={data.totalTax * scale} 
          color="#ef4444" 
          label="Total Tax" 
          value={`₹${data.totalTax.toLocaleString()}`} 
        />
      </group>

      {slabs && <TaxSlabs slabs={slabs} />}
      {monthlyData && <MonthlyGrid monthlyData={monthlyData} />}

      <ContactShadows position={[0, -2.01, 0]} opacity={0.5} scale={20} blur={2} far={4.5} />
      <Environment preset="city" />
    </>
  );
}

export default function Tax3DVisualizer({ data, activeFY, regime, monthlyData, onClose }: Tax3DVisualizerProps & { activeFY: any, regime: string, monthlyData: any[] }) {
  const [viewMode, setViewMode] = useState<'3D' | 'AR'>('3D');
  const [arError, setArError] = useState<string | null>(null);
  const [isArSupported, setIsArSupported] = useState<boolean | null>(null);

  React.useEffect(() => {
    if ('xr' in navigator) {
      (navigator as any).xr.isSessionSupported('immersive-ar').then((supported: boolean) => {
        setIsArSupported(supported);
      });
    } else {
      setIsArSupported(false);
    }
  }, []);

  const handleEnterAR = async () => {
    try {
      setArError(null);
      await store.enterAR();
    } catch (error: any) {
      console.error('Failed to enter AR:', error);
      setArError(error.message || 'AR mode is not supported on this device or browser.');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] bg-white/90 backdrop-blur-md flex flex-col"
    >
      <div className="p-4 flex justify-between items-center bg-white border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Box className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">Tax Data Universe</h2>
            <p className="text-sm text-gray-500">Immersive 3D & AR Visualization</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          <div className="flex bg-gray-100 p-1 rounded-lg">
            <button
              onClick={() => setViewMode('3D')}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                viewMode === '3D' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <BarChart3 className="w-4 h-4 inline-block mr-2" />
              3D View
            </button>
            <button
              onClick={() => setViewMode('AR')}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                viewMode === 'AR' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Maximize2 className="w-4 h-4 inline-block mr-2" />
              AR Mode
            </button>
          </div>
          
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-6 h-6 text-gray-500" />
          </button>
        </div>
      </div>

      <div className="flex-1 relative">
        {viewMode === 'AR' && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center space-y-4">
            <button 
              onClick={handleEnterAR}
              disabled={isArSupported === false}
              className={`px-6 py-3 rounded-full font-bold shadow-lg transition-all ${
                isArSupported === false 
                  ? 'bg-gray-400 cursor-not-allowed text-white' 
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {isArSupported === false ? 'AR Not Supported' : 'Enter AR Mode'}
            </button>
            {arError && (
              <div className="bg-red-50 text-red-600 px-4 py-2 rounded-lg text-sm border border-red-200 shadow-sm max-w-xs text-center">
                {arError}
                <p className="mt-1 text-xs opacity-75">Try opening the app in a new tab if you are in an iframe.</p>
              </div>
            )}
          </div>
        )}

        <Canvas shadows>
          <PerspectiveCamera makeDefault position={[0, 0, 10]} fov={50} />
          <OrbitControls makeDefault minPolarAngle={0} maxPolarAngle={Math.PI / 1.75} />
          
          <Suspense fallback={null}>
            <XR store={store}>
              <TaxScene data={data} activeFY={activeFY} regime={regime} monthlyData={monthlyData} />
            </XR>
          </Suspense>
        </Canvas>

        <div className="absolute bottom-8 left-8 right-8 grid grid-cols-1 md:grid-cols-4 gap-4 pointer-events-none">
          <div className="bg-white/80 backdrop-blur-sm p-4 rounded-xl border border-white/20 shadow-xl pointer-events-auto">
            <p className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-1">Gross Salary</p>
            <p className="text-2xl font-bold text-gray-900">₹{data.grossSalary.toLocaleString()}</p>
          </div>
          <div className="bg-white/80 backdrop-blur-sm p-4 rounded-xl border border-white/20 shadow-xl pointer-events-auto">
            <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider mb-1">Taxable Income</p>
            <p className="text-2xl font-bold text-gray-900">₹{data.taxableIncome.toLocaleString()}</p>
          </div>
          <div className="bg-white/80 backdrop-blur-sm p-4 rounded-xl border border-white/20 shadow-xl pointer-events-auto">
            <p className="text-xs font-bold text-amber-600 uppercase tracking-wider mb-1">Deductions</p>
            <p className="text-2xl font-bold text-gray-900">₹{data.deductions.toLocaleString()}</p>
          </div>
          <div className="bg-white/80 backdrop-blur-sm p-4 rounded-xl border border-white/20 shadow-xl pointer-events-auto">
            <p className="text-xs font-bold text-red-600 uppercase tracking-wider mb-1">Total Tax</p>
            <p className="text-2xl font-bold text-gray-900">₹{data.totalTax.toLocaleString()}</p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
