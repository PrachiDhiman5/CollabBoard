import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, LogOut, ArrowRight, Monitor, Settings, Search, Users, Globe, History, Lock, Shield, Pencil } from 'lucide-react';
import { roomAPI } from '../services/api';
import { useData } from '../context/DataContext';

const Dashboard = () => {
    const { history, publicRooms, fetchRooms, refreshRooms, loading: globalLoading } = useData();
    const [loading, setLoading] = useState(false);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showJoinModal, setShowJoinModal] = useState(false);
    const [newRoomName, setNewRoomName] = useState('');
    const [isPublic, setIsPublic] = useState(false);
    const [joinRoomId, setJoinRoomId] = useState('');
    const [activeTab, setActiveTab] = useState('history'); // 'history' or 'public'

    const navigate = useNavigate();
    const user = JSON.parse(localStorage.getItem('user') || '{}');

    useEffect(() => {
        fetchRooms(); // This will only fetch if data isn't already cached
    }, [fetchRooms]);

    const handleCreateRoom = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const res = await roomAPI.createRoom({ name: newRoomName, isPublic });
            navigate(`/room/${res.data.roomId}`);
        } catch (err) {
            console.error("Failed to create room", err);
        } finally {
            setLoading(false);
        }
    };

    const handleJoinRoom = async (e) => {
        e.preventDefault();
        if (!joinRoomId) return;
        navigate(`/room/${joinRoomId}`);
    };

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/';
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return `Created on ${date.toLocaleDateString()} at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    };

    return (
        <div style={{ backgroundColor: '#fdfbff', minHeight: '100vh', padding: '1.5rem 2rem' }}>
            {/* Minimalist Navbar */}
            <nav style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                    <div style={{ padding: '0.8rem', backgroundColor: '#8e8ffa', borderRadius: '16px', color: 'white' }}>
                        <Pencil size={24} />
                    </div>
                    <h2 style={{ margin: 0, fontWeight: 900, fontSize: '1.8rem', color: '#2d3436', letterSpacing: '-1px' }}>CollabBoard</h2>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', cursor: 'pointer' }} onClick={() => navigate('/profile')}>
                        <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontWeight: 800, color: '#2d3436' }}>{user.name}</span>
                            <span style={{ fontSize: '0.75rem', color: '#b2bec3', fontWeight: 700 }}>{user.email}</span>
                        </div>
                        <div style={{
                            width: 50, height: 50, borderRadius: '18px', overflow: 'hidden',
                            border: '3px solid white', boxShadow: '0 8px 16px rgba(142,143,250,0.2)'
                        }}>
                            <img
                                src={user.picture || `https://api.dicebear.com/7.x/lorelei/svg?seed=${encodeURIComponent(user.name || 'User')}`}
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                onError={(e) => e.target.src = `https://api.dicebear.com/7.x/lorelei/svg?seed=${encodeURIComponent(user.name || 'User')}`}
                            />
                        </div>
                    </div>
                    <button
                        onClick={handleLogout}
                        style={{
                            padding: '0.8rem 1.5rem', backgroundColor: '#fff', border: '2px solid #edeff2',
                            borderRadius: '14px', cursor: 'pointer', fontWeight: 700, transition: '0.2s', color: '#ff7675'
                        }}
                        onMouseOver={(e) => e.target.style.backgroundColor = '#fff5f5'}
                        onMouseOut={(e) => e.target.style.backgroundColor = '#fff'}
                    >
                        Sign Out
                    </button>
                </div>
            </nav>

            <div className="container" style={{ maxWidth: '1200px', margin: '0 auto' }}>
                {/* Hero Controls - Zoom Style - 5 Card Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '1.5rem', marginBottom: '4rem' }}>
                    <motion.div
                        whileHover={{ y: -5 }} onClick={() => setShowCreateModal(true)}
                        style={{ padding: '2rem', backgroundColor: '#8e8ffa', borderRadius: '28px', color: 'white', cursor: 'pointer', boxShadow: '0 10px 25px rgba(142, 143, 250, 0.3)', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}
                    >
                        <div style={{ width: 56, height: 56, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Plus size={32} />
                        </div>
                        <div>
                            <h3 style={{ margin: 0, fontWeight: 700, fontSize: '1.2rem' }}>New Board</h3>
                            <p style={{ margin: 0, fontSize: '0.9rem', opacity: 0.9 }}>Start a fresh session</p>
                        </div>
                    </motion.div>

                    <motion.div
                        whileHover={{ y: -5 }} onClick={() => setShowJoinModal(true)}
                        style={{ padding: '2rem', backgroundColor: 'white', borderRadius: '28px', border: '1px solid #edeff2', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}
                    >
                        <div style={{ width: 56, height: 56, backgroundColor: '#f1f2ff', borderRadius: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Users size={32} color="#8e8ffa" />
                        </div>
                        <div>
                            <h3 style={{ margin: 0, fontWeight: 700, fontSize: '1.2rem' }}>Join Room</h3>
                            <p style={{ margin: 0, fontSize: '0.9rem', color: '#636e72' }}>Enter an existing ID</p>
                        </div>
                    </motion.div>

                    <motion.div
                        whileHover={{ y: -5 }} onClick={() => navigate('/gallery')}
                        style={{ padding: '2rem', backgroundColor: 'white', borderRadius: '28px', border: '1px solid #edeff2', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}
                    >
                        <div style={{ width: 56, height: 56, backgroundColor: '#eefcf5', borderRadius: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Globe size={32} color="#00b894" />
                        </div>
                        <div>
                            <h3 style={{ margin: 0, fontWeight: 700, fontSize: '1.2rem' }}>Explore</h3>
                            <p style={{ margin: 0, fontSize: '0.9rem', color: '#636e72' }}>Community Gallery</p>
                        </div>
                    </motion.div>

                    <motion.div
                        whileHover={{ y: -5 }} onClick={() => setActiveTab('public')}
                        style={{ padding: '2rem', backgroundColor: 'white', borderRadius: '28px', border: '1px solid #edeff2', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '1.5rem', borderBottom: activeTab === 'public' ? '3px solid #8e8ffa' : '1px solid #edeff2' }}
                    >
                        <div style={{ width: 56, height: 56, backgroundColor: '#fdf2f2', borderRadius: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Search size={32} color="#ff7675" />
                        </div>
                        <div>
                            <h3 style={{ margin: 0, fontWeight: 700, fontSize: '1.2rem' }}>Discovery</h3>
                            <p style={{ margin: 0, fontSize: '0.9rem', color: '#636e72' }}>Public boards</p>
                        </div>
                    </motion.div>

                    <motion.div
                        whileHover={{ y: -5 }} onClick={() => setActiveTab('history')}
                        style={{ padding: '2rem', backgroundColor: 'white', borderRadius: '28px', border: '1px solid #edeff2', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '1.5rem', borderBottom: activeTab === 'history' ? '3px solid #8e8ffa' : '1px solid #edeff2' }}
                    >
                        <div style={{ width: 56, height: 56, backgroundColor: '#fffaf0', borderRadius: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <History size={32} color="#fdcb6e" />
                        </div>
                        <div>
                            <h3 style={{ margin: 0, fontWeight: 700, fontSize: '1.2rem' }}>History</h3>
                            <p style={{ margin: 0, fontSize: '0.9rem', color: '#636e72' }}>Your boards</p>
                        </div>
                    </motion.div>
                </div>

                {/* Content Section */}
                <div style={{ backgroundColor: 'white', padding: '2.5rem', borderRadius: '32px', border: '1px solid #edeff2' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
                        <div style={{ display: 'flex', gap: '2rem', borderBottom: '2px solid #f1f2f6' }}>
                            <button
                                onClick={() => setActiveTab('history')}
                                style={{
                                    padding: '1rem 0', fontWeight: 700, color: activeTab === 'history' ? '#8e8ffa' : '#b2bec3',
                                    borderBottom: `3px solid ${activeTab === 'history' ? '#8e8ffa' : 'transparent'}`,
                                    transition: '0.3s', cursor: 'pointer'
                                }}
                            >
                                Your History
                            </button>
                            <button
                                onClick={() => setActiveTab('public')}
                                style={{
                                    padding: '1rem 0', fontWeight: 700, color: activeTab === 'public' ? '#8e8ffa' : '#b2bec3',
                                    borderBottom: `3px solid ${activeTab === 'public' ? '#8e8ffa' : 'transparent'}`,
                                    transition: '0.3s', cursor: 'pointer'
                                }}
                            >
                                Discovery (Public)
                            </button>
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '2rem' }}>
                        {Array.isArray(activeTab === 'history' ? history : publicRooms) && (activeTab === 'history' ? history : publicRooms).map((room) => (
                            <motion.div
                                key={room.roomId}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                whileHover={{ y: -8 }}
                                onClick={() => navigate(`/room/${room.roomId}`)}
                                style={{
                                    padding: '1.5rem', borderRadius: '24px', border: '1px solid #f1f2f6', cursor: 'pointer',
                                    backgroundColor: '#ffffff', transition: 'all 0.3s', boxShadow: '0 4px 6px rgba(0,0,0,0.02)'
                                }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                                    <div style={{
                                        padding: '0.4rem 0.8rem', backgroundColor: room.isPublic ? '#eefcf5' : '#f1f2ff',
                                        borderRadius: '10px', fontSize: '0.75rem', fontWeight: 800, color: room.isPublic ? '#00b894' : '#8e8ffa',
                                        display: 'flex', alignItems: 'center', gap: '0.4rem'
                                    }}>
                                        {room.isPublic ? <Globe size={14} /> : <Lock size={14} />}
                                        {room.isPublic ? 'PUBLIC' : 'PRIVATE'}
                                    </div>
                                    <div style={{ display: 'flex', marginLeft: '-8px' }}>
                                        <div style={{ width: 28, height: 28, borderRadius: '8px', border: '2px solid white', backgroundColor: '#8e8ffa', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 700 }}>
                                            {room.participants?.length || 1}
                                        </div>
                                    </div>
                                </div>
                                <h4 style={{ margin: '0 0 0.5rem 0', fontWeight: 700, fontSize: '1.1rem' }}>{room.name}</h4>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                                    <img src={room.host?.picture || 'https://via.placeholder.com/150'} style={{ width: 24, height: 24, borderRadius: '50%' }} />
                                    <span style={{ fontSize: '0.8rem', color: '#636e72' }}>by {room.host?.name || 'Unknown'}</span>
                                </div>
                                <div style={{ fontSize: '0.75rem', color: '#b2bec3', fontWeight: 600, marginBottom: '1rem' }}>
                                    {formatDate(room.createdAt)}
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontSize: '0.75rem', color: '#b2bec3', fontWeight: 600 }}>ID: {room.roomId}</span>
                                    <ArrowRight size={18} color="#8e8ffa" />
                                </div>
                            </motion.div>
                        ))}
                    </div>

                    {Array.isArray(activeTab === 'history' ? history : publicRooms) && (activeTab === 'history' ? history : publicRooms).length === 0 && !globalLoading.rooms && (
                        <div style={{ textAlign: 'center', padding: '4rem 0' }}>
                            <p style={{ color: '#b2bec3', fontWeight: 600 }}>No workspaces found here yet.</p>
                        </div>
                    )}

                    {globalLoading.rooms && (activeTab === 'history' ? !history : !publicRooms) && (
                        <div style={{ textAlign: 'center', padding: '4rem 0' }}>
                            <p style={{ color: '#8e8ffa', fontWeight: 600 }}>Loading workspaces...</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Modals */}
            <AnimatePresence>
                {showCreateModal && (
                    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(5px)' }}>
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
                            style={{ backgroundColor: 'white', padding: '3rem', borderRadius: '32px', width: '450px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}
                        >
                            <h2 style={{ fontWeight: 800, margin: '0 0 1rem 0' }}>New Workspace</h2>
                            <p style={{ color: '#636e72', marginBottom: '2rem' }}>Configure your new collaborative drawing session.</p>

                            <form onSubmit={handleCreateRoom}>
                                <div style={{ marginBottom: '1.5rem' }}>
                                    <label style={{ display: 'block', fontWeight: 700, fontSize: '0.9rem', marginBottom: '0.6rem' }}>Board Name</label>
                                    <input
                                        type="text" required placeholder="e.g. Brainstorming UI"
                                        value={newRoomName} onChange={(e) => setNewRoomName(e.target.value)}
                                        style={{ width: '100%', padding: '1rem', borderRadius: '14px', border: '1px solid #edeff2', outline: 'none', transition: '0.2s' }}
                                    />
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem', backgroundColor: '#f9f9ff', borderRadius: '16px', marginBottom: '2rem' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                                        {isPublic ? <Globe size={20} color="#00b894" /> : <Shield size={20} color="#8e8ffa" />}
                                        <div>
                                            <p style={{ margin: 0, fontWeight: 700, fontSize: '0.9rem' }}>Public Board</p>
                                            <p style={{ margin: 0, fontSize: '0.75rem', color: '#636e72' }}>Accessible to anyone</p>
                                        </div>
                                    </div>
                                    <button
                                        type="button" onClick={() => setIsPublic(!isPublic)}
                                        style={{
                                            width: '50px', height: '28px', borderRadius: '15px', position: 'relative',
                                            backgroundColor: isPublic ? '#00b894' : '#dfe6e9', border: 'none', cursor: 'pointer', transition: '0.3s'
                                        }}
                                    >
                                        <div style={{ width: '22px', height: '22px', borderRadius: '50%', backgroundColor: 'white', position: 'absolute', top: '3px', left: isPublic ? '25px' : '3px', transition: '0.3s' }} />
                                    </button>
                                </div>

                                <div style={{ display: 'flex', gap: '1rem' }}>
                                    <button type="button" onClick={() => setShowCreateModal(false)} style={{ flex: 1, padding: '1rem', borderRadius: '14px', border: 'none', backgroundColor: '#f1f2f6', fontWeight: 700, cursor: 'pointer' }}>Cancel</button>
                                    <button type="submit" disabled={loading} style={{ flex: 1, padding: '1rem', borderRadius: '14px', border: 'none', backgroundColor: '#8e8ffa', color: 'white', fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 12px rgba(142,143,250,0.3)' }}>
                                        {loading ? 'Starting...' : 'Launch Board'}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}

                {showJoinModal && (
                    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(5px)' }}>
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
                            style={{ backgroundColor: 'white', padding: '3rem', borderRadius: '32px', width: '450px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}
                        >
                            <h2 style={{ fontWeight: 800, margin: '0 0 1rem 0' }}>Join Workspace</h2>
                            <p style={{ color: '#636e72', marginBottom: '2rem' }}>Enter a room ID shared by your host to enter the session.</p>

                            <form onSubmit={handleJoinRoom}>
                                <div style={{ marginBottom: '2rem' }}>
                                    <label style={{ display: 'block', fontWeight: 700, fontSize: '0.9rem', marginBottom: '0.6rem' }}>Room ID</label>
                                    <input
                                        type="text" required placeholder="e.g. a1b2c3d4"
                                        value={joinRoomId} onChange={(e) => setJoinRoomId(e.target.value)}
                                        style={{ width: '100%', padding: '1rem', borderRadius: '14px', border: '1px solid #edeff2', outline: 'none' }}
                                    />
                                </div>

                                <div style={{ display: 'flex', gap: '1rem' }}>
                                    <button type="button" onClick={() => setShowJoinModal(false)} style={{ flex: 1, padding: '1rem', borderRadius: '14px', border: 'none', backgroundColor: '#f1f2f6', fontWeight: 700, cursor: 'pointer' }}>Cancel</button>
                                    <button type="submit" style={{ flex: 1, padding: '1rem', borderRadius: '14px', border: 'none', backgroundColor: '#8e8ffa', color: 'white', fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 12px rgba(142,143,250,0.3)' }}>
                                        Verify & Enter
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default Dashboard;
