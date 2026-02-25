import React, { useEffect, useRef, useState } from 'react';

const ScreenShareManager = ({ socket, roomId, user, participants, isSharing, setIsSharing }) => {
    const [remoteStream, setRemoteStream] = useState(null);
    const peersRef = useRef({});
    const localStreamRef = useRef(null);
    const remoteVideoRef = useRef(null);

    useEffect(() => {
        if (!socket) return;

        socket.on('screen-share-started', (id) => setSharerId(id));
        socket.on('screen-share-stopped', () => {
            setSharerId(null);
            setRemoteStream(null);
            if (isSharing) stopSharing();
        });

        socket.on('webrtc-screen-offer', async ({ from, offer }) => {
            const pc = createPeerConnection(from);
            await pc.setRemoteDescription(new RTCSessionDescription(offer));
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            socket.emit('webrtc-screen-answer', { to: from, answer });
        });

        socket.on('webrtc-screen-answer', async ({ from, answer }) => {
            const pc = peersRef.current[from];
            if (pc) await pc.setRemoteDescription(new RTCSessionDescription(answer));
        });

        socket.on('webrtc-screen-ice', async ({ from, candidate }) => {
            const pc = peersRef.current[from];
            if (pc) await pc.addIceCandidate(new RTCIceCandidate(candidate));
        });

        socket.on('user-disconnected', (socketId) => {
            if (peersRef.current[socketId]) {
                peersRef.current[socketId].close();
                delete peersRef.current[socketId];
            }
            if (sharerId === socketId) {
                setSharerId(null);
                setRemoteStream(null);
            }
        });

        return () => {
            socket.off('screen-share-started');
            socket.off('screen-share-stopped');
            socket.off('webrtc-screen-offer');
            socket.off('webrtc-screen-answer');
            socket.off('webrtc-screen-ice');
            socket.off('user-disconnected');
            Object.values(peersRef.current).forEach(pc => pc.close());
            localStreamRef.current?.getTracks().forEach(track => track.stop());
        };
    }, [socket, isSharing, sharerId]);

    useEffect(() => {
        if (remoteVideoRef.current && remoteStream) {
            remoteVideoRef.current.srcObject = remoteStream;
            remoteVideoRef.current.play().catch(e => console.error("Remote video play failed", e));
        }
    }, [remoteStream]);

    const createPeerConnection = (targetSocketId) => {
        const pc = new RTCPeerConnection({
            iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
        });
        peersRef.current[targetSocketId] = pc;
        pc.onicecandidate = (event) => {
            if (event.candidate) socket.emit('webrtc-screen-ice', { to: targetSocketId, candidate: event.candidate });
        };
        pc.ontrack = (event) => {
            setRemoteStream(event.streams[0]);
        };
        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach(track => pc.addTrack(track, localStreamRef.current));
        }
        return pc;
    };

    const startSharing = async () => {
        if (sharerId && sharerId !== socket.id) {
            alert("Someone is already sharing their screen.");
            setIsSharing(false);
            return;
        }

        try {
            const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
            localStreamRef.current = stream;
            socket.emit('start-screen-share', roomId);

            stream.getVideoTracks()[0].onended = () => stopSharing();

            participants.forEach(p => {
                if (p.id !== socket.id) initiateConnection(p.id);
            });
        } catch (err) {
            console.error("Screen share failed", err);
            setIsSharing(false);
        }
    };

    const stopSharing = () => {
        localStreamRef.current?.getTracks().forEach(track => track.stop());
        localStreamRef.current = null;
        socket.emit('stop-screen-share', roomId);
        setIsSharing(false);
        Object.values(peersRef.current).forEach(pc => pc.close());
        peersRef.current = {};
    };

    const initiateConnection = async (targetSocketId) => {
        const pc = createPeerConnection(targetSocketId);
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socket.emit('webrtc-screen-offer', { to: targetSocketId, offer });
    };

    useEffect(() => {
        if (isSharing && !localStreamRef.current) startSharing();
        else if (!isSharing && localStreamRef.current) stopSharing();
    }, [isSharing]);

    return (
        sharerId && sharerId !== socket.id ? (
            <div style={{
                position: 'fixed', top: '80px', right: '370px', width: '400px', height: '250px',
                backgroundColor: 'black', borderRadius: '16px', overflow: 'hidden', zIndex: 50,
                boxShadow: '0 10px 40px rgba(0,0,0,0.3)', border: '2px solid #8e8ffa'
            }}>
                <video
                    ref={remoteVideoRef}
                    style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                    autoPlay
                    playsInline
                />
                <div style={{ position: 'absolute', top: '10px', left: '10px', backgroundColor: 'rgba(0,0,0,0.6)', padding: '4px 10px', borderRadius: '8px', color: 'white', fontSize: '0.7rem', fontWeight: 700 }}>
                    Screen Share Active
                </div>
            </div>
        ) : null
    );
};

export default ScreenShareManager;
