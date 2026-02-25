import React, { createContext, useContext, useState, useCallback, useMemo, useRef } from 'react';
import { roomAPI, postAPI, profileAPI } from '../services/api';

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
    const [posts, setPosts] = useState(null);
    const [trending, setTrending] = useState(null);
    const [leaderboard, setLeaderboard] = useState(null);

    // Profile Data
    const [profileData, setProfileData] = useState({
        stats: null,
        suggestions: [],
        notifications: [],
        friends: []
    });

    // Refs for stable identity checks (prevents redundant fetches without needing the state in deps)
    const historyRef = useRef(null);
    const postsRef = useRef(null);
    const profileRef = useRef(null);

    const [loading, setLoading] = useState({});

    const fetchRooms = useCallback(async (force = false) => {
        if (!force && historyRef.current) return;

        setLoading(prev => ({ ...prev, rooms: true }));
        try {
            const [historyRes, publicRes] = await Promise.all([
                roomAPI.getRoomHistory(),
                roomAPI.getPublicRooms()
            ]);
            const hData = Array.isArray(historyRes.data) ? historyRes.data : [];
            const rData = Array.isArray(publicRes.data) ? publicRes.data : [];
            setHistory(hData);
            setPublicRooms(rData);
            historyRef.current = hData;
        } catch (err) {
            console.error("Failed to fetch dashboard data", err);
        } finally {
            setLoading(prev => ({ ...prev, rooms: false }));
        }
    }, []);

    const fetchPosts = useCallback(async (force = false) => {
        if (!force && postsRef.current) return;

        setLoading(prev => ({ ...prev, posts: true }));
        try {
            const [postsRes, trendingRes, leaderRes] = await Promise.all([
                postAPI.getPosts(),
                postAPI.getTrending(),
                postAPI.getLeaderboard()
            ]);
            const pData = postsRes.data?.posts && Array.isArray(postsRes.data.posts) ? postsRes.data.posts : [];
            setPosts(pData);
            setTrending(trendingRes.data || { trendingPost: null, topHashtags: [] });
            setLeaderboard(Array.isArray(leaderRes.data) ? leaderRes.data : []);
            postsRef.current = pData;
        } catch (err) {
            console.error("Gallery fetch error", err);
        } finally {
            setLoading(prev => ({ ...prev, posts: false }));
        }
    }, []);

    const fetchProfileData = useCallback(async (force = false) => {
        if (!force && profileRef.current) return;

        setLoading(prev => ({ ...prev, profile: true }));
        try {
            const [statsRes, suggestRes, notifyRes, friendsRes] = await Promise.all([
                profileAPI.getStats(),
                profileAPI.getSuggestedFriends(),
                profileAPI.getNotifications(),
                profileAPI.getFriends()
            ]);
            const pData = {
                stats: statsRes.data,
                suggestions: suggestRes.data || [],
                notifications: notifyRes.data || [],
                friends: friendsRes.data || []
            };
            setProfileData(pData);
            profileRef.current = pData.stats;
        } catch (err) {
            console.error("Profile Fetch Error", err);
        } finally {
            setLoading(prev => ({ ...prev, profile: false }));
        }
    }, []);

    const value = useMemo(() => ({
        history,
        publicRooms,
        posts,
        trending,
        leaderboard,
        profileData,
        loading,
        fetchRooms,
        fetchPosts,
        fetchProfileData,
        refreshRooms: () => fetchRooms(true),
        refreshPosts: () => fetchPosts(true),
        refreshProfile: () => fetchProfileData(true)
    }), [history, publicRooms, posts, trending, leaderboard, profileData, loading, fetchRooms, fetchPosts, fetchProfileData]);

    return (
        <DataContext.Provider value={value}>
            {children}
        </DataContext.Provider>
    );
};
