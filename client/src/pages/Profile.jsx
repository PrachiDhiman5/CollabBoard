import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    User, Settings, Shield, Globe, Lock, History,
    Trophy, Bell, UserPlus, MessageCircle, ArrowLeft,
    Check, X, Users, Zap
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { profileAPI, SOCKET_URL } from '../services/api';
import { useData } from '../context/DataContext';
import confetti from 'canvas-confetti';
import { io } from 'socket.io-client';
import ChatWindow from '../components/Social/ChatWindow';

const Profile = () => {
    const { profileData, fetchProfileData, refreshProfile, loading: globalLoading, notifications, friends, suggestedFriends } = useData();
    const stats = profileData?.stats || null;
    const suggestions = suggestedFriends || [];
    // notifications and friends are now provided directly by context too
    const [activeChat, setActiveChat] = useState(null);
    const [socket, setSocket] = useState(null);
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const user = JSON.parse(sessionStorage.getItem('user') || '{}');

    useEffect(() => {
        if (stats?.isTrending) {
            confetti({
                particleCount: 150,
                spread: 70,
                origin: { y: 0.6 },
                colors: ['#ffd700', '#f9ca24', '#ffffff']
            });
        }
    }, [stats?.isTrending]);

    useEffect(() => {
        // fetchProfileData is now handled by the global boot() in DataContext

        const newSocket = io(SOCKET_URL);
        setSocket(newSocket);

        newSocket.on('connect', () => {
            newSocket.emit('register-user', user.id || user._id);
        });

        // Real-time notification listener
        newSocket.on('notification', () => {
            refreshProfile(); // Trigger a data refresh when a notification arrives
        });

        const interval = setInterval(refreshProfile, 30000); // Background polling every 30s

        return () => {
            newSocket.close();
            clearInterval(interval);
        };
    }, [fetchProfileData]);

    const handleFriendRequest = async (userId) => {
        try {
            await profileAPI.sendFriendRequest(userId);
            refreshProfile(); // Update global state
        } catch (err) {
            console.error(err);
        }
    };

    const handleResponse = async (requestId, action) => {
        try {
            await profileAPI.respondToFriendRequest(requestId, action);
            refreshProfile(); // Update global state
        } catch (err) {
            console.error(err);
        }
    };

    if (globalLoading.boot && !stats) return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#fdfbff' }}>
            <div style={{ textAlign: 'center' }}>
                <h2 style={{ color: '#8e8ffa', fontWeight: 900 }}>Fast-Tracking...</h2>
                <p style={{ color: '#b2bec3', fontWeight: 700 }}>Mega-Boot in progress</p>
            </div>
        </div>
    );

    return (
        <div style={{ backgroundColor: '#fdfbff', minHeight: '100vh', padding: '2rem' }}>
            {/* Header */}
            <nav style={{ maxWidth: '1200px', margin: '0 auto 3rem auto', display: 'flex', alignItems: 'center', gap: '2rem' }}>
                <button onClick={() => navigate('/dashboard')} style={{ border: 'none', background: '#f1f2ff', padding: '12px', borderRadius: '15px', cursor: 'pointer', color: '#8e8ffa' }}>
                    <ArrowLeft size={24} />
                </button>
                <h1 style={{ fontWeight: 900, fontSize: '2rem', color: '#2d3436', margin: 0 }}>My Profile</h1>
            </nav>

            <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'grid', gridTemplateColumns: '400px 1fr', gap: '3rem' }}>

                {/* Left Column: Stats Card */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                    <div style={{ backgroundColor: 'white', padding: '3rem 2rem', borderRadius: '40px', border: '1px solid #f1f2f6', boxShadow: '0 20px 40px rgba(0,0,0,0.03)', textAlign: 'center' }}>
                        <div style={{ width: 120, height: 120, borderRadius: '40px', overflow: 'hidden', margin: '0 auto 1.5rem auto', border: '5px solid #f1f2ff' }}>
                            <img src={user.picture || `https://api.dicebear.com/7.x/lorelei/svg?seed=${user.name}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        </div>
                        <h2 style={{ margin: '0 0 0.5rem 0', fontWeight: 800 }}>{user.name}</h2>
                        <p style={{ color: '#b2bec3', fontWeight: 600, margin: '0 0 2rem 0' }}>{user.email}</p>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', borderTop: '1px solid #f1f2f6', paddingTop: '2rem' }}>
                            <div>
                                <h4 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 900, color: '#8e8ffa' }}>{stats?.totalRooms || 0}</h4>
                                <p style={{ margin: 0, fontSize: '0.8rem', color: '#b2bec3', fontWeight: 700 }}>ROOMS</p>
                            </div>
                            <div>
                                <h4 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 900, color: '#00b894' }}>{stats?.publicRoomsCount || 0}</h4>
                                <p style={{ margin: 0, fontSize: '0.8rem', color: '#b2bec3', fontWeight: 700 }}>PUBLIC</p>
                            </div>
                        </div>
                    </div>

                    {/* Achievement Section */}
                    {stats?.isTrending && (
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                            style={{ backgroundColor: '#fff9e6', padding: '2rem', borderRadius: '32px', border: '2px solid #f9ca24', display: 'flex', alignItems: 'center', gap: '1.5rem' }}
                        >
                            <div style={{ background: '#f9ca24', padding: '15px', borderRadius: '18px', color: 'white' }}>
                                <Trophy size={32} />
                            </div>
                            <div>
                                <h3 style={{ margin: 0, fontWeight: 900, color: '#d4af37' }}>Congratulations!</h3>
                                <p style={{ margin: 0, fontWeight: 700, color: '#8b6508', fontSize: '0.9rem' }}>Your post is #1 Trending right now.</p>
                            </div>
                        </motion.div>
                    )}

                    {/* Private Rooms List */}
                    <div style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '32px', border: '1px solid #f1f2f6' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1.5rem' }}>
                            <Lock size={20} color="#8e8ffa" />
                            <h3 style={{ margin: 0, fontWeight: 800 }}>Private Workspaces</h3>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {Array.isArray(stats?.privateRooms) && stats.privateRooms.length > 0 ? (
                                stats.privateRooms.map(room => (
                                    <div key={room.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 18px', background: '#f8f9fe', borderRadius: '16px' }}>
                                        <div>
                                            <p style={{ margin: 0, fontWeight: 700, fontSize: '0.9rem' }}>{room.name}</p>
                                            <p style={{ margin: 0, fontSize: '0.75rem', color: '#b2bec3' }}>ID: {room.id}</p>
                                        </div>
                                        <History size={16} color="#b2bec3" />
                                    </div>
                                ))
                            ) : (
                                <p style={{ color: '#b2bec3', fontSize: '0.85rem', textAlign: 'center' }}>No private rooms yet.</p>
                            )}
                        </div>
                    </div>

                    {/* Friends Section */}
                    <div style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '32px', border: '1px solid #f1f2f6' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1.5rem' }}>
                            <Users size={20} color="#8e8ffa" />
                            <h3 style={{ margin: 0, fontWeight: 800 }}>Friends</h3>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {Array.isArray(friends) && friends.length > 0 ? (
                                friends.map(friend => (
                                    <div key={friend._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px 20px', background: '#f8f9fe', borderRadius: '20px', border: '1px solid #edeff2', transition: '0.3s' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                            <div style={{ position: 'relative' }}>
                                                <img src={friend.picture || `https://api.dicebear.com/7.x/lorelei/svg?seed=${friend.name}`} style={{ width: 45, height: 45, borderRadius: '15px', border: '2px solid white', boxShadow: '0 4px 8px rgba(0,0,0,0.05)' }} />
                                                <div style={{ position: 'absolute', bottom: -2, right: -2, width: 12, height: 12, borderRadius: '50%', backgroundColor: '#00b894', border: '2px solid white' }}></div>
                                            </div>
                                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                <span style={{ fontWeight: 800, fontSize: '1rem', color: '#2d3436' }}>{friend.name}</span>
                                                <span style={{ fontSize: '0.7rem', color: '#b2bec3', fontWeight: 600 }}>Active Now</span>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => setActiveChat(friend)}
                                            style={{
                                                background: 'white', color: '#8e8ffa', border: '2px solid #f1f2ff',
                                                padding: '10px', borderRadius: '14px', cursor: 'pointer', transition: '0.2s',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center'
                                            }}
                                            onMouseOver={(e) => { e.target.style.background = '#8e8ffa'; e.target.style.color = 'white'; }}
                                            onMouseOut={(e) => { e.target.style.background = 'white'; e.target.style.color = '#8e8ffa'; }}
                                        >
                                            <MessageCircle size={20} />
                                        </button>
                                    </div>
                                ))
                            ) : (
                                <p style={{ color: '#b2bec3', fontSize: '0.85rem', textAlign: 'center' }}>No friends yet. Add some!</p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Right Column: Social & Discovery */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '3rem' }}>

                    {/* Notifications */}
                    <section>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1.5rem' }}>
                            <Bell size={24} color="#ff7675" />
                            <h2 style={{ margin: 0, fontWeight: 900 }}>Notifications</h2>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {Array.isArray(notifications) && notifications.length > 0 ? (
                                notifications.map(n => (
                                    <div key={n._id} style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', padding: '1.5rem', backgroundColor: 'white', borderRadius: '24px', border: '1px solid #f1f2f6', boxShadow: '0 4px 6px rgba(0,0,0,0.02)' }}>
                                        <div style={{ width: 45, height: 45, borderRadius: '14px', backgroundColor: '#f1f2ff', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                                            <img src={`https://api.dicebear.com/7.x/lorelei/svg?seed=${n.fromName}`} style={{ width: '100%', height: '100%' }} />
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <p style={{ margin: 0, fontWeight: 700, color: '#2d3436' }}>
                                                {n.text}
                                            </p>
                                            <span style={{ fontSize: '0.75rem', color: '#b2bec3', fontWeight: 600 }}>{new Date(n.createdAt).toLocaleDateString()}</span>
                                        </div>
                                        {n.type === 'friend_request' && (
                                            <div style={{ display: 'flex', gap: '8px' }}>
                                                <button
                                                    onClick={() => handleResponse(n.from._id || n.from, 'accept')}
                                                    style={{ border: 'none', background: '#eefcf5', color: '#00b894', padding: '10px', borderRadius: '12px', cursor: 'pointer', transition: '0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                                    onMouseOver={(e) => e.target.style.background = '#dff9e9'}
                                                    onMouseOut={(e) => e.target.style.background = '#eefcf5'}
                                                >
                                                    <Check size={20} />
                                                </button>
                                                <button
                                                    onClick={() => handleResponse(n.from._id || n.from, 'reject')}
                                                    style={{ border: 'none', background: '#fff5f5', color: '#ff7675', padding: '10px', borderRadius: '12px', cursor: 'pointer', transition: '0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                                    onMouseOver={(e) => e.target.style.background = '#ffe5e5'}
                                                    onMouseOut={(e) => e.target.style.background = '#fff5f5'}
                                                >
                                                    <X size={20} />
                                                </button>
                                            </div>
                                        )}
                                        {n.type === 'friend_request_resolved' && (
                                            <span style={{ backgroundColor: '#f1f2ff', color: '#8e8ffa', padding: '6px 14px', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 800 }}>
                                                Resolved
                                            </span>
                                        )}
                                    </div>
                                ))
                            ) : (
                                <p style={{ color: '#b2bec3', fontWeight: 600 }}>Clear as a summer sky ☀️</p>
                            )}
                        </div>
                    </section>

                    {/* Friend Discovery */}
                    <section>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <Zap size={24} color="#f9ca24" />
                                <h2 style={{ margin: 0, fontWeight: 900 }}>Suggested Friends</h2>
                            </div>
                            <span style={{ backgroundColor: '#f1f2ff', color: '#8e8ffa', padding: '6px 14px', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 800 }}>From Latest Room</span>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '1.5rem' }}>
                            {Array.isArray(suggestions) && suggestions.length > 0 ? (
                                suggestions.map(person => (
                                    <div key={person._id} style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '28px', border: '1px solid #f1f2f6', textAlign: 'center' }}>
                                        <img src={person.picture || `https://api.dicebear.com/7.x/lorelei/svg?seed=${person.name}`} style={{ width: 60, height: 60, borderRadius: '20px', marginBottom: '1rem' }} />
                                        <h4 style={{ margin: '0 0 1rem 0', fontWeight: 800 }}>{person.name}</h4>
                                        <button
                                            onClick={() => handleFriendRequest(person._id)}
                                            disabled={person.requestStatus === 'pending'}
                                            style={{
                                                width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                                                padding: '12px', borderRadius: '15px', border: 'none',
                                                backgroundColor: person.requestStatus === 'pending' ? '#f1f2f6' : '#8e8ffa',
                                                color: person.requestStatus === 'pending' ? '#b2bec3' : 'white',
                                                fontWeight: 700, cursor: person.requestStatus === 'pending' ? 'default' : 'pointer',
                                                transition: '0.3s'
                                            }}
                                        >
                                            {person.requestStatus === 'pending' ? (
                                                <>Request Sent</>
                                            ) : (
                                                <><UserPlus size={18} /> Add Friend</>
                                            )}
                                        </button>
                                    </div>
                                ))
                            ) : (
                                <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '2rem', backgroundColor: '#f8f9fe', borderRadius: '24px', border: '1px dashed #edeff2' }}>
                                    <Users size={32} color="#b2bec3" style={{ marginBottom: '10px', opacity: 0.5 }} />
                                    <p style={{ margin: 0, color: '#b2bec3', fontWeight: 600 }}>No new suggestions from your recent rooms.</p>
                                </div>
                            )}
                        </div>
                    </section>
                </div>
            </div>

            {/* Chat Window Popup */}
            <AnimatePresence>
                {activeChat && (
                    <ChatWindow
                        friend={activeChat}
                        socket={socket}
                        onClose={() => setActiveChat(null)}
                    />
                )}
            </AnimatePresence>
        </div>
    );
};

export default Profile;
