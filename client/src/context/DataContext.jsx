import React, { createContext, useContext, useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { roomAPI, postAPI, profileAPI, bootAPI } from '../services/api';

const DataContext = createContext();

export const useData = () => {
    const context = useContext(DataContext);
    if (!context) {
        throw new Error('useData must be used within a DataProvider');
    }
    return context;
};

export const DataProvider = ({ children }) => {
    const [history, setHistory] = useState(null);
    const [publicRooms, setPublicRooms] = useState(null);
    const [posts, setPosts] = useState([]);
    const [trending, setTrending] = useState(null);
    const [leaderboard, setLeaderboard] = useState([]);
    const [notifications, setNotifications] = useState([]);
    const [friends, setFriends] = useState([]);
    const [profileData, setProfileData] = useState(null);
    const [suggestedFriends, setSuggestedFriends] = useState([]);

    const [loading, setLoading] = useState({
        rooms: false,
        posts: false,
        profile: false,
        boot: false
    });

    const bootRequested = useRef(false);

    // MEGA-BOOT: Combines 6+ requests into 1 fast package
    const boot = useCallback(async (force = false) => {
        if (!force && bootRequested.current) return;
        bootRequested.current = true;

        setLoading(prev => ({ ...prev, boot: true }));
        try {
            console.log("⚡️ Mega-Boot sequence initiated...");
            const res = await bootAPI.getBootData();
            const data = res.data;

            // Sync all states simultaneously
            setHistory(data.rooms.history);
            setPublicRooms(data.rooms.publicRooms);
            setProfileData(data.profile);
            setTrending(data.gallery.trending);
            setLeaderboard(data.gallery.leaderboard);
            setPosts(data.gallery.posts || []);
            setNotifications(data.profile.notifications);
            setFriends(data.profile.friends);
            setSuggestedFriends(data.profile.suggestions);

            console.log("✅ Mega-Boot complete. All systems ready.");
        } catch (err) {
            console.error("Boot sequence failed:", err);
            // Fallback for failed boot: try individual loaders
            fetchRooms();
            fetchPosts();
        } finally {
            setLoading(prev => ({ ...prev, boot: false }));
        }
    }, []);

    const fetchRooms = useCallback(async (force = false) => {
        if (!force && history !== null) return;
        setLoading(prev => ({ ...prev, rooms: true }));
        try {
            const [historyRes, publicRes] = await Promise.all([
                roomAPI.getRoomHistory(),
                roomAPI.getPublicRooms()
            ]);
            setHistory(historyRes.data);
            setPublicRooms(publicRes.data);
        } catch (err) {
            console.error("Failed to fetch rooms:", err);
        } finally {
            setLoading(prev => ({ ...prev, rooms: false }));
        }
    }, [history]);

    const fetchPosts = useCallback(async (force = false, silent = false) => {
        if (!force && posts.length > 0) return;
        if (!silent) setLoading(prev => ({ ...prev, posts: true }));
        try {
            const res = await postAPI.getPosts();
            setPosts(res.data.posts || []);
        } catch (err) {
            console.error("Failed to fetch posts:", err);
        } finally {
            if (!silent) setLoading(prev => ({ ...prev, posts: false }));
        }
    }, [posts.length]);

    const refreshPosts = useCallback((silent = false) => fetchPosts(true, silent === true), [fetchPosts]);

    const fetchProfileData = useCallback(async (force = false) => {
        if (!force && profileData !== null) return;
        setLoading(prev => ({ ...prev, profile: true }));
        try {
            const [statsRes, suggestRes, notifRes, friendRes] = await Promise.all([
                profileAPI.getStats(),
                profileAPI.getSuggestedFriends(),
                profileAPI.getNotifications(),
                profileAPI.getFriends()
            ]);
            setProfileData(statsRes.data);
            setSuggestedFriends(suggestRes.data);
            setNotifications(notifRes.data);
            setFriends(friendRes.data);
        } catch (err) {
            console.error("Failed to fetch profile data:", err);
        } finally {
            setLoading(prev => ({ ...prev, profile: false }));
        }
    }, [profileData]);

    const refreshRooms = useCallback(() => fetchRooms(true), [fetchRooms]);

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (token) {
            boot();
        }
    }, [boot]);

    const value = useMemo(() => ({
        history, publicRooms, posts, trending, leaderboard, profileData,
        suggestedFriends, notifications, friends, loading,
        fetchRooms, fetchPosts, fetchProfileData, refreshRooms, refreshPosts, boot
    }), [
        history, publicRooms, posts, trending, leaderboard, profileData,
        suggestedFriends, notifications, friends, loading,
        fetchRooms, fetchPosts, fetchProfileData, refreshRooms, refreshPosts, boot
    ]);

    return (
        <DataContext.Provider value={value}>
            {children}
        </DataContext.Provider>
    );
};
