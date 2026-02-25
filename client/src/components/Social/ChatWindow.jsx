import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, Circle } from 'lucide-react';
import { chatAPI } from '../../services/api';

const ChatWindow = ({ friend, socket, onClose }) => {
    const [messages, setMessages] = useState([]);
    const [newMsg, setNewMsg] = useState('');
    const [isOnline, setIsOnline] = useState(false);
    const scrollRef = useRef();

    const user = JSON.parse(sessionStorage.getItem('user') || '{}');

    useEffect(() => {
        fetchHistory();

        if (socket) {
            socket.on('private-message', (msg) => {
                if (msg.from === friend._id) {
                    setMessages(prev => [...prev, msg]);
                }
            });

            socket.on('user-status', ({ userId, status }) => {
                if (userId === friend._id) {
                    setIsOnline(status === 'online');
                }
            });
        }

        return () => {
            if (socket) {
                socket.off('private-message');
                socket.off('user-status');
            }
        };
    }, [friend, socket]);

    useEffect(() => {
        scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const fetchHistory = async () => {
        try {
            const res = await chatAPI.getHistory(friend._id);
            setMessages(res.data);
        } catch (err) {
            console.error(err);
        }
    };

    const handleSend = (e) => {
        e.preventDefault();
        if (!newMsg.trim()) return;

        const msgData = {
            to: friend._id,
            text: newMsg,
            fromName: user.name,
            fromPicture: user.picture
        };

        socket.emit('private-message', msgData);
        setMessages(prev => [...prev, { ...msgData, from: user.id || user._id, createdAt: new Date() }]);
        setNewMsg('');
    };

    return (
        <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            style={{
                position: 'fixed', bottom: 20, right: 20,
                width: 350, height: 450, backgroundColor: 'white',
                borderRadius: '30px', boxShadow: '0 10px 40px rgba(0,0,0,0.15)',
                display: 'flex', flexDirection: 'column', overflow: 'hidden', zIndex: 2000
            }}
        >
            {/* Header */}
            <div style={{ padding: '15px 20px', backgroundColor: '#8e8ffa', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ position: 'relative' }}>
                        <img src={friend.picture || `https://api.dicebear.com/7.x/lorelei/svg?seed=${friend.name}`} style={{ width: 35, height: 35, borderRadius: '12px' }} />
                        <Circle size={10} fill={isOnline ? '#00b894' : '#dfe6e9'} color="white" style={{ position: 'absolute', bottom: -2, right: -2 }} />
                    </div>
                    <div>
                        <p style={{ margin: 0, fontWeight: 700, fontSize: '0.9rem' }}>{friend.name}</p>
                        <p style={{ margin: 0, fontSize: '0.7rem', opacity: 0.8 }}>{isOnline ? 'Active Now' : 'Offline'}</p>
                    </div>
                </div>
                <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}><X size={20} /></button>
            </div>

            {/* Messages */}
            <div style={{ flex: 1, padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '15px' }}>
                {messages.map((m, i) => {
                    const isMe = m.from === (user.id || user._id);
                    return (
                        <div key={i} style={{
                            alignSelf: isMe ? 'flex-end' : 'flex-start',
                            maxWidth: '80%',
                            padding: '12px 16px',
                            backgroundColor: isMe ? '#8e8ffa' : '#f1f2f6',
                            color: isMe ? 'white' : '#2d3436',
                            borderRadius: '18px',
                            borderBottomRightRadius: isMe ? 4 : 18,
                            borderBottomLeftRadius: isMe ? 18 : 4,
                            fontSize: '0.85rem',
                            fontWeight: 600
                        }}>
                            {m.text}
                        </div>
                    );
                })}
                <div ref={scrollRef} />
            </div>

            {/* Input */}
            <form onSubmit={handleSend} style={{ padding: '20px', borderTop: '1px solid #f1f2f6', display: 'flex', gap: '10px' }}>
                <input
                    placeholder="Type a message..."
                    value={newMsg} onChange={(e) => setNewMsg(e.target.value)}
                    style={{ flex: 1, border: 'none', backgroundColor: '#f1f2f6', padding: '12px 18px', borderRadius: '15px', outline: 'none', fontSize: '0.85rem' }}
                />
                <button style={{ border: 'none', background: '#8e8ffa', color: 'white', padding: '10px', borderRadius: '12px', cursor: 'pointer' }}>
                    <Send size={18} />
                </button>
            </form>
        </motion.div>
    );
};

export default ChatWindow;
