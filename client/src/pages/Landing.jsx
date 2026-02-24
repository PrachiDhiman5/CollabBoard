import React from 'react';
import { motion } from 'framer-motion';
import { Pencil, Users, Share2, Layers, Shield, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useGoogleLogin } from '@react-oauth/google';
import { authAPI } from '../services/api';

const Landing = () => {
    const navigate = useNavigate();
    const [loginLoading, setLoginLoading] = React.useState(false);

    React.useEffect(() => {
        const token = localStorage.getItem('token');
        const user = localStorage.getItem('user');
        if (token && user) {
            navigate('/dashboard');
        }
    }, [navigate]);

    const login = useGoogleLogin({
        onSuccess: async (tokenResponse) => {
            console.log("Google token received, starting login process...");
            setLoginLoading(true);
            try {
                console.log("Fetching user info from Google...");
                const userInfo = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                    headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
                }).then(res => {
                    if (!res.ok) throw new Error("Google UserInfo fetch failed");
                    return res.json();
                });
                console.log("Google UserInfo fetched:", userInfo.email);

                console.log("Sending login request to backend...");
                const res = await authAPI.loginWithGoogle({
                    googleId: userInfo.sub,
                    name: userInfo.name,
                    email: userInfo.email,
                    picture: userInfo.picture
                });
                console.log("Backend response received:", res.status);

                localStorage.setItem('token', res.data.token);
                localStorage.setItem('user', JSON.stringify(res.data.user));
                console.log("Login successful, navigating to dashboard...");
                navigate('/dashboard');
            } catch (err) {
                console.error("Login process failed at:", err);
                alert("Google Sign-In failed. Please check your network or try another account.");
            } finally {
                setLoginLoading(false);
            }
        },
        onError: (error) => {
            console.error("Login Error:", error);
            alert("Sign-In Error. Please ensure you are redirected correctly.");
        }
    });

    return (
        <div className="landing-container">
            {/* Navbar */}
            <nav className="glass" style={{
                position: 'fixed', top: 0, width: '100%', zIndex: 1000,
                padding: '1rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{ width: 40, height: 40, background: 'linear-gradient(135deg, #8e8ffa, #c2d9ff)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Pencil size={20} color="white" />
                    </div>
                    <span style={{ fontSize: '1.5rem', fontWeight: 700, color: '#8e8ffa' }}>CollabBoard</span>
                </div>
                <div style={{ display: 'flex', gap: '2rem', alignItems: 'center' }}>
                    <a href="#features" style={{ fontWeight: 500 }}>Features</a>
                    <button
                        onClick={() => login()}
                        style={{
                            padding: '0.6rem 1.5rem', backgroundColor: '#8e8ffa', color: 'white', fontWeight: 600,
                            borderRadius: '12px', border: 'none', cursor: 'pointer',
                            boxShadow: '0 4px 14px rgba(142, 143, 250, 0.4)'
                        }}
                    >
                        Sign In
                    </button>
                </div>
            </nav>

            {/* Hero Section */}
            <section style={{ paddingTop: '160px', paddingBottom: '100px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8 }}
                    className="container"
                >
                    <div style={{
                        display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
                        padding: '0.5rem 1rem', backgroundColor: 'var(--pastel-purple)',
                        borderRadius: '50px', marginBottom: '2rem'
                    }}>
                        <Sparkles size={16} color="#9c27b0" />
                        <span style={{ fontSize: '0.9rem', fontWeight: 600, color: '#9c27b0' }}>Real-time Collaboration reimagined</span>
                    </div>
                    <h1 style={{ fontSize: '4.5rem', fontWeight: 800, lineHeight: 1.1, marginBottom: '1.5rem', background: 'linear-gradient(to right, #2d3436, #8e8ffa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                        Sketch, Collaborate, <br /> and Create Together.
                    </h1>
                    <p style={{ fontSize: '1.25rem', color: 'var(--text-muted)', maxWidth: '700px', margin: '0 auto 2.5rem', lineHeight: 1.6 }}>
                        A powerful real-time whiteboard for teams to brainstorm, design, and visualize ideas instantly. No lag, just pure creativity.
                    </p>
                    <div style={{ display: 'flex', justifyContent: 'center' }}>
                        <button
                            onClick={() => login()}
                            disabled={loginLoading}
                            style={{
                                padding: '1.2rem 3.5rem', fontSize: '1.2rem',
                                backgroundColor: '#8e8ffa', color: 'white',
                                fontWeight: 700, borderRadius: '18px',
                                border: 'none', cursor: loginLoading ? 'not-allowed' : 'pointer',
                                boxShadow: '0 10px 25px rgba(142, 143, 250, 0.3)',
                                transition: '0.3s',
                                opacity: loginLoading ? 0.7 : 1
                            }}
                            onMouseOver={(e) => !loginLoading && (e.target.style.transform = 'scale(1.05)')}
                            onMouseOut={(e) => !loginLoading && (e.target.style.transform = 'scale(1)')}
                        >
                            {loginLoading ? 'One moment please...' : 'Get Started for Free'}
                        </button>
                    </div>
                </motion.div>

                {/* Decorative elements */}
                <div style={{ position: 'absolute', top: '20%', left: '-5%', width: '300px', height: '300px', background: 'var(--pastel-pink)', borderRadius: '50%', filter: 'blur(80px)', opacity: 0.4, zIndex: -1 }}></div>
                <div style={{ position: 'absolute', bottom: '10%', right: '-5%', width: '400px', height: '400px', background: 'var(--pastel-blue)', borderRadius: '50%', filter: 'blur(100px)', opacity: 0.5, zIndex: -1 }}></div>
            </section>

            {/* Features Grid */}
            <section id="features" style={{ padding: '100px 0', backgroundColor: '#fafbfc' }}>
                <div className="container">
                    <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
                        <h2 style={{ fontSize: '2.5rem', fontWeight: 700, marginBottom: '1rem' }}>Built for Modern Teams</h2>
                        <p style={{ color: 'var(--text-muted)' }}>Everything you need to collaborate effectively in real-time.</p>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
                        <FeatureCard
                            icon={<Users color="#8e8ffa" />}
                            title="Multi-user Sync"
                            description="See changes as they happen. Collaborate with hundreds of users simultaneously."
                            bgColor="var(--pastel-blue)"
                        />
                        <FeatureCard
                            icon={<Layers color="#ff8e8e" />}
                            title="Layer Management"
                            description="Keep your complex sketches organized with a professional layering system."
                            bgColor="var(--pastel-pink)"
                        />
                        <FeatureCard
                            icon={<Shield color="#8eff8e" />}
                            title="Secure Auth"
                            description="Protect your work with Google OAuth 2.0 and role-based permissions."
                            bgColor="var(--pastel-green)"
                        />
                    </div>
                </div>
            </section>
        </div>
    );
};

const FeatureCard = ({ icon, title, description, bgColor }) => (
    <motion.div
        whileHover={{ y: -10 }}
        style={{ padding: '2.5rem', backgroundColor: 'white', borderRadius: '24px', boxShadow: '0 10px 30px rgba(0,0,0,0.03)' }}
    >
        <div style={{ width: 60, height: 60, backgroundColor: bgColor, borderRadius: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem' }}>
            {icon}
        </div>
        <h3 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1rem' }}>{title}</h3>
        <p style={{ color: 'var(--text-muted)', lineHeight: 1.6 }}>{description}</p>
    </motion.div>
);

export default Landing;
