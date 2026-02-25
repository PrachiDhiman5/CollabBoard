import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Toolbar from '../components/Whiteboard/Toolbar';
import Canvas from '../components/Whiteboard/Canvas';
import Chat from '../components/Whiteboard/Chat';
import Cursor from '../components/Whiteboard/Cursor';
import VoiceManager from '../components/Whiteboard/VoiceManager';
import ScreenShareManager from '../components/Whiteboard/ScreenShareManager';
import ShareToGallery from '../components/Whiteboard/ShareToGallery';
import { roomAPI, SOCKET_URL } from '../services/api';
import io from 'socket.io-client';
import { Users, ChevronLeft, Share2 } from 'lucide-react';

const Whiteboard = () => {
    const { roomId } = useParams();
    const navigate = useNavigate();
    const [activeTool, setActiveTool] = useState('pen');
    const [color, setColor] = useState('#2d3436');
    const [brushSize, setBrushSize] = useState(3);
    const [eraserSize, setEraserSize] = useState(20);
    const [elements, setElements] = useState([]);
    const [roomData, setRoomData] = useState(null);
    const [cursors, setCursors] = useState({});
    const [participants, setParticipants] = useState([]);
    const [isMicOn, setIsMicOn] = useState(false);
    const [isSharing, setIsSharing] = useState(false);
    const [showShareModal, setShowShareModal] = useState(false);
    const socketRef = useRef();
    const user = JSON.parse(sessionStorage.getItem('user') || '{"name": "Anonymous"}');
    const canvasRef = useRef(null);
    const canvasParentRef = useRef(null);

    useEffect(() => {
        const fetchRoom = async () => {
            try {
                const res = await roomAPI.getRoom(roomId);
                setRoomData(res.data);
                if (res.data.objects) {
                    // Adapt DB objects to frontend format if necessary
                    const formattedElements = res.data.objects.map(obj => ({
                        type: obj.type,
                        ...obj.properties,
                        id: obj.id,
                        creator: obj.creatorId
                    }));
                    setElements(formattedElements);
                }
            } catch (err) {
                console.error("Failed to fetch room", err);
                navigate('/dashboard');
            }
        };
        fetchRoom();

        socketRef.current = io(SOCKET_URL);
        socketRef.current.emit('join-room', { roomId, user });

        socketRef.current.on('elements-sync', (syncedElements) => setElements(syncedElements));
        socketRef.current.on('cursor-update', ({ id, x, y, name, color }) => {
            setCursors((prev) => ({ ...prev, [id]: { x, y, name, color } }));
        });
        socketRef.current.on('update-participants', (users) => setParticipants(users));
        socketRef.current.on('user-disconnected', (id) => {
            setCursors((prev) => {
                const next = { ...prev };
                delete next[id];
                return next;
            });
        });

        socketRef.current.on('kicked', () => {
            alert("Host has removed you from the room.");
            navigate('/dashboard');
        });

        return () => socketRef.current.disconnect();
    }, [roomId, navigate]);

    // Auto-save logic (debounced)
    useEffect(() => {
        if (elements.length === 0) return;

        const saveTimeout = setTimeout(async () => {
            try {
                const formattedObjects = elements.map(el => ({
                    id: el.id || Math.random().toString(36).substr(2, 9),
                    type: el.type,
                    properties: { ...el }, // Store everything else in properties
                    creatorId: el.creator
                }));
                await roomAPI.updateObjects(roomId, formattedObjects);
                console.log("Room saved successfully");
            } catch (err) {
                console.error("Auto-save failed", err);
            }
        }, 2000); // 2 second debounce

        return () => clearTimeout(saveTimeout);
    }, [elements, roomId]);

    const handleClear = () => {
        if (window.confirm("Clear the entire board?")) {
            setElements([]);
            socketRef.current.emit('canvas-clear', roomId);
        }
    };

    const handleUndo = () => canvasRef.current?.undo();
    const handleRedo = () => canvasRef.current?.redo();
    const handleExport = () => canvasRef.current?.exportImage();

    const handleCopyLink = () => {
        navigator.clipboard.writeText(roomId);
        alert("Room ID copied to clipboard!");
    };

    return (
        <div style={{ width: '100vw', height: '100dvh', overflow: 'hidden', backgroundColor: 'white', display: 'flex' }}>
            <div style={{ flex: 1, position: 'relative', height: '100%', display: 'flex', flexDirection: 'column' }}>
                {/* Header info */}
                <div style={{
                    padding: '12px 24px', backgroundColor: 'white', borderBottom: '1px solid #edeff2',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                        <button
                            onClick={() => navigate('/dashboard')}
                            style={{
                                display: 'flex', alignItems: 'center', gap: '8px',
                                border: '1px solid #edeff2', background: 'white',
                                padding: '8px 16px', borderRadius: '12px',
                                cursor: 'pointer', color: '#636e72', fontWeight: 700,
                                transition: '0.2s', fontSize: '0.9rem'
                            }}
                            onMouseOver={(e) => { e.currentTarget.style.backgroundColor = '#f8f9fa'; e.currentTarget.style.borderColor = '#d1d4d7'; }}
                            onMouseOut={(e) => { e.currentTarget.style.backgroundColor = 'white'; e.currentTarget.style.borderColor = '#edeff2'; }}
                        >
                            <ChevronLeft size={18} /> Exit to Dashboard
                        </button>
                        <div>
                            <h3 style={{ margin: 0, fontWeight: 800, fontSize: '1.1rem', color: '#2d3436' }}>{roomData?.name || 'Loading...'}</h3>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px' }}>
                                <span style={{ fontSize: '0.75rem', color: '#b2bec3', fontWeight: 700 }}>ID: {roomId}</span>
                                <Share2 size={12} color="#8e8ffa" cursor="pointer" onClick={handleCopyLink} />
                            </div>
                        </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 14px', backgroundColor: '#f1f2ff', borderRadius: '12px' }}>
                            <div style={{ width: 8, height: 8, backgroundColor: '#00b894', borderRadius: '50%', boxShadow: '0 0 8px rgba(0, 184, 148, 0.5)' }}></div>
                            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#00b894' }}>{participants.length} Online</span>
                            <div style={{ display: 'flex', marginLeft: '8px' }}>
                                {participants.slice(0, 3).map((p, i) => (
                                    <img
                                        key={i}
                                        src={p.picture || `https://api.dicebear.com/7.x/lorelei/svg?seed=${encodeURIComponent(p.name || 'User')}`}
                                        style={{ width: 24, height: 24, borderRadius: '50%', border: '2px solid white', marginLeft: i > 0 ? -8 : 0 }}
                                        onError={(e) => e.target.src = `https://api.dicebear.com/7.x/lorelei/svg?seed=${encodeURIComponent(p.name || 'User')}`}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                <div
                    ref={canvasParentRef}
                    style={{ flex: 1, position: 'relative', overflow: 'hidden', backgroundColor: '#f8f9fa' }}
                >
                    <Toolbar
                        activeTool={activeTool} setActiveTool={setActiveTool}
                        color={color} setColor={setColor}
                        brushSize={brushSize} setBrushSize={setBrushSize}
                        eraserSize={eraserSize} setEraserSize={setEraserSize}
                        onClear={handleClear} onUndo={handleUndo} onRedo={handleRedo} onExport={handleExport}
                        isMicOn={isMicOn} onToggleMic={() => setIsMicOn(!isMicOn)}
                        isSharing={isSharing} onToggleShare={() => setIsSharing(!isSharing)}
                        onShare={() => setShowShareModal(true)}
                    />

                    <div style={{ width: '100%', height: '100%', cursor: activeTool === 'select' ? 'default' : 'crosshair' }}>
                        <Canvas
                            ref={canvasRef} elements={elements} setElements={setElements} activeTool={activeTool}
                            color={color}
                            brushSize={brushSize} setBrushSize={setBrushSize}
                            eraserSize={eraserSize} setEraserSize={setEraserSize}
                            socket={socketRef.current} roomId={roomId} user={user}
                            hostId={roomData?.host?._id || roomData?.host}
                            containerRef={canvasParentRef}
                        />
                        {Object.entries(cursors).map(([id, pos]) => <Cursor key={id} {...pos} />)}
                    </div>
                </div>
            </div>

            {/* Sidebar Chat */}
            <Chat
                socket={socketRef.current}
                roomId={roomId}
                user={user}
                participants={participants}
                hostId={roomData?.host?._id || roomData?.host}
            />

            {/* WebRTC Managers */}
            <VoiceManager
                socket={socketRef.current} roomId={roomId} user={user}
                participants={participants} isMicOn={isMicOn}
            />
            <ScreenShareManager
                socket={socketRef.current} roomId={roomId} user={user}
                participants={participants} isSharing={isSharing} setIsSharing={setIsSharing}
            />

            {/* Share to Gallery Modal */}
            <ShareToGallery
                isOpen={showShareModal}
                onClose={() => setShowShareModal(false)}
                canvasRef={{ current: canvasRef.current?.getCanvas() }}
                user={user}
            />
        </div>
    );
};

export default Whiteboard;
