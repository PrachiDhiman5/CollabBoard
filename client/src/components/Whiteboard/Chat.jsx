import React, { useState, useEffect, useRef } from 'react';
import { Send, Users, MessageCircle, ChevronRight, ChevronLeft, MicOff, UserMinus, ShieldAlert, Crown, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const Chat = ({ socket, roomId, user, participants, hostId }) => {
    const [isOpen, setIsOpen] = useState(true);
    const [message, setMessage] = useState('');
    const [messages, setMessages] = useState([]);
    const [view, setView] = useState('chat'); // 'chat' or 'people'
    const chatEndRef = useRef(null);
    const isHost = (user.id || user._id) === hostId;

    useEffect(() => {
        if (socket) {
            socket.on('receive-message', (msg) => {
                setMessages((prev) => [...prev, msg]);
            });

            socket.on('host-action-notice', ({ action, targetName }) => {
                setMessages(prev => [...prev, {
                    id: Date.now(),
                    isSystem: true,
                    text: `Host ${action}ed ${targetName}`
                }]);
            });

            socket.on('kicked', () => {
                alert("You have been removed from the room by the host.");
                window.location.href = '/dashboard';
            });
        }
        return () => {
            socket?.off('receive-message');
            socket?.off('host-action-notice');
            socket?.off('kicked');
        };
    }, [socket]);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSend = (e) => {
        e.preventDefault();
        if (message.trim()) {
            const msgData = {
                id: Date.now(),
                text: message,
                name: user.name,
                picture: user.picture,
                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                roomId
            };
            socket.emit('send-message', msgData);
            setMessage('');
        }
    };

    const handleHostAction = (action, targetId, targetName) => {
        if (!isHost) return;
        if (window.confirm(`Are you sure you want to ${action} ${targetName}?`)) {
            socket.emit('host-action', { roomId, action, targetId, targetName });
        }
    };

    return (
        <div style={{
            position: 'relative',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            zIndex: 500,
            // Move transition to outer container for smoother canvas resizing
            width: isOpen ? '400px' : '0px',
            transition: 'width 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
            overflow: 'visible' // Ensure arrow is visible when closed
        }}>
            {!isOpen && (
                <button
                    onClick={() => setIsOpen(true)}
                    title="Open Chat"
                    style={{
                        position: 'absolute',
                        right: '10px', // Adjusted to be near edge
                        width: '40px', height: '40px',
                        backgroundColor: 'white', border: '1px solid #edeff2',
                        borderRadius: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        boxShadow: '0 8px 30px rgba(0,0,0,0.12)', zIndex: 101,
                        color: '#636e72',
                        transition: 'all 0.3s'
                    }}
                    onMouseOver={(e) => {
                        e.currentTarget.style.color = '#8e8ffa';
                        e.currentTarget.style.transform = 'scale(1.1)';
                    }}
                    onMouseOut={(e) => {
                        e.currentTarget.style.color = '#636e72';
                        e.currentTarget.style.transform = 'scale(1)';
                    }}
                >
                    <ChevronLeft size={20} />
                </button>
            )}

            <div style={{
                width: '360px',
                height: 'calc(100% - 40px)',
                margin: '0 20px',
                border: '1px solid #edeff2',
                borderRadius: '24px',
                boxShadow: '0 10px 40px rgba(0,0,0,0.08)',
                backgroundColor: 'white',
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                zIndex: 100,
                flexShrink: 0,
                overflow: 'hidden',
                // Handle inner content visibility during close
                opacity: isOpen ? 1 : 0,
                transform: `translateX(${isOpen ? '0' : '20px'})`,
                pointerEvents: isOpen ? 'all' : 'none',
                transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)'
            }}>
                <AnimatePresence>
                    {isOpen && (
                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '360px' }}
                        >
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                borderBottom: '1px solid #edeff2',
                                padding: '0 12px'
                            }}>
                                <div style={{ display: 'flex', flex: 1, height: '60px' }}>
                                    <button
                                        onClick={() => setView('chat')}
                                        style={{
                                            flex: 1, padding: '0 8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                                            border: 'none', background: 'none', cursor: 'pointer',
                                            fontWeight: 700, color: view === 'chat' ? '#8e8ffa' : '#b2bec3',
                                            borderBottom: `3px solid ${view === 'chat' ? '#8e8ffa' : 'transparent'}`,
                                            transition: '0.2s', fontSize: '0.95rem'
                                        }}
                                    >
                                        <MessageCircle size={18} /> Chat
                                    </button>
                                    <button
                                        onClick={() => setView('people')}
                                        style={{
                                            flex: 1, padding: '0 8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                                            border: 'none', background: 'none', cursor: 'pointer',
                                            fontWeight: 700, color: view === 'people' ? '#8e8ffa' : '#b2bec3',
                                            borderBottom: `3px solid ${view === 'people' ? '#8e8ffa' : 'transparent'}`,
                                            transition: '0.2s', fontSize: '0.95rem'
                                        }}
                                    >
                                        <Users size={18} /> People ({participants.length})
                                    </button>
                                </div>
                                <button
                                    onClick={() => setIsOpen(false)}
                                    title="Close Chat"
                                    style={{
                                        width: '36px', height: '36px',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        border: 'none', background: 'none', cursor: 'pointer',
                                        color: '#b2bec3', borderRadius: '50%',
                                        marginLeft: '8px'
                                    }}
                                    onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f1f2f6'}
                                    onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem' }}>
                                {view === 'chat' ? (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                        {messages.map((msg) => (
                                            msg.isSystem ? (
                                                <div key={msg.id} style={{ textAlign: 'center' }}>
                                                    <span style={{ fontSize: '0.75rem', backgroundColor: '#f1f2f6', color: '#636e72', padding: '4px 12px', borderRadius: '10px', fontWeight: 600 }}>
                                                        {msg.text}
                                                    </span>
                                                </div>
                                            ) : (
                                                <div key={msg.id} style={{ alignSelf: msg.name === user.name ? 'flex-end' : 'flex-start', maxWidth: '85%' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexDirection: msg.name === user.name ? 'row-reverse' : 'row' }}>
                                                        <img src={msg.picture || 'https://via.placeholder.com/150'} style={{ width: 22, height: 22, borderRadius: '50%' }} />
                                                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#2d3436' }}>{msg.name === user.name ? 'You' : msg.name}</span>
                                                        <span style={{ fontSize: '0.65rem', color: '#b2bec3' }}>{msg.time}</span>
                                                    </div>
                                                    <div style={{
                                                        padding: '10px 14px', borderRadius: '18px',
                                                        backgroundColor: msg.name === user.name ? '#8e8ffa' : '#f1f2f6',
                                                        color: msg.name === user.name ? 'white' : '#2d3436',
                                                        fontSize: '0.9rem', lineHeight: '1.4',
                                                        boxShadow: msg.name === user.name ? '0 4px 12px rgba(142,143,250,0.2)' : 'none',
                                                        borderBottomRightRadius: msg.name === user.name ? '4px' : '18px',
                                                        borderBottomLeftRadius: msg.name === user.name ? '18px' : '4px'
                                                    }}>
                                                        {msg.text}
                                                    </div>
                                                </div>
                                            )
                                        ))}
                                        <div ref={chatEndRef} />
                                    </div>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                        {participants.map((p) => (
                                            <div key={p.socketId} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px', borderRadius: '16px', backgroundColor: '#fdfbff', border: '1px solid #f1f2f6' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                    <div style={{ position: 'relative' }}>
                                                        <motion.div
                                                            animate={{ scale: [1, 1.2, 1] }}
                                                            transition={{ repeat: Infinity, duration: 2 }}
                                                            style={{
                                                                position: 'absolute', inset: -4, borderRadius: '14px',
                                                                border: '2px solid #8e8ffa', opacity: p.userId === hostId ? 0.3 : 0
                                                            }}
                                                        />
                                                        <img src={p.picture || 'https://via.placeholder.com/150'} style={{ width: 36, height: 36, borderRadius: '12px', position: 'relative' }} />
                                                        {p.userId === hostId && <div style={{ position: 'absolute', top: '-10px', right: '-10px', background: '#f9ca24', borderRadius: '50%', padding: '2px', zIndex: 1 }}><Crown size={12} color="white" /></div>}
                                                    </div>
                                                    <div>
                                                        <p style={{ fontWeight: 700, fontSize: '0.9rem', color: '#2d3436', margin: 0 }}>{p.name}</p>
                                                        <p style={{ fontSize: '0.7rem', color: '#00b894', margin: 0, fontWeight: 600 }}>Online</p>
                                                    </div>
                                                </div>

                                                {isHost && p.socketId !== socket.id && (
                                                    <div style={{ display: 'flex', gap: '6px' }}>
                                                        <button onClick={() => handleHostAction('mute', p.socketId, p.name)} style={{ padding: '6px', borderRadius: '8px', border: 'none', backgroundColor: '#f1f2f6', cursor: 'pointer' }}><MicOff size={14} color="#636e72" /></button>
                                                        <button onClick={() => handleHostAction('kick', p.socketId, p.name)} style={{ padding: '6px', borderRadius: '8px', border: 'none', backgroundColor: '#fff0f0', cursor: 'pointer' }}><UserMinus size={14} color="#ff7675" /></button>
                                                        <button onClick={() => handleHostAction('block', p.socketId, p.name)} style={{ padding: '6px', borderRadius: '8px', border: 'none', backgroundColor: '#2d3436', cursor: 'pointer' }}><ShieldAlert size={14} color="white" /></button>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {view === 'chat' && (
                                <form onSubmit={handleSend} style={{ padding: '1.5rem', borderTop: '1px solid #edeff2', display: 'flex', gap: '10px', alignItems: 'center' }}>
                                    <input
                                        value={message} onChange={(e) => setMessage(e.target.value)}
                                        placeholder="Message room..."
                                        style={{
                                            flex: 1, padding: '12px 18px', borderRadius: '16px', border: '1px solid #edeff2',
                                            outline: 'none', fontSize: '0.9rem', backgroundColor: '#fcfcfe'
                                        }}
                                    />
                                    <motion.button
                                        whileTap={{ scale: 0.9 }} type="submit"
                                        style={{
                                            width: '46px', height: '46px', backgroundColor: '#8e8ffa', color: 'white',
                                            borderRadius: '16px', border: 'none', display: 'flex', alignItems: 'center',
                                            justifyContent: 'center', cursor: 'pointer'
                                        }}
                                    >
                                        <Send size={20} />
                                    </motion.button>
                                </form>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};

export default Chat;
