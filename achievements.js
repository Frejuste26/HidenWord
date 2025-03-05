export const achievements = {
    wordMaster: {
        id: 'wordMaster',
        title: '🎯 Maître des Mots',
        levels: [
            { score: 100, name: 'Bronze', icon: '🥉', reward: 50 },
            { score: 500, name: 'Argent', icon: '🥈', reward: 100 },
            { score: 1000, name: 'Or', icon: '🥇', reward: 200 }
        ]
    },
    speedster: {
        id: 'speedster',
        title: '⚡ Éclair',
        levels: [
            { time: 60, name: 'Bronze', icon: '🥉', reward: 50 },
            { time: 30, name: 'Argent', icon: '🥈', reward: 100 },
            { time: 15, name: 'Or', icon: '🥇', reward: 200 }
        ]
    },
    perfectionist: {
        id: 'perfectionist',
        title: '✨ Perfectionniste',
        levels: [
            { streaks: 3, name: 'Bronze', icon: '🥉', reward: 50 },
            { streaks: 5, name: 'Argent', icon: '🥈', reward: 100 },
            { streaks: 10, name: 'Or', icon: '🥇', reward: 200 }
        ]
    },
    themeExplorer: {
        id: 'themeExplorer',
        title: '🌍 Explorateur',
        levels: [
            { themes: 3, name: 'Bronze', icon: '🥉', reward: 50 },
            { themes: 6, name: 'Argent', icon: '🥈', reward: 100 },
            { themes: 10, name: 'Or', icon: '🥇', reward: 200 }
        ]
    }
};

export const ranks = [
    { name: 'Débutant', icon: '🌱', minScore: 0 },
    { name: 'Apprenti', icon: '🌿', minScore: 1000 },
    { name: 'Expert', icon: '🌳', minScore: 5000 },
    { name: 'Maître', icon: '🌟', minScore: 10000 },
    { name: 'Légende', icon: '👑', minScore: 20000 }
]; 