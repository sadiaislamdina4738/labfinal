'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

// Simple UUID generator
const generateId = () => Math.random().toString(36).substr(2, 9);

interface CanvasItem {
  id: string;
  type: 'table_round' | 'table_rect' | 'chair' | 'stage' | 'bar' | 'dance_floor' | 'plant' | 'custom_text';
  x: number;
  y: number;
  width: number;
  height: number;
  label?: string;
  color?: string;
}

const ITEM_TYPES = [
  { type: 'table_round', icon: '●', label: 'Round Table', price: 50, width: 60, height: 60 },
  { type: 'table_rect', icon: '▭', label: 'Rect Table', price: 40, width: 100, height: 50 },
  { type: 'chair', icon: '🪑', label: 'Chair', price: 5, width: 30, height: 30 },
  { type: 'stage', icon: '🎭', label: 'Stage', price: 300, width: 150, height: 80 },
  { type: 'bar', icon: '🍸', label: 'Bar', price: 200, width: 120, height: 40 },
  { type: 'dance_floor', icon: '💃', label: 'Dance Floor', price: 500, width: 200, height: 150 },
  { type: 'plant', icon: '🌿', label: 'Plant', price: 15, width: 40, height: 40 },
  { type: 'custom_text', icon: '✏️', label: 'Text', price: 0, width: 100, height: 40 },
];

export default function VenuePlannerPage() {
  const router = useRouter();
  const [layoutName, setLayoutName] = useState('My Layout');
  const [canvasWidth, setCanvasWidth] = useState(800);
  const [canvasHeight, setCanvasHeight] = useState(600);
  const [items, setItems] = useState<CanvasItem[]>([]);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : '';

  const budgetEstimate = items.reduce((sum, item) => {
    const itemType = ITEM_TYPES.find((t) => t.type === item.type);
    return sum + (itemType?.price || 0);
  }, 0);

  const handleAddItem = (type: string) => {
    const itemType = ITEM_TYPES.find((t) => t.type === type);
    if (!itemType) return;

    const newItem: CanvasItem = {
      id: generateId(),
      type: type as any,
      x: Math.random() * (canvasWidth - itemType.width),
      y: Math.random() * (canvasHeight - itemType.height),
      width: itemType.width,
      height: itemType.height,
      color: '#7c3aed',
    };

    setItems([...items, newItem]);
  };

  const handleItemChange = (id: string, updates: Partial<CanvasItem>) => {
    setItems(items.map((item) => (item.id === id ? { ...item, ...updates } : item)));
  };

  const handleDeleteItem = (id: string) => {
    setItems(items.filter((item) => item.id !== id));
    if (selectedItemId === id) {
      setSelectedItemId(null);
    }
  };

  const handleSaveLayout = async () => {
    if (!token || !layoutName.trim()) {
      setMessage('Layout name required');
      return;
    }

    setSaving(true);
    setMessage(null);

    try {
      const response = await fetch('/api/organizer/venue-layouts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: layoutName,
          canvasWidth,
          canvasHeight,
          items,
          isPublished: false,
        }),
      });

      const result = await response.json();

      if (result.success) {
        setMessage('✓ Layout saved!');
        setTimeout(() => {
          router.push('/dashboard/organizer');
        }, 1500);
      } else {
        setMessage(result.message || 'Failed to save layout');
      }
    } catch (err) {
      setMessage('Failed to save layout');
      console.error('Save error:', err);
    } finally {
      setSaving(false);
    }
  };

  const selectedItem = items.find((i) => i.id === selectedItemId);
  const itemType = selectedItem ? ITEM_TYPES.find((t) => t.type === selectedItem.type) : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-4xl font-bold mb-2">🎨 Venue Decoration Planner</h1>
        <p className="text-neutral-600">Design your event layout and estimate budget</p>
      </div>

      <div className="grid lg:grid-cols-4 gap-6">
        {/* Left Panel: Item Library */}
        <div className="lg:col-span-1 space-y-4">
          <Card className="p-4">
            <h3 className="font-semibold mb-3">Layout Name</h3>
            <input
              type="text"
              value={layoutName}
              onChange={(e) => setLayoutName(e.target.value)}
              className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm"
              placeholder="My Layout"
            />
          </Card>

          <Card className="p-4">
            <h3 className="font-semibold mb-3">Items</h3>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {ITEM_TYPES.map((item) => (
                <button
                  key={item.type}
                  onClick={() => handleAddItem(item.type)}
                  className="w-full text-left p-2 bg-neutral-100 hover:bg-neutral-200 rounded-lg text-sm transition group"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{item.icon}</span>
                    <div className="flex-1">
                      <p className="font-medium">{item.label}</p>
                      <p className="text-xs text-neutral-600">${item.price}</p>
                    </div>
                    <span className="text-xs opacity-0 group-hover:opacity-100 transition">+</span>
                  </div>
                </button>
              ))}
            </div>
          </Card>

          {/* Budget Summary */}
          <Card className="p-4 border-primary bg-primary/5">
            <h3 className="font-semibold mb-2">Budget Estimate</h3>
            <p className="text-3xl font-bold text-primary">${budgetEstimate}</p>
            <p className="text-xs text-neutral-600 mt-1">{items.length} items</p>
          </Card>

          {/* Action Buttons */}
          <div className="space-y-2">
            {message && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700">
                {message}
              </div>
            )}
            <Button onClick={handleSaveLayout} variant="primary" className="w-full" disabled={saving}>
              {saving ? '⏳ Saving...' : '💾 Save Layout'}
            </Button>
            <Button
              onClick={() => router.back()}
              variant="outline"
              className="w-full"
              disabled={saving}
            >
              Cancel
            </Button>
          </div>
        </div>

        {/* Center: Canvas */}
        <div className="lg:col-span-2">
          <Card className="p-4">
            <div className="relative bg-gray-50 rounded-lg border-2 border-dashed border-neutral-300 overflow-auto" style={{ width: '100%', aspectRatio: '4/3' }}>
              <svg width={canvasWidth} height={canvasHeight} className="bg-white">
                {/* Grid */}
                <defs>
                  <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                    <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#f0f0f0" strokeWidth="1" />
                  </pattern>
                </defs>
                <rect width={canvasWidth} height={canvasHeight} fill="url(#grid)" />

                {/* Items */}
                {items.map((item) => (
                  <g
                    key={item.id}
                    onClick={() => setSelectedItemId(item.id)}
                    style={{ cursor: 'pointer' }}
                  >
                    <rect
                      x={item.x}
                      y={item.y}
                      width={item.width}
                      height={item.height}
                      fill={item.color || '#7c3aed'}
                      opacity={selectedItemId === item.id ? 0.8 : 0.6}
                      stroke={selectedItemId === item.id ? '#000' : 'none'}
                      strokeWidth={selectedItemId === item.id ? 2 : 0}
                      rx="4"
                    />
                    <text
                      x={item.x + item.width / 2}
                      y={item.y + item.height / 2 + 4}
                      textAnchor="middle"
                      fontSize="20"
                      pointerEvents="none"
                    >
                      {ITEM_TYPES.find((t) => t.type === item.type)?.icon}
                    </text>
                  </g>
                ))}
              </svg>
            </div>
            <p className="text-xs text-neutral-500 mt-2 text-center">
              {items.length === 0 ? 'Add items from the left panel' : 'Click items to select and edit'}
            </p>
          </Card>
        </div>

        {/* Right Panel: Item Editor */}
        <div className="lg:col-span-1">
          {selectedItem && itemType ? (
            <Card className="p-4 space-y-4">
              <div>
                <h3 className="font-semibold mb-2">{itemType.label}</h3>
                <div className="text-2xl mb-2">{itemType.icon}</div>
              </div>

              <div>
                <label className="text-xs font-medium text-neutral-700">X Position</label>
                <input
                  type="number"
                  value={Math.round(selectedItem.x)}
                  onChange={(e) => handleItemChange(selectedItem.id, { x: parseInt(e.target.value) || 0 })}
                  className="w-full px-2 py-1 border border-neutral-300 rounded text-sm"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-neutral-700">Y Position</label>
                <input
                  type="number"
                  value={Math.round(selectedItem.y)}
                  onChange={(e) => handleItemChange(selectedItem.id, { y: parseInt(e.target.value) || 0 })}
                  className="w-full px-2 py-1 border border-neutral-300 rounded text-sm"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-neutral-700">Width</label>
                <input
                  type="number"
                  value={Math.round(selectedItem.width)}
                  onChange={(e) => handleItemChange(selectedItem.id, { width: parseInt(e.target.value) || 10 })}
                  className="w-full px-2 py-1 border border-neutral-300 rounded text-sm"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-neutral-700">Height</label>
                <input
                  type="number"
                  value={Math.round(selectedItem.height)}
                  onChange={(e) => handleItemChange(selectedItem.id, { height: parseInt(e.target.value) || 10 })}
                  className="w-full px-2 py-1 border border-neutral-300 rounded text-sm"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-neutral-700">Color</label>
                <input
                  type="color"
                  value={selectedItem.color || '#7c3aed'}
                  onChange={(e) => handleItemChange(selectedItem.id, { color: e.target.value })}
                  className="w-full h-8 border border-neutral-300 rounded cursor-pointer"
                />
              </div>

              {selectedItem.type === 'custom_text' && (
                <div>
                  <label className="text-xs font-medium text-neutral-700">Label</label>
                  <input
                    type="text"
                    value={selectedItem.label || ''}
                    onChange={(e) => handleItemChange(selectedItem.id, { label: e.target.value })}
                    className="w-full px-2 py-1 border border-neutral-300 rounded text-sm"
                    placeholder="Add text"
                  />
                </div>
              )}

              <div className="pt-2 border-t border-neutral-200">
                <p className="text-xs text-neutral-600 mb-2">Price: ${itemType.price}</p>
              </div>

              <Button
                onClick={() => handleDeleteItem(selectedItem.id)}
                variant="danger"
                size="sm"
                className="w-full"
              >
                🗑️ Delete Item
              </Button>
            </Card>
          ) : (
            <Card className="p-4 text-center">
              <p className="text-neutral-500 text-sm">Select an item to edit</p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
