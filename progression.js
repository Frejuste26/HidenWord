import { achievements, ranks } from './achievements.js';

export class ProgressionSystem {
    constructor() {
        this.playerData = this.loadPlayerData();
        this.initializeUI();
    }

    loadPlayerData() {
        const savedData = localStorage.getItem('playerProgress') || '{}';
        return JSON.parse(savedData);
    }

    savePlayerData() {
        localStorage.setItem('playerProgress', JSON.stringify(this.playerData));
    }

    updateProgress(gameData) {
        this.checkAchievements(gameData);
        this.updateRank();
        this.updateLeaderboard(gameData);
        this.savePlayerData();
    }

    checkAchievements(gameData) {
        Object.values(achievements).forEach(achievement => {
            const currentLevel = this.getAchievementLevel(achievement.id);
            const nextLevel = achievement.levels[currentLevel + 1];

            if (nextLevel) {
                let achieved = false;
                switch (achievement.id) {
                    case 'wordMaster':
                        achieved = gameData.score >= nextLevel.score;
                        break;
                    case 'speedster':
                        achieved = gameData.time <= nextLevel.time;
                        break;
                    case 'perfectionist':
                        achieved = gameData.perfectStreak >= nextLevel.streaks;
                        break;
                    case 'themeExplorer':
                        achieved = this.playerData.themesPlayed >= nextLevel.themes;
                        break;
                }

                if (achieved) {
                    this.unlockAchievement(achievement.id, currentLevel + 1);
                }
            }
        });
    }

    unlockAchievement(achievementId, level) {
        if (!this.playerData.achievements) {
            this.playerData.achievements = {};
        }
        this.playerData.achievements[achievementId] = level;
        this.showAchievementModal(achievementId, level);
    }

    showAchievementModal(achievementId, level) {
        const achievement = achievements[achievementId];
        const achievementLevel = achievement.levels[level - 1];

        document.getElementById('achievementIcon').textContent = achievementLevel.icon;
        document.getElementById('achievementTitle').textContent = 
            `${achievement.title} - ${achievementLevel.name}`;
        document.getElementById('achievementReward').textContent = 
            `+${achievementLevel.reward} points bonus!`;

        const modal = document.getElementById('achievementModal');
        modal.style.display = 'block';
        setTimeout(() => {
            modal.style.display = 'none';
        }, 3000);
    }

    updateRank() {
        const totalScore = this.calculateTotalScore();
        const currentRank = this.getCurrentRank(totalScore);
        const nextRank = this.getNextRank(totalScore);

        document.getElementById('rankIcon').textContent = currentRank.icon;
        document.getElementById('rankName').textContent = currentRank.name;
        
        if (nextRank) {
            const progress = ((totalScore - currentRank.minScore) / 
                (nextRank.minScore - currentRank.minScore)) * 100;
            document.getElementById('rankProgress').style.width = `${progress}%`;
            document.getElementById('nextRank').textContent = nextRank.name;
        }
    }

    getCurrentRank(score) {
        return ranks.reduce((prev, curr) => 
            score >= curr.minScore ? curr : prev, ranks[0]);
    }

    getNextRank(score) {
        return ranks.find(rank => rank.minScore > score);
    }

    updateLeaderboard(gameData) {
        if (!this.playerData.leaderboard) {
            this.playerData.leaderboard = [];
        }

        this.playerData.leaderboard.push({
            score: gameData.score,
            date: new Date().toISOString(),
            level: gameData.level,
            theme: gameData.theme
        });

        this.playerData.leaderboard.sort((a, b) => b.score - a.score);
        this.playerData.leaderboard = this.playerData.leaderboard.slice(0, 10);

        this.displayLeaderboard();
    }

    displayLeaderboard() {
        const leaderboardList = document.getElementById('leaderboard-list');
        leaderboardList.innerHTML = this.playerData.leaderboard
            .map((entry, index) => `
                <div class="leaderboard-item">
                    <div class="leaderboard-rank">${index + 1}</div>
                    <div class="leaderboard-info">
                        <div>${entry.theme}</div>
                        <div class="leaderboard-date">
                            ${new Date(entry.date).toLocaleDateString()}
                        </div>
                    </div>
                    <div class="leaderboard-score">${entry.score}</div>
                </div>
            `).join('');
    }

    initializeUI() {
        this.updateRank();
        this.displayAchievements();
        this.displayLeaderboard();
    }

    displayAchievements() {
        const achievementsList = document.getElementById('achievements-list');
        achievementsList.innerHTML = Object.values(achievements)
            .map(achievement => {
                const currentLevel = this.getAchievementLevel(achievement.id);
                const nextLevel = achievement.levels[currentLevel];
                return `
                    <div class="achievement-card ${nextLevel ? '' : 'locked'}">
                        <div class="achievement-icon">
                            ${currentLevel > 0 ? achievement.levels[currentLevel - 1].icon : '🔒'}
                        </div>
                        <div class="achievement-title">${achievement.title}</div>
                        <div class="achievement-progress">
                            ${nextLevel ? `Prochain: ${nextLevel.name}` : 'Complété!'}
                        </div>
                    </div>
                `;
            }).join('');
    }

    getAchievementLevel(achievementId) {
        return this.playerData.achievements?.[achievementId] || 0;
    }

    calculateTotalScore() {
        return (this.playerData.leaderboard || [])
            .reduce((total, entry) => total + entry.score, 0);
    }
} 