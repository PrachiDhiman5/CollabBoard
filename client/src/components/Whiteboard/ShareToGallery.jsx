import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Share2, Type, Hash } from 'lucide-react';
import { postAPI } from '../../services/api';

const ShareToGallery = ({ isOpen, onClose, canvasRef, user }) => {
    const [caption, setCaption] = useState('');
    const [hashtags, setHashtags] = useState('');
    const [loading, setLoading] = useState(false);

    const handleShare = async () => {
        if (!caption.trim()) return alert("Please add a caption!");

        setLoading(true);
        try {
            const image = canvasRef.current.toDataURL('image/png');
            const hashtagsArray = hashtags.split(' ').filter(h => h.startsWith('#')).map(h => h.slice(1));

            await postAPI.createPost({
                image,
                caption,
                hashtags: hashtagsArray
            });

            alert("Posted to Community Gallery!");
            onClose();
        } catch (err) {
            console.error("Share error detail:", err.response?.data || err.message);
            const errMsg = err.response?.data?.message || "Failed to post. Check image size or connection.";
            alert(errMsg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(10px)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
                        style={{ backgroundColor: 'white', padding: '2.5rem', borderRadius: '32px', width: '100%', maxWidth: '500px', position: 'relative' }}
                    >
                        <button onClick={onClose} style={{ position: 'absolute', top: '20px', right: '20px', border: 'none', background: '#f1f2f6', padding: '8px', borderRadius: '12px', cursor: 'pointer' }}>
                            <X size={20} />
                        </button>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1.5rem' }}>
                            <div style={{ width: 48, height: 48, backgroundColor: '#f1f2ff', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Share2 color="#8e8ffa" size={24} />
                            </div>
                            <h2 style={{ fontWeight: 800, margin: 0 }}>Post your creativity</h2>
                        </div>

                        <div style={{ marginBottom: '1.5rem' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, fontSize: '0.9rem', marginBottom: '0.6rem' }}>
                                <Type size={16} /> Caption
                            </label>
                            <textarea
                                value={caption} onChange={(e) => setCaption(e.target.value)}
                                placeholder="What's this sketch about?"
                                style={{ width: '100%', padding: '1rem', borderRadius: '16px', border: '1px solid #edeff2', resize: 'none', height: '100px', outline: 'none' }}
                            />
                        </div>

                        <div style={{ marginBottom: '2rem' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, fontSize: '0.9rem', marginBottom: '0.6rem' }}>
                                <Hash size={16} /> Hashtags
                            </label>
                            <input
                                value={hashtags} onChange={(e) => setHashtags(e.target.value)}
                                placeholder="#sketch #collab #art"
                                style={{ width: '100%', padding: '1rem', borderRadius: '16px', border: '1px solid #edeff2', outline: 'none' }}
                            />
                        </div>

                        <button
                            onClick={handleShare} disabled={loading}
                            style={{
                                width: '100%', padding: '1rem', backgroundColor: '#8e8ffa', color: 'white',
                                fontWeight: 700, border: 'none', borderRadius: '16px', cursor: 'pointer',
                                boxShadow: '0 4px 14px rgba(142,143,250,0.3)', transition: '0.2s'
                            }}
                        >
                            {loading ? "Posting..." : "Share to Gallery"}
                        </button>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default ShareToGallery;
