const createKey = (name: string, id: number) => {
    return `${name}-${id}`
}

export default class InteractionsController {
    private interaction = new Map<string, MatterJS.BodyType>

    add(name: string, body: MatterJS.BodyType) {
        const key = createKey(name, body.id);

        if (this.interaction.has(key))
            throw new Error('Obstacle already exists')

        this.interaction.set(key, body);
    }

    is(name: string, body: MatterJS.BodyType) {
        const key = createKey(name, body.id)
        if (this.interaction.has(key))
            return true;

        return false;
    }
};
