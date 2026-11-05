const createKey = (name: string, id: number) => {
    return `${name}-${id}`
}

export default class ObstaclesController {
    private obstacles = new Map<string, MatterJS.BodyType>

    add(name: string, body: MatterJS.BodyType) {
        const key = createKey(name, body.id);

        if (this.obstacles.has(key))
            throw new Error('Obstacle already exists')

        this.obstacles.set(key, body);
    }

    getBodies(name: string): MatterJS.BodyType[] {
        const prefix = `${name}-`;
        return [...this.obstacles.entries()]
            .filter(([key]) => key.startsWith(prefix))
            .map(([, body]) => body);
    }

    is(name: string, body: MatterJS.BodyType) {
        const key = createKey(name, body.id)
        if (this.obstacles.has(key))
            return true;

        return false;
    }
};
