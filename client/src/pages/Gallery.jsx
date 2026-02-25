import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, MessageCircle, Share2, ThumbsDown, TrendingUp, Hash, ArrowLeft, Trophy, Crown, Star } from 'lucide-react';
import { postAPI } from '../services/api';
import { useNavigate } from 'react-router-dom';
import confetti from 'canvas-confetti';

const Gallery = () => {
    const [posts, setPosts] = useState([]);
    const [trending, setTrending] = useState({ trendingPost: null, topHashtags: [] });
    const [leaderboard, setLeaderboard] = useState([]);
    const navigate = useNavigate();
    const user = JSON.parse(localStorage.getItem('user') || '{}');

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 30000); // Poll every 30s
        return () => clearInterval(interval);
    }, []);

    const fetchData = async () => {
        try {
            const [postsRes, trendingRes, leaderRes] = await Promise.all([
                postAPI.getPosts(),
                postAPI.getTrending(),
                postAPI.getLeaderboard()
            ]);
            setPosts(postsRes.data.posts || []); // Fix: Handle paginated response
            setTrending(trendingRes.data);
            setLeaderboard(leaderRes.data);
        } catch (err) {
            console.error("Gallery fetch error", err);
        }
    };

    const handleAction = async (id, action) => {
        try {
            if (action === 'like') await postAPI.likePost(id);
            else if (action === 'dislike') await postAPI.dislikePost(id);
            fetchData();
        } catch (err) {
            console.error("Action error", err);
        }
    };

    const triggerConfetti = () => {
        confetti({
            particleCount: 150,
            spread: 70,
            origin: { y: 0.6 },
            colors: ['#8e8ffa', '#ff7675', '#f9ca24']
        });
    };

    return (
        <div style={{ backgroundColor: '#fcfaff', minHeight: '100vh', paddingBottom: '5rem' }}>
            {/* Nav */}
            <nav style={{ padding: '1.2rem 4rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #f1f2f6', backgroundColor: 'rgba(255,255,255,0.8)', backdropFilter: 'blur(20px)', position: 'sticky', top: 0, zIndex: 100 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
                    <button onClick={() => navigate('/dashboard')} style={{ border: 'none', background: '#f1f2ff', padding: '10px', borderRadius: '12px', cursor: 'pointer', color: '#8e8ffa' }}>
                        <ArrowLeft size={20} />
                    </button>
                    <h1 style={{ fontWeight: 800, color: '#2d3436', margin: 0, fontSize: '1.4rem' }}>Explore Creativity</h1>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <div style={{ padding: '8px 16px', borderRadius: '12px', background: '#f1f2ff', color: '#8e8ffa', fontWeight: 700, fontSize: '0.9rem' }}>
                        Community Feed
                    </div>
                </div>
            </nav>

            <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '2rem 4rem' }}>

                {/* Hero Spotlight */}
                {trending.trendingPost && (
                    <motion.div
                        initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}
                        style={{ position: 'relative', height: '450px', borderRadius: '40px', overflow: 'hidden', marginBottom: '4rem', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.1)' }}
                    >
                        <img src={trending.trendingPost.image} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.8) 0%, transparent 60%)' }}></div>

                        <div style={{ position: 'absolute', bottom: '40px', left: '40px', right: '40px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                            <div>
                                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '8px 16px', background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(10px)', borderRadius: '100px', color: 'white', fontWeight: 700, fontSize: '0.8rem', marginBottom: '1rem', border: '1px solid rgba(255,255,255,0.3)' }}>
                                    <Trophy size={14} color="#f9ca24" /> #1 TRENDING
                                </div>
                                <h2 style={{ color: 'white', fontSize: '2.5rem', fontWeight: 900, margin: 0 }}>{trending.trendingPost.caption}</h2>
                                <p style={{ color: 'rgba(255,255,255,0.7)', fontWeight: 600, marginTop: '10px' }}>by {trending.trendingPost.userName}</p>
                            </div>
                            <button
                                onClick={triggerConfetti}
                                style={{ padding: '16px 32px', borderRadius: '20px', background: '#8e8ffa', color: 'white', border: 'none', fontWeight: 800, cursor: 'pointer', boxShadow: '0 10px 20px rgba(142,143,250,0.4)' }}
                            >
                                Celebrate Artist 🎉
                            </button>
                        </div>
                    </motion.div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '3rem' }}>

                    {/* Main Feed */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '2rem', alignContent: 'start' }}>
                        <h3 style={{ gridColumn: '1/-1', fontWeight: 800, fontSize: '1.4rem', color: '#2d3436', marginBottom: '0.5rem' }}>Recent Creations</h3>

                        {/* Share Creativity Card */}
                        <div style={{ gridColumn: '1/-1' }}>
                            <CreatePostCard onRefresh={fetchData} user={user} />
                        </div>

                        {posts.map(post => (
                            <PostCard key={post._id} post={post} onAction={handleAction} currentUser={user} onRefresh={fetchData} />
                        ))}
                    </div>

                    {/* Sidebar */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>

                        {/* Leaderboard Card */}
                        <div style={{ background: 'white', padding: '2rem', borderRadius: '32px', border: '1px solid #f1f2f6', boxShadow: '0 10px 30px rgba(0,0,0,0.03)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1.5rem' }}>
                                <Crown size={22} color="#f9ca24" />
                                <h3 style={{ margin: 0, fontWeight: 800 }}>Top Contributors</h3>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                {leaderboard.map((leader, i) => (
                                    <div key={leader._id} onClick={triggerConfetti} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', padding: '10px', borderRadius: '16px', transition: '0.2s' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            <div style={{ position: 'relative' }}>
                                                <img src={leader.userPicture || `https://api.dicebear.com/7.x/lorelei/svg?seed=${encodeURIComponent(leader.userName || 'Artist')}`} style={{ width: 40, height: 40, borderRadius: '12px', objectFit: 'cover' }} />
                                                {i === 0 && <Trophy size={14} color="#f9ca24" style={{ position: 'absolute', top: -5, right: -5, background: 'white', borderRadius: '50%', padding: '2px' }} />}
                                            </div>
                                            <div>
                                                <p style={{ margin: 0, fontWeight: 700, fontSize: '0.9rem' }}>{leader.userName}</p>
                                                <p style={{ margin: 0, fontSize: '0.75rem', color: '#b2bec3', fontWeight: 600 }}>{leader.postCount} posts</p>
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#8e8ffa', fontWeight: 800, fontSize: '0.9rem' }}>
                                            <Heart size={14} fill="#8e8ffa" /> {leader.totalLikes}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Trending Hashtags */}
                        <div style={{ background: 'white', padding: '2rem', borderRadius: '32px', border: '1px solid #f1f2f6', boxShadow: '0 10px 30px rgba(0,0,0,0.03)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1.5rem' }}>
                                <Hash size={22} color="#8e8ffa" />
                                <h3 style={{ margin: 0, fontWeight: 800 }}>Trending Tags</h3>
                            </div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                                {trending.topHashtags.map(tag => (
                                    <div key={tag._id} style={{ padding: '10px 16px', background: '#f8f9fe', borderRadius: '14px', border: '1px solid #f1f2f6', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <span style={{ fontWeight: 800, fontSize: '0.85rem', color: '#8e8ffa' }}>#{tag._id}</span>
                                        <span style={{ fontSize: '0.75rem', color: '#b2bec3', fontWeight: 600 }}>{tag.count}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                    </div>
                </div>
            </div>
        </div>
    );
};

const CreatePostCard = ({ onRefresh, user }) => {
    const [image, setImage] = useState('');
    const [caption, setCaption] = useState('');
    const [hashtags, setHashtags] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!image || !caption) return alert("Image URL and Caption are required");

        setLoading(true);
        try {
            const tagsArr = hashtags.split(' ').map(t => t.replace('#', '')).filter(t => t);
            await postAPI.createPost({ image, caption, hashtags: tagsArr });
            setImage('');
            setCaption('');
            setHashtags('');
            onRefresh();
            confetti({
                particleCount: 100,
                spread: 70,
                origin: { y: 0.6 }
            });
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ backgroundColor: 'white', padding: '2.5rem', borderRadius: '40px', border: '1px solid #f1f2f6', boxShadow: '0 20px 40px rgba(0,0,0,0.03)', marginBottom: '3rem' }}>
            <div style={{ display: 'flex', gap: '2.5rem' }}>
                <div style={{ width: '180px', height: '180px', backgroundColor: '#fcfaff', borderRadius: '30px', border: '2px dashed #e1e2ff', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                    {image ? (
                        <img src={image} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                        <div style={{ textAlign: 'center', color: '#b2bec3' }}>
                            <Share2 size={32} style={{ marginBottom: '10px', opacity: 0.5 }} />
                            <p style={{ fontSize: '0.75rem', fontWeight: 700, margin: 0 }}>Preview</p>
                        </div>
                    )}
                </div>

                <form onSubmit={handleSubmit} style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <h3 style={{ margin: 0, fontWeight: 900, fontSize: '1.4rem', color: '#2d3436' }}>Share your creativity ✨</h3>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <input
                            placeholder="Paste drawing image URL..."
                            value={image} onChange={(e) => setImage(e.target.value)}
                            style={{ padding: '12px 20px', borderRadius: '16px', border: '1px solid #f1f2f6', outline: 'none', backgroundColor: '#fcfaff', fontSize: '0.9rem' }}
                        />
                        <input
                            placeholder="Add hashtags (e.g. #art #cool)..."
                            value={hashtags} onChange={(e) => setHashtags(e.target.value)}
                            style={{ padding: '12px 20px', borderRadius: '16px', border: '1px solid #f1f2f6', outline: 'none', backgroundColor: '#fcfaff', fontSize: '0.9rem' }}
                        />
                    </div>

                    <input
                        placeholder="Write a catchy caption..."
                        value={caption} onChange={(e) => setCaption(e.target.value)}
                        style={{ padding: '12px 20px', borderRadius: '16px', border: '1px solid #f1f2f6', outline: 'none', backgroundColor: '#fcfaff', fontSize: '0.9rem' }}
                    />

                    <button
                        type="submit" disabled={loading}
                        style={{ alignSelf: 'flex-start', padding: '12px 30px', backgroundColor: '#8e8ffa', color: 'white', borderRadius: '16px', border: 'none', fontWeight: 800, cursor: 'pointer', boxShadow: '0 10px 20px rgba(142,143,250,0.3)' }}
                    >
                        {loading ? 'Posting...' : 'Post to Gallery'}
                    </button>
                </form>
            </div>
        </div>
    );
};

const PostCard = ({ post, onAction, currentUser, onRefresh }) => {
    const [comment, setComment] = useState('');
    const [showComments, setShowComments] = useState(false);

    const hasLiked = post.likes.includes(currentUser.id);
    const hasDisliked = post.dislikes.includes(currentUser.id);

    return (
        <motion.div
            whileHover={{ y: -5 }}
            style={{ backgroundColor: 'white', borderRadius: '32px', overflow: 'hidden', border: '1px solid #f1f2f6', boxShadow: '0 4px 20px rgba(0,0,0,0.02)' }}
        >
            <div style={{ padding: '1.2rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <img src={post.userPicture || `https://api.dicebear.com/7.x/lorelei/svg?seed=${encodeURIComponent(post.userName || 'Creator')}`} style={{ width: 34, height: 34, borderRadius: '10px' }} />
                    <span style={{ fontWeight: 750, fontSize: '0.9rem', color: '#2d3436' }}>{post.userName}</span>
                </div>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#8e8ffa', opacity: 0.3 }}></div>
            </div>

            <img src={post.image} style={{ width: '100%', height: '320px', objectFit: 'cover' }} />

            <div style={{ padding: '1.5rem' }}>
                <p style={{ margin: '0 0 12px 0', fontWeight: 600, color: '#2d3436', lineHeight: 1.4 }}>{post.caption}</p>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
                    {post.hashtags.map(h => <span key={h} style={{ backgroundColor: '#f5f6ff', color: '#8e8ffa', padding: '6px 12px', borderRadius: '10px', fontSize: '0.75rem', fontWeight: 800 }}>#{h}</span>)}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '20px', borderTop: '1px solid #f8f9fb', paddingTop: '1.2rem' }}>
                    <button onClick={() => onAction(post._id, 'like')} style={{ display: 'flex', alignItems: 'center', gap: '6px', border: 'none', background: 'none', cursor: 'pointer', color: hasLiked ? '#ff7675' : '#b2bec3', fontWeight: 750, transition: '0.2s' }}>
                        <Heart size={20} fill={hasLiked ? "#ff7675" : "none"} /> {post.likes.length}
                    </button>
                    <button onClick={() => onAction(post._id, 'dislike')} style={{ display: 'flex', alignItems: 'center', gap: '6px', border: 'none', background: 'none', cursor: 'pointer', color: hasDisliked ? '#2d3436' : '#b2bec3', fontWeight: 750, transition: '0.2s' }}>
                        <ThumbsDown size={20} fill={hasDisliked ? "#2d3436" : "none"} /> {post.dislikes.length}
                    </button>
                    <button onClick={() => setShowComments(!showComments)} style={{ display: 'flex', alignItems: 'center', gap: '6px', border: 'none', background: 'none', cursor: 'pointer', color: '#b2bec3', fontWeight: 750 }}>
                        <MessageCircle size={20} /> {post.comments.length}
                    </button>
                </div>

                <AnimatePresence>
                    {showComments && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} style={{ overflow: 'hidden', marginTop: '1.2rem' }}>
                            <div style={{ maxHeight: '180px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px', padding: '10px 0' }}>
                                {post.comments.map((c, i) => (
                                    <div key={i} style={{ display: 'flex', gap: '10px' }}>
                                        <div style={{ width: '4px', background: '#f1f2f6', borderRadius: '4px' }}></div>
                                        <div>
                                            <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 800, color: '#2d3436' }}>{c.userName}</p>
                                            <p style={{ margin: 0, fontSize: '0.85rem', color: '#636e72' }}>{c.text}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div style={{ display: 'flex', gap: '10px', marginTop: '1.5rem' }}>
                                <input
                                    value={comment} onChange={(e) => setComment(e.target.value)}
                                    placeholder="Add your thoughts..."
                                    style={{ flex: 1, padding: '12px 16px', borderRadius: '15px', border: '1px solid #f1f2f6', outline: 'none', fontSize: '0.9rem', backgroundColor: '#fcfaff' }}
                                />
                                <button
                                    onClick={async () => {
                                        if (!comment.trim()) return;
                                        await postAPI.addComment(post._id, comment);
                                        setComment('');
                                        onRefresh();
                                    }}
                                    style={{ padding: '0 16px', backgroundColor: '#8e8ffa', color: 'white', border: 'none', borderRadius: '15px', fontWeight: 750, cursor: 'pointer' }}
                                >
                                    Post
                                </button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </motion.div>
    );
};

export default Gallery;
