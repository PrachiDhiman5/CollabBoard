import React, { useLayoutEffect, useRef, useState, useImperativeHandle, forwardRef, useEffect } from 'react';

const Canvas = forwardRef(({ elements, setElements, activeTool, color, brushSize, setBrushSize, eraserSize, setEraserSize, socket, roomId, user, hostId }, ref) => {
    const canvasRef = useRef(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [cursorPos, setCursorPos] = useState({ x: 0, y: 0, visible: false });
    const [currentElement, setCurrentElement] = useState(null);
    const [history, setHistory] = useState([]);
    const lastCursorUpdate = useRef(0);
    const brushSizeRef = useRef(brushSize);

    // Sync ref with prop
    useEffect(() => {
        brushSizeRef.current = brushSize;
    }, [brushSize]);

    // Keyboard controls for brush size (Restricted to Eraser only as per request)
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.ctrlKey && activeTool === 'eraser') {
                if (e.key === '+' || e.key === '=') {
                    e.preventDefault();
                    setEraserSize(prev => Math.min(prev + 5, 100));
                } else if (e.key === '-' || e.key === '_') {
                    e.preventDefault();
                    setEraserSize(prev => Math.max(prev - 5, 5));
                }
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [setEraserSize, activeTool]);

    useImperativeHandle(ref, () => ({
        getCanvas: () => canvasRef.current,
        exportImage: () => {
            const canvas = canvasRef.current;
            const dataURL = canvas.toDataURL('image/png');
            const link = document.createElement('a');
            link.download = `whiteboard-${roomId}.png`;
            link.href = dataURL;
            link.click();
        },
        undo: () => {
            if (elements.length === 0) return;
            const newElements = [...elements];
            const popped = newElements.pop();
            setElements(newElements);
            setHistory(prev => [...prev, popped]);
            socket.emit('element-update', { roomId, elements: newElements });
        },
        redo: () => {
            if (history.length === 0) return;
            const elementToRestore = history[history.length - 1];
            const newHistory = history.slice(0, -1);
            const newElements = [...elements, elementToRestore];
            setHistory(newHistory);
            setElements(newElements);
            socket.emit('element-update', { roomId, elements: newElements });
        }
    }), [elements, history, socket, roomId]);

    useLayoutEffect(() => {
        const canvas = canvasRef.current;
        const context = canvas.getContext('2d');
        context.clearRect(0, 0, canvas.width, canvas.height);

        elements.forEach((element) => {
            drawElement(context, element);
        });

        if (currentElement) {
            drawElement(context, currentElement);
        }
    }, [elements, currentElement]);

    const drawElement = (ctx, element) => {
        ctx.strokeStyle = element.color || '#000';
        ctx.lineWidth = element.brushSize || 2;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        // Highlighter support (transparency)
        if (element.type === 'highlighter') {
            ctx.globalAlpha = 0.4;
            ctx.strokeStyle = element.color + '66'; // Add alpha to hex if needed, but ctx.globalAlpha is more robust
        } else {
            ctx.globalAlpha = 1.0;
        }

        switch (element.type) {
            case 'highlighter':
            case 'pen':
                ctx.beginPath();
                element.points.forEach((point, index) => {
                    if (index === 0) ctx.moveTo(point.x, point.y);
                    else ctx.lineTo(point.x, point.y);
                });
                ctx.stroke();
                break;
            case 'rect':
                if (element.fill) {
                    ctx.fillStyle = element.fill;
                    ctx.fillRect(element.x, element.y, element.width, element.height);
                }
                ctx.strokeRect(element.x, element.y, element.width, element.height);
                break;
            case 'circle':
                ctx.beginPath();
                const radius = Math.sqrt(Math.pow(element.width, 2) + Math.pow(element.height, 2)) / 2;
                ctx.arc(element.x + element.width / 2, element.y + element.height / 2, radius, 0, 2 * Math.PI);
                if (element.fill) {
                    ctx.fillStyle = element.fill;
                    ctx.fill();
                }
                ctx.stroke();
                break;
            case 'line':
                ctx.beginPath();
                ctx.moveTo(element.x, element.y);
                ctx.lineTo(element.x + element.width, element.y + element.height);
                ctx.stroke();
                break;
            case 'arrow':
                const headlen = 10;
                const tox = element.x + element.width;
                const toy = element.y + element.height;
                const angle = Math.atan2(element.height, element.width);
                ctx.beginPath();
                ctx.moveTo(element.x, element.y);
                ctx.lineTo(tox, toy);
                ctx.lineTo(tox - headlen * Math.cos(angle - Math.PI / 6), toy - headlen * Math.sin(angle - Math.PI / 6));
                ctx.moveTo(tox, toy);
                ctx.lineTo(tox - headlen * Math.cos(angle + Math.PI / 6), toy - headlen * Math.sin(angle + Math.PI / 6));
                ctx.stroke();
                break;
            case 'text':
                ctx.font = `${element.brushSize * 5}px Inter, sans-serif`;
                ctx.fillStyle = element.color;
                ctx.fillText(element.text || '', element.x, element.y);
                break;
            case 'sticky':
                const size = 150;
                ctx.fillStyle = '#fff385'; // Classic sticky yellow
                ctx.shadowColor = 'rgba(0,0,0,0.1)';
                ctx.shadowBlur = 10;
                ctx.fillRect(element.x, element.y, size, size);
                ctx.shadowBlur = 0; // Reset
                ctx.font = '14px Inter, sans-serif';
                ctx.fillStyle = '#2d3436';
                // Wrap text manually or keep it simple
                ctx.fillText(element.text || '', element.x + 10, element.y + 25, size - 20);
                break;
            default:
                break;
        }
        ctx.globalAlpha = 1.0; // Reset
    };

    const isOwnerOrHost = (creatorId) => {
        const isHost = user._id === hostId || user.id === hostId;
        const myId = user.email || user.id || user._id || socket.id;
        return creatorId === myId || isHost || !creatorId;
    };

    const handleMouseDown = (e) => {
        const { offsetX, offsetY } = e.nativeEvent;

        if (activeTool === 'eraser' || activeTool === 'fill') {
            const radius = Math.max(brushSize * 3, 20);

            // Find target element (compatible with older browsers)
            let targetIndex = -1;
            for (let i = elements.length - 1; i >= 0; i--) {
                const el = elements[i];
                if (activeTool === 'eraser') {
                    let hit = false;
                    if (el.points) {
                        hit = el.points.some(p => Math.sqrt(Math.pow(p.x - offsetX, 2) + Math.pow(p.y - offsetY, 2)) < radius);
                    } else if (el.type === 'rect') {
                        const minX = Math.min(el.x, el.x + el.width);
                        const maxX = Math.max(el.x, el.x + el.width);
                        const minY = Math.min(el.y, el.y + el.height);
                        const maxY = Math.max(el.y, el.y + el.height);
                        hit = (offsetX >= minX - radius && offsetX <= maxX + radius && offsetY >= minY - radius && offsetY <= maxY + radius);
                    } else if (el.type === 'circle') {
                        const centerX = el.x + el.width / 2;
                        const centerY = el.y + el.height / 2;
                        const r = Math.sqrt(Math.pow(el.width, 2) + Math.pow(el.height, 2)) / 2;
                        const distToCenter = Math.sqrt(Math.pow(centerX - offsetX, 2) + Math.pow(centerY - offsetY, 2));
                        hit = distToCenter <= r + radius;
                    }
                    if (hit) { targetIndex = i; break; }
                } else {
                    // Fill logic
                    if (el.type === 'rect') {
                        const minX = Math.min(el.x, el.x + el.width);
                        const maxX = Math.max(el.x, el.x + el.width);
                        const minY = Math.min(el.y, el.y + el.height);
                        const maxY = Math.max(el.y, el.y + el.height);
                        if (offsetX >= minX && offsetX <= maxX && offsetY >= minY && offsetY <= maxY) { targetIndex = i; break; }
                    } else if (el.type === 'circle') {
                        const centerX = el.x + el.width / 2;
                        const centerY = el.y + el.height / 2;
                        const r = Math.sqrt(Math.pow(el.width, 2) + Math.pow(el.height, 2)) / 2;
                        if (Math.sqrt(Math.pow(centerX - offsetX, 2) + Math.pow(centerY - offsetY, 2)) <= r) { targetIndex = i; break; }
                    }
                }
            }

            if (targetIndex !== -1) {
                const newElements = [...elements];
                if (activeTool === 'eraser') {
                    // Check ownership OR if guest (more permissive for now)
                    const el = newElements[targetIndex];
                    if (isOwnerOrHost(el.creator)) {
                        newElements.splice(targetIndex, 1);
                        setElements(newElements);
                        socket.emit('element-update', { roomId, elements: newElements });
                    }
                } else {
                    newElements[targetIndex] = { ...newElements[targetIndex], fill: color };
                    setElements(newElements);
                    socket.emit('element-update', { roomId, elements: newElements });
                }
            }

            if (activeTool === 'eraser') setIsDrawing(true);
            return;
        }

        if (activeTool === 'select') return;

        setIsDrawing(true);

        const commonProps = {
            color,
            brushSize: activeTool === 'eraser' ? eraserSize : brushSize,
            creator: user.email || user.id || user._id || socket.id
        };

        if (activeTool === 'pen' || activeTool === 'highlighter') {
            setCurrentElement({ type: activeTool, points: [{ x: offsetX, y: offsetY }], ...commonProps });
        } else {
            setCurrentElement({ type: activeTool, x: offsetX, y: offsetY, width: 0, height: 0, ...commonProps });
        }
    };

    const handleMouseMove = (e) => {
        const { offsetX: x, offsetY: y } = e.nativeEvent;
        setCursorPos({ x, y, visible: true });

        // Throttled cursor update
        const now = Date.now();
        if (now - lastCursorUpdate.current > 30) {
            socket.emit('cursor-move', { roomId, x, y, name: user.name, color });
            lastCursorUpdate.current = now;
        }

        if (!isDrawing) return;

        if (activeTool === 'eraser') {
            const radius = Math.max(eraserSize, 20);
            let targetIndex = -1;
            for (let i = elements.length - 1; i >= 0; i--) {
                const el = elements[i];
                let hit = false;
                if (el.points) {
                    hit = el.points.some(p => Math.sqrt(Math.pow(p.x - x, 2) + Math.pow(p.y - y, 2)) < radius);
                } else if (el.type === 'rect') {
                    const minX = Math.min(el.x, el.x + el.width);
                    const maxX = Math.max(el.x, el.x + el.width);
                    const minY = Math.min(el.y, el.y + el.height);
                    const maxY = Math.max(el.y, el.y + el.height);
                    hit = (x >= minX - radius && x <= maxX + radius && y >= minY - radius && y <= maxY + radius);
                } else if (el.type === 'circle') {
                    const centerX = el.x + el.width / 2;
                    const centerY = el.y + el.height / 2;
                    const r = Math.sqrt(Math.pow(el.width, 2) + Math.pow(el.height, 2)) / 2;
                    const distToCenter = Math.sqrt(Math.pow(centerX - x, 2) + Math.pow(centerY - y, 2));
                    hit = distToCenter <= r + radius;
                }
                if (hit) { targetIndex = i; break; }
            }

            if (targetIndex !== -1) {
                const el = elements[targetIndex];
                if (isOwnerOrHost(el.creator)) {
                    const newElements = elements.filter((_, i) => i !== targetIndex);
                    setElements(newElements);
                    socket.emit('element-update', { roomId, elements: newElements });
                }
            }
            return;
        }

        if (activeTool === 'pen' || activeTool === 'highlighter') {
            setCurrentElement((prev) => ({
                ...prev,
                points: [...prev.points, { x, y }],
            }));
        } else {
            setCurrentElement((prev) => ({
                ...prev,
                width: x - prev.x,
                height: y - prev.y,
            }));
        }
    };

    const handleMouseUp = () => {
        if (!isDrawing) return;
        setIsDrawing(false);

        if (!currentElement) return; // Fix: Don't add garbage for eraser/fill

        let finalElement = { ...currentElement };

        if (activeTool === 'text' || activeTool === 'sticky') {
            const text = prompt(`Enter ${activeTool === 'text' ? 'text' : 'sticky note content'}:`);
            if (!text) {
                setCurrentElement(null);
                return;
            }
            finalElement.text = text;
        }

        const updatedElements = [...elements, finalElement];
        setElements(updatedElements);

        // Sync with other users
        socket.emit('element-update', { roomId, elements: updatedElements });

        setCurrentElement(null);
    };

    return (
        <div
            style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }}
            onMouseEnter={() => setCursorPos(prev => ({ ...prev, visible: true }))}
            onMouseLeave={() => setCursorPos(prev => ({ ...prev, visible: false }))}
        >
            <canvas
                ref={canvasRef}
                width={window.innerWidth}
                height={window.innerHeight}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                style={{ display: 'block', cursor: 'none' }}
            />

            {cursorPos.visible && (
                <div style={{
                    position: 'absolute',
                    left: cursorPos.x,
                    top: cursorPos.y,
                    pointerEvents: 'none',
                    transform: 'translate(-50%, -50%)',
                    zIndex: 2000, // Higher than toolbar
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}>
                    {activeTool === 'fill' ? (
                        <div style={{
                            color: color === '#ffffff' ? '#64748b' : color,
                            filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.3))',
                            transform: 'translate(4px, -4px)' // Offset for bucket tip
                        }}>
                            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="m19 11-8-8-8.6 8.6a2 2 0 0 0 0 2.8l5.2 5.2c.8.8 2 .8 2.8 0L19 11Z" /><path d="m5 2 5 5" /><path d="M2 13h15" /><path d="M22 20a2 2 0 1 1-4 0c0-1.6 1.7-2.4 2-4 .3 1.6 2 2.4 2 4Z" />
                            </svg>
                        </div>
                    ) : (activeTool === 'pen' || activeTool === 'highlighter' || activeTool === 'eraser' || activeTool === 'line' || activeTool === 'rect' || activeTool === 'circle' || activeTool === 'arrow') ? (
                        <div style={{
                            width: activeTool === 'eraser' ? eraserSize : (brushSize * 2),
                            height: activeTool === 'eraser' ? eraserSize : (brushSize * 2),
                            borderRadius: '50%',
                            border: '2px solid rgba(0,0,0,0.5)',
                            backgroundColor: activeTool === 'eraser' ? 'rgba(255,255,255,0.4)' : (activeTool === 'highlighter' ? color + '44' : color + '22'),
                            boxShadow: '0 0 0 1px rgba(255,255,255,0.8), inset 0 0 4px rgba(0,0,0,0.1)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}>
                            {/* Inner dot for center precision */}
                            <div style={{ width: '2px', height: '2px', backgroundColor: 'black', borderRadius: '50%' }} />
                        </div>
                    ) : (
                        <div style={{ color: '#64748b', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))' }}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="m3 3 7.07 16.97 2.51-7.39 7.39-2.51L3 3z" /><path d="m13 13 6 6" />
                            </svg>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
});

export default Canvas;
