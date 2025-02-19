import React, { useMemo } from 'react';
import type { Cabinet, Material } from '../types';

interface Panel {
  id: string;
  width: number;
  height: number;
  quantity: number;
  edgeBanding: string[];
  type: string;
}

interface CutOptimizationLayoutProps {
  cabinet: Cabinet;
  material: Material;
  cabinetNumber: number;
}

interface CuttingLayout {
  panels: Panel[];
  utilization: number;
  wasteArea: number;
  layouts: Array<{
    x: number;
    y: number;
    panel: Panel;
  }>;
}

export function CutOptimizationLayout({ 
  cabinet, 
  material, 
  cabinetNumber 
}: CutOptimizationLayoutProps) {
  // Generate all panel components for the cabinet
  const panelComponents: Panel[] = useMemo(() => [
    {
      id: `C${cabinetNumber}-L1`,
      width: cabinet.depth,
      height: cabinet.height,
      quantity: 2,  // Left and Right sides
      edgeBanding: ['top', 'front', 'back'],
      type: 'Side Panel'
    },
    {
      id: `C${cabinetNumber}-T1`,
      width: cabinet.width,
      height: cabinet.depth,
      quantity: 2,  // Top and Bottom
      edgeBanding: ['front', 'back', 'sides'],
      type: 'Top/Bottom Panel'
    },
    {
      id: `C${cabinetNumber}-B1`,
      width: cabinet.width,
      height: cabinet.depth,
      quantity: 1,
      edgeBanding: ['front', 'back', 'sides'],
      type: 'Back Panel'
    },
    {
      id: `C${cabinetNumber}-D1`,
      width: cabinet.width + 40, // Door overlay
      height: cabinet.height + 40,
      quantity: cabinet.quantity,
      edgeBanding: ['all'],
      type: 'Door Panel'
    },
    ...Array.from({ length: cabinet.divisions }).map((_, index) => ({
      id: `C${cabinetNumber}-S${index + 1}`,
      width: cabinet.width - 4, // Account for shelf supports
      height: cabinet.depth - 20,
      quantity: 1,
      edgeBanding: ['front', 'back', 'sides'],
      type: 'Shelf'
    }))
  ], [cabinet, cabinetNumber]);

  // Optimize panel cutting layout
  const optimizeCutting = (
    panels: Panel[], 
    materialWidth: number, 
    materialHeight: number
  ): CuttingLayout => {
    // Sort panels by largest area first (descending)
    const sortedPanels = [...panels].sort((a, b) => 
      (b.width * b.height * b.quantity) - (a.width * a.height * a.quantity)
    );

    const layouts: Array<{x: number, y: number, panel: Panel}> = [];
    let currentX = 0;
    let currentY = 0;
    let maxRowHeight = 0;

    for (const panel of sortedPanels) {
      for (let q = 0; q < panel.quantity; q++) {
        // Check if panel fits horizontally
        if (currentX + panel.width > materialWidth) {
          // Move to next row
          currentX = 0;
          currentY += maxRowHeight;
          maxRowHeight = 0;
        }

        // Check if panel fits vertically
        if (currentY + panel.height > materialHeight) {
          break; // No more space
        }

        // Place panel
        layouts.push({
          x: currentX,
          y: currentY,
          panel
        });

        currentX += panel.width;
        maxRowHeight = Math.max(maxRowHeight, panel.height);
      }
    }

    // Calculate utilization
    const totalPanelArea = layouts.reduce(
      (sum, layout) => sum + layout.panel.width * layout.panel.height, 
      0
    );
    const materialArea = materialWidth * materialHeight;
    const utilization = (totalPanelArea / materialArea) * 100;
    const wasteArea = materialArea - totalPanelArea;

    return {
      panels: sortedPanels,
      utilization,
      wasteArea,
      layouts
    };
  };

  // Perform cutting optimization
  const cuttingLayout = useMemo(() => 
    optimizeCutting(
      panelComponents, 
      material.width, 
      material.height
    ), 
    [panelComponents, material]
  );

  return (
    <div className="space-y-8">
      {/* Cutting Layout Visualization */}
      <div className="bg-[#0A2A43] p-6 rounded-lg shadow-xl">
        <h2 className="text-xl font-bold mb-4">Panel Cutting Optimization</h2>
        
        {/* Material Utilization Summary */}
        <div className="grid grid-cols-3 gap-4 mb-6 text-center">
          <div className="bg-[#1C4A6E] p-4 rounded">
            <h3 className="text-sm font-medium">Total Utilization</h3>
            <p className="text-2xl font-bold text-green-400">
              {cuttingLayout.utilization.toFixed(2)}%
            </p>
          </div>
          <div className="bg-[#1C4A6E] p-4 rounded">
            <h3 className="text-sm font-medium">Waste Area</h3>
            <p className="text-2xl font-bold text-red-400">
              {cuttingLayout.wasteArea.toFixed(2)} mm²
            </p>
          </div>
          <div className="bg-[#1C4A6E] p-4 rounded">
            <h3 className="text-sm font-medium">Total Panels</h3>
            <p className="text-2xl font-bold">
              {cuttingLayout.panels.reduce((sum, panel) => sum + panel.quantity, 0)}
            </p>
          </div>
        </div>

        {/* SVG Cutting Layout */}
        <svg 
          viewBox={`0 0 ${material.width} ${material.height}`} 
          className="w-full h-auto border-2 border-[#2C5A7E]"
        >
          {/* Material Panel Background */}
          <rect 
            x="0" 
            y="0" 
            width={material.width} 
            height={material.height} 
            fill="#051829" 
            stroke="#2C5A7E"
          />

          {/* Placed Panels */}
          {cuttingLayout.layouts.map((layout, index) => (
            <g key={`${layout.panel.id}-${index}`}>
              <rect
                x={layout.x}
                y={layout.y}
                width={layout.panel.width}
                height={layout.panel.height}
                fill="rgba(74, 144, 226, 0.3)"
                stroke="#4A90E2"
                strokeWidth="2"
              />
              <text
                x={layout.x + layout.panel.width / 2}
                y={layout.y + layout.panel.height / 2}
                textAnchor="middle"
                alignmentBaseline="middle"
                fill="#FFFFFF"
                fontSize="12"
              >
                {layout.panel.type}
              </text>
            </g>
          ))}
        </svg>
      </div>

      {/* Detailed Cut List */}
      <div className="bg-[#0A2A43] p-6 rounded-lg shadow-xl overflow-x-auto">
        <h3 className="text-lg font-semibold mb-4">Detailed Cut List</h3>
        <table className="w-full min-w-[800px] text-sm">
          <thead>
            <tr className="border-b border-[#2C5A7E]">
              <th className="text-left py-2 px-4">Reference</th>
              <th className="text-left py-2 px-4">Type</th>
              <th className="text-left py-2 px-4">Dimensions (W × H)</th>
              <th className="text-left py-2 px-4">Quantity</th>
              <th className="text-left py-2 px-4">Edge Banding</th>
            </tr>
          </thead>
          <tbody>
            {cuttingLayout.panels.map((panel) => (
              <tr key={panel.id} className="border-b border-[#2C5A7E]">
                <td className="py-2 px-4">{panel.id}</td>
                <td className="py-2 px-4">{panel.type}</td>
                <td className="py-2 px-4">
                  {panel.width} × {panel.height} mm
                </td>
                <td className="py-2 px-4">{panel.quantity}</td>
                <td className="py-2 px-4">
                  {panel.edgeBanding.join(', ')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
