import React, { createContext, useContext, useState, useCallback } from 'react';
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

    const [loading, setLoading] = useState({});

    const fetchRooms = useCallback(async (force = false) => {
        if (!force && history && publicRooms) return;

        setLoading(prev => ({ ...prev, rooms: true }));
        try {
            const [historyRes, publicRes] = await Promise.all([
                roomAPI.getRoomHistory(),
                roomAPI.getPublicRooms()
            ]);
            setHistory(Array.isArray(historyRes.data) ? historyRes.data : []);
            setPublicRooms(Array.isArray(publicRes.data) ? publicRes.data : []);
        } catch (err) {
            console.error("Failed to fetch dashboard data", err);
        } finally {
            setLoading(prev => ({ ...prev, rooms: false }));
        }
    }, [history, publicRooms]);

    const fetchPosts = useCallback(async (force = false) => {
        if (!force && posts && trending && leaderboard) return;

        setLoading(prev => ({ ...prev, posts: true }));
        try {
            const [postsRes, trendingRes, leaderRes] = await Promise.all([
                postAPI.getPosts(),
                postAPI.getTrending(),
                postAPI.getLeaderboard()
            ]);
            setPosts(postsRes.data?.posts && Array.isArray(postsRes.data.posts) ? postsRes.data.posts : []);
            setTrending(trendingRes.data || { trendingPost: null, topHashtags: [] });
            setLeaderboard(Array.isArray(leaderRes.data) ? leaderRes.data : []);
        } catch (err) {
            console.error("Gallery fetch error", err);
        } finally {
            setLoading(prev => ({ ...prev, posts: false }));
        }
    }, [posts, trending, leaderboard]);

    const fetchProfileData = useCallback(async (force = false) => {
        if (!force && profileData.stats) return;

        setLoading(prev => ({ ...prev, profile: true }));
        try {
            const [statsRes, suggestRes, notifyRes, friendsRes] = await Promise.all([
                profileAPI.getStats(),
                profileAPI.getSuggestedFriends(),
                profileAPI.getNotifications(),
                profileAPI.getFriends()
            ]);
            setProfileData({
                stats: statsRes.data,
                suggestions: suggestRes.data || [],
                notifications: notifyRes.data || [],
                friends: friendsRes.data || []
            });
        } catch (err) {
            console.error("Profile Fetch Error", err);
        } finally {
            setLoading(prev => ({ ...prev, profile: false }));
        }
    }, [profileData]);

    const value = {
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
    };

    return (
        <DataContext.Provider value={value}>
            {children}
        </DataContext.Provider>
    );
};
