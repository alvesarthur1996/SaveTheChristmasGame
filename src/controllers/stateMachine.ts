interface StateConfig {
    name?: string,
    onEnter?: () => void,
    onUpdate?: (dt: number) => void,
    onExit?: () => void
}

export default class StateMachine {
    private context?: any;
    private name: string;
    private states = new Map<string, StateConfig>()

    private lastState?: StateConfig;
    private currentState?: StateConfig;
    private isSwitchingState = false;
    private stateQueue: string[] = [];

    constructor(context?: any, name?: string) {
        this.context = context;
        this.name = name ?? 'fsm';
    }

    isCurrentState(name: string) {
        if (!this.currentState) return false;
        return this.currentState.name === name;
    }

    getLastState() {
        return this.lastState;
    }

    addState(name: string, config?: StateConfig) {
        this.states.set(name, {
            name,
            onEnter: config?.onEnter?.bind(this.context),
            onUpdate: config?.onUpdate?.bind(this.context),
            onExit: config?.onExit?.bind(this.context),
        })
        return this;
    }

    setState(name: string) {
        if (!this.states.has(name)) return;

        if (this.isSwitchingState) {
            this.stateQueue.push(name);
            return
        }

        this.isSwitchingState = true;

        if (this.currentState && this.currentState.onExit)
            this.currentState.onExit()

        this.lastState = this.currentState;
        this.currentState = this.states.get(name);


        if (this.currentState?.onEnter)
            this.currentState.onEnter()

        this.isSwitchingState = false;

        return this;
    }

    update(dt: number) {
        
        if (this.stateQueue.length) {
            const name = this.stateQueue.shift()!;
            this.lastState = this.currentState;
            this.setState(name)
            return
        }
        if (!this.currentState) return;

        if (this.currentState.onUpdate)
            this.currentState.onUpdate(dt);

    }
}