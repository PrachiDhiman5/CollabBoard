import React from 'react';
import { MousePointer2 } from 'lucide-react';
import { motion } from 'framer-motion';

const Cursor = ({ x, y, name, color, picture }) => {
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, x, y }}
            transition={{ type: 'spring', damping: 30, stiffness: 300, mass: 0.5 }}
            style={{
                position: 'fixed',
                pointerEvents: 'none',
                zIndex: 1000,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '4px'
            }}
        >
            <div style={{ position: 'relative' }}>
                <div style={{ color }}>
                    <MousePointer2 size={24} fill={color} />
                </div>
                {picture && (
                    <div style={{
                        position: 'absolute', top: -20, left: 15,
                        width: 28, height: 28, borderRadius: '10px',
                        overflow: 'hidden', border: `2px solid ${color}`,
                        boxShadow: '0 4px 8px rgba(0,0,0,0.1)'
                    }}>
                        <img
                            src={picture || `https://api.dicebear.com/7.x/lorelei/svg?seed=${name}`}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            onError={(e) => e.target.src = `https://api.dicebear.com/7.x/lorelei/svg?seed=${name}`}
                        />
                    </div>
                )}
            </div>
            <div style={{
                backgroundColor: color,
                color: 'white',
                padding: '2px 8px',
                borderRadius: '6px',
                fontSize: '11px',
                fontWeight: 700,
                whiteSpace: 'nowrap',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
            }}>
                {name}
            </div>
        </motion.div>
    );
};

export default Cursor;
