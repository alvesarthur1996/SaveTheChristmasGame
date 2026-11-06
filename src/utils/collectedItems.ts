const COLLECTED_KEY = 'collectedLifeTanks';
const TANK_COUNT_KEY = 'lifeTankCount';

// Life Tanks stay collected across respawns and are only restored on game over.
export const collectedItems = {
    isCollected(id: string): boolean {
        return collectedItems.read().includes(id);
    },
    markCollected(id: string): void {
        const ids = collectedItems.read();
        if (!ids.includes(id)) {
            ids.push(id);
            localStorage.setItem(COLLECTED_KEY, JSON.stringify(ids));
        }
    },
    getTankCount(): number {
        return parseInt(localStorage.getItem(TANK_COUNT_KEY) ?? '0') || 0;
    },
    setTankCount(count: number): void {
        localStorage.setItem(TANK_COUNT_KEY, `${count}`);
    },
    reset(): void {
        localStorage.removeItem(COLLECTED_KEY);
        localStorage.removeItem(TANK_COUNT_KEY);
    },
    read(): string[] {
        try {
            return JSON.parse(localStorage.getItem(COLLECTED_KEY) ?? '[]');
        } catch {
            return [];
        }
    },
};
