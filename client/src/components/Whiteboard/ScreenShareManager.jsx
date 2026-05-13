import React, { useEffect, useRef, useCallback, useState } from 'react';

const ICE_SERVERS = [{ urls: 'stun:stun.l.google.com:19302' }];

const ScreenShareManager = ({ socket, roomId, user, participants, isSharing, setIsSharing }) => {
    const [sharerId, setSharerId] = useState(null);
    const peersRef = useRef({});
    const localStreamRef = useRef(null);
    const participantsRef = useRef(participants);
    const isSharingRef = useRef(isSharing);

    useEffect(() => {
        participantsRef.current = participants;
    }, [participants]);

    useEffect(() => {
        isSharingRef.current = isSharing;
    }, [isSharing]);

    const cleanupPeers = useCallback(() => {
        Object.values(peersRef.current).forEach((pc) => pc.close());
        peersRef.current = {};
    }, []);

    const createPeerConnection = useCallback((targetSocketId) => {
        if (!socket || peersRef.current[targetSocketId]) return peersRef.current[targetSocketId];

        const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
        peersRef.current[targetSocketId] = pc;

        pc.onicecandidate = (event) => {
            if (event.candidate) {
                socket.emit('webrtc-screen-ice', { to: targetSocketId, candidate: event.candidate });
            }
        };

        pc.ontrack = (event) => {
            const remoteVideo = document.getElementById('remote-screen-video');
            if (remoteVideo) {
                remoteVideo.srcObject = event.streams[0];
                remoteVideo.play().catch(() => {});
            }
        };

        const stream = localStreamRef.current;
        if (stream) {
            stream.getTracks().forEach((track) => pc.addTrack(track, stream));
        }

        return pc;
    }, [socket]);

    const initiateConnection = useCallback(async (targetSocketId) => {
        if (!socket || targetSocketId === socket.id) return;
        if (!localStreamRef.current) return;
        try {
            const pc = createPeerConnection(targetSocketId);
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            socket.emit('webrtc-screen-offer', { to: targetSocketId, offer });
        } catch (e) {
            console.error('Screen share offer failed', e);
        }
    }, [socket, createPeerConnection]);

    const connectToAllViewers = useCallback(() => {
        if (!socket || !localStreamRef.current) return;
        (participantsRef.current || []).forEach((p) => {
            const sid = p.socketId || p.id;
            if (sid && sid !== socket.id && !peersRef.current[sid]) {
                initiateConnection(sid);
            }
        });
    }, [socket, initiateConnection]);

    useEffect(() => {
        if (!socket) return;

        const onScreenStarted = (id) => setSharerId(id);
        const onScreenStopped = () => {
            setSharerId(null);
            const remoteVideo = document.getElementById('remote-screen-video');
            if (remoteVideo) {
                remoteVideo.srcObject = null;
            }
            cleanupPeers();
            if (isSharingRef.current) {
                localStreamRef.current?.getTracks().forEach((t) => t.stop());
                localStreamRef.current = null;
                setIsSharing(false);
            }
        };

        const onScreenOffer = async ({ from, offer }) => {
            try {
                let pc = peersRef.current[from];
                if (!pc) pc = createPeerConnection(from);
                await pc.setRemoteDescription(new RTCSessionDescription(offer));
                const answer = await pc.createAnswer();
                await pc.setLocalDescription(answer);
                socket.emit('webrtc-screen-answer', { to: from, answer });
            } catch (e) {
                console.error('Screen share answer failed', e);
            }
        };

        const onScreenAnswer = async ({ from, answer }) => {
            const pc = peersRef.current[from];
            if (pc) await pc.setRemoteDescription(new RTCSessionDescription(answer));
        };

        const onScreenIce = async ({ from, candidate }) => {
            const pc = peersRef.current[from];
            if (pc && candidate) await pc.addIceCandidate(new RTCIceCandidate(candidate));
        };

        const onParticipants = () => {
            if (isSharingRef.current && localStreamRef.current) connectToAllViewers();
        };

        socket.on('screen-share-started', onScreenStarted);
        socket.on('screen-share-stopped', onScreenStopped);
        socket.on('webrtc-screen-offer', onScreenOffer);
        socket.on('webrtc-screen-answer', onScreenAnswer);
        socket.on('webrtc-screen-ice', onScreenIce);
        socket.on('update-participants', onParticipants);

        return () => {
            socket.off('screen-share-started', onScreenStarted);
            socket.off('screen-share-stopped', onScreenStopped);
            socket.off('webrtc-screen-offer', onScreenOffer);
            socket.off('webrtc-screen-answer', onScreenAnswer);
            socket.off('webrtc-screen-ice', onScreenIce);
            socket.off('update-participants', onParticipants);
        };
    }, [socket, createPeerConnection, connectToAllViewers, cleanupPeers, setIsSharing]);

    const stopSharing = useCallback(() => {
        localStreamRef.current?.getTracks().forEach((t) => t.stop());
        localStreamRef.current = null;
        socket?.emit('stop-screen-share', roomId);
        setIsSharing(false);
        cleanupPeers();
    }, [socket, roomId, setIsSharing, cleanupPeers]);

    const startSharing = useCallback(async () => {
        if (!socket) return;
        if (localStreamRef.current) {
            connectToAllViewers();
            return;
        }
        if (sharerId && sharerId !== socket.id) {
            alert('Someone is already sharing their screen.');
            setIsSharing(false);
            return;
        }

        try {
            const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
            localStreamRef.current = stream;
            socket.emit('start-screen-share', roomId);

            stream.getVideoTracks()[0].onended = () => stopSharing();

            connectToAllViewers();
        } catch (err) {
            console.error('Screen share failed', err);
            setIsSharing(false);
        }
    }, [socket, roomId, sharerId, connectToAllViewers, setIsSharing, stopSharing]);

    useEffect(() => {
        if (isSharing) {
            if (!localStreamRef.current) startSharing();
        } else if (localStreamRef.current) {
            stopSharing();
        }
    }, [isSharing, startSharing, stopSharing]);

    useEffect(() => {
        if (isSharing && localStreamRef.current) {
            connectToAllViewers();
        }
    }, [participants, isSharing, connectToAllViewers]);

    useEffect(() => () => {
        localStreamRef.current?.getTracks().forEach((t) => t.stop());
        cleanupPeers();
        const remoteVideo = document.getElementById('remote-screen-video');
        if (remoteVideo) remoteVideo.srcObject = null;
    }, [cleanupPeers]);

    if (!socket) return null;

    return sharerId && sharerId !== socket.id ? (
        <div
            style={{
                position: 'fixed',
                top: '80px',
                right: 'max(16px, calc(100vw - 420px))',
                width: 'min(400px, calc(100vw - 32px))',
                height: '250px',
                backgroundColor: 'black',
                borderRadius: '16px',
                overflow: 'hidden',
                zIndex: 50,
                boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
                border: '2px solid #8e8ffa'
            }}
        >
            <video id="remote-screen-video" muted playsInline style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
            <div
                style={{
                    position: 'absolute',
                    top: '10px',
                    left: '10px',
                    backgroundColor: 'rgba(0,0,0,0.6)',
                    padding: '4px 10px',
                    borderRadius: '8px',
                    color: 'white',
                    fontSize: '0.7rem',
                    fontWeight: 700
                }}
            >
                Screen Share Active
            </div>
        </div>
    ) : null;
};

export default ScreenShareManager;
