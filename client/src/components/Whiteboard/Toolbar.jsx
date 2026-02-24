import React, { useState, useRef } from 'react';
import {
    MousePointer2, Pencil, Square, Circle, Minus,
    ArrowUpRight, Type, StickyNote, Eraser, Trash2,
    Undo2, Redo2, Image as ImageIcon, Mic, MicOff, Monitor, Share2, Palette, PaintBucket
} from 'lucide-react';

const Toolbar = ({ activeTool, setActiveTool, color, setColor, brushSize, setBrushSize, eraserSize, setEraserSize, onClear, onUndo, onRedo, onExport, isMicOn, onToggleMic, isSharing, onToggleShare, onShare }) => {
    const tools = [
        { id: 'select', icon: <MousePointer2 size={20} />, label: 'Select' },
        { id: 'pen', icon: <Pencil size={20} />, label: 'Pencil' },
        { id: 'highlighter', icon: <Pencil size={20} style={{ opacity: 0.5 }} />, label: 'Highlighter' },
        { id: 'rect', icon: <Square size={20} />, label: 'Rectangle' },
        { id: 'circle', icon: <Circle size={20} />, label: 'Circle' },
        { id: 'line', icon: <Minus size={20} />, label: 'Line' },
        { id: 'arrow', icon: <ArrowUpRight size={20} />, label: 'Arrow' },
        { id: 'text', icon: <Type size={20} />, label: 'Text' },
        { id: 'sticky', icon: <StickyNote size={20} />, label: 'Sticky Note' },
        { id: 'eraser', icon: <Eraser size={20} />, label: 'Eraser' },
        { id: 'fill', icon: <PaintBucket size={20} />, label: 'Fill' },
    ];

    const colors = [
        '#2d3436', '#636e72', '#b2bec3', '#dfe6e9', '#ffffff', '#000000',
        '#8e8ffa', '#a29bfe', '#6c5ce7', '#5f27cd', '#54a0ff', '#00d2d3',
        '#ff8e8e', '#ff7675', '#d63031', '#ee5253', '#ff9f43', '#f39c12',
        '#8eff8e', '#55efc4', '#00b894', '#1dd1a1', '#f9ca24', '#feca57'
    ];

    return (
        <>
            <div style={{
                position: 'fixed', left: '20px', top: '50%', transform: 'translateY(-50%)',
                display: 'flex', flexDirection: 'column', gap: '8px', padding: '10px',
                backgroundColor: 'white', borderRadius: '24px', boxShadow: '0 8px 30px rgba(0,0,0,0.08)',
                zIndex: 100, border: '1px solid #edeff2',
                maxHeight: '85vh', overflowY: 'auto', scrollbarWidth: 'none'
            }}>
                {tools.map((tool) => (
                    <button
                        key={tool.id}
                        onClick={() => setActiveTool(tool.id)}
                        title={tool.label}
                        style={{
                            width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            borderRadius: '12px', backgroundColor: activeTool === tool.id ? '#f1f2ff' : 'transparent',
                            color: activeTool === tool.id ? '#8e8ffa' : '#64748b',
                            transition: 'all 0.2s', border: 'none', cursor: 'pointer',
                            flexShrink: 0
                        }}
                    >
                        {tool.icon}
                    </button>
                ))}
                <div style={{ height: '1px', backgroundColor: '#f1f2f6', margin: '4px 0', flexShrink: 0 }}></div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '4px', flexShrink: 0 }}>
                    {colors.map((c) => (
                        <button
                            key={c} onClick={() => setColor(c)}
                            style={{
                                width: '12px', height: '12px', borderRadius: '4px',
                                backgroundColor: c, border: color === c ? '2px solid #8e8ffa' : '1px solid #edeff2',
                                padding: 0, cursor: 'pointer'
                            }}
                        />
                    ))}
                </div>

                <div style={{ height: '1px', backgroundColor: '#f1f2f6', margin: '4px 0', flexShrink: 0 }}></div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flexShrink: 0 }}>
                    <button
                        onClick={onToggleMic}
                        title={isMicOn ? "Turn Mic Off" : "Turn Mic On"}
                        style={{
                            width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            borderRadius: '12px', border: 'none',
                            backgroundColor: isMicOn ? '#f1f2ff' : '#f1f2f6',
                            color: isMicOn ? '#8e8ffa' : '#64748b',
                            cursor: 'pointer'
                        }}
                    >
                        {isMicOn ? <Mic size={18} /> : <MicOff size={18} />}
                    </button>
                    <button
                        onClick={onToggleShare}
                        title={isSharing ? "Stop Sharing" : "Share Screen"}
                        style={{
                            width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            borderRadius: '12px', border: 'none',
                            backgroundColor: isSharing ? '#f1f2ff' : '#f1f2f6',
                            color: isSharing ? '#8e8ffa' : '#64748b',
                            cursor: 'pointer'
                        }}
                    >
                        <Monitor size={18} />
                    </button>
                    <button onClick={onClear} title="Clear Canvas" style={{ width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '12px', border: 'none', backgroundColor: '#fff0f0', color: '#ef4444', cursor: 'pointer' }}>
                        <Trash2 size={18} />
                    </button>
                </div>
            </div>

            {/* Action Bar (Undo/Export/Share) - Consolidated at bottom-left */}
            <div style={{
                position: 'fixed', bottom: '60px', left: '80px',
                display: 'flex', gap: '12px', padding: '10px 24px', backgroundColor: 'white',
                borderRadius: '50px', boxShadow: '0 8px 30px rgba(0,0,0,0.12)', alignItems: 'center',
                border: '1px solid #edeff2', zIndex: 101, transition: 'all 0.3s'
            }}>
                <button onClick={onUndo} title="Undo" style={{ color: '#64748b', border: 'none', background: 'none', cursor: 'pointer', transition: '0.2s' }}><Undo2 size={20} /></button>
                <button onClick={onRedo} title="Redo" style={{ color: '#64748b', border: 'none', background: 'none', cursor: 'pointer', transition: '0.2s' }}><Redo2 size={20} /></button>
                <div style={{ width: '1px', height: '24px', backgroundColor: '#f1f2f6' }}></div>

                <button onClick={() => onExport('png')} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 800, color: '#8e8ffa', border: 'none', backgroundColor: 'transparent', cursor: 'pointer', fontSize: '14px' }}>
                    <ImageIcon size={18} /> Export PNG
                </button>

                <div style={{ width: '1px', height: '24px', backgroundColor: '#f1f2f6' }}></div>

                <button onClick={onShare} title="Post to Community Gallery" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 800, color: '#00b894', border: 'none', backgroundColor: 'transparent', cursor: 'pointer', fontSize: '14px' }}>
                    <Share2 size={18} /> Share to Gallery
                </button>
            </div>
        </>
    );
};

export default Toolbar;
