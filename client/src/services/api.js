import axios from 'axios';

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
});

console.log("DEBUG: API Base URL is:", api.defaults.baseURL);

// Add a request interceptor to include the JWT token
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Add a response interceptor to handle token expiration/unauthorized access
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response && error.response.status === 401) {
            // Clear local storage and redirect to landing
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = '/';
        }
        return Promise.reject(error);
    }
);

export const authAPI = {
    loginWithGoogle: (userData) => api.post('/auth/google', userData),
};

export const roomAPI = {
    createRoom: (roomData) => api.post('/rooms/create', roomData),
    getRoom: (roomId) => api.get(`/rooms/${roomId}`),
    getPublicRooms: () => api.get('/rooms/public'),
    getRoomHistory: () => api.get('/rooms/history'),
    updateObjects: (roomId, objects) => api.post(`/rooms/${roomId}/objects`, { objects }),
};

export const postAPI = {
    getPosts: () => api.get('/posts'),
    getTrending: () => api.get('/posts/trending'),
    getLeaderboard: () => api.get('/posts/leaderboard'),
    createPost: (postData) => api.post('/posts', postData),
    likePost: (id) => api.post(`/posts/${id}/like`),
    dislikePost: (id) => api.post(`/posts/${id}/dislike`),
    addComment: (id, text) => api.post(`/posts/${id}/comment`, { text }),
};

export const profileAPI = {
    getStats: () => api.get('/profile/stats'),
    getSuggestedFriends: () => api.get('/profile/suggested-friends'),
    getNotifications: () => api.get('/profile/notifications'),
    getFriends: () => api.get('/profile/friends'),
    sendFriendRequest: (toUserId) => api.post('/profile/friend-request/send', { toUserId }),
    respondToFriendRequest: (requestId, action) => api.post('/profile/friend-request/respond', { requestId, action }),
};

export const chatAPI = {
    getHistory: (friendId) => api.get(`/chat/history/${friendId}`),
};

export default api;
