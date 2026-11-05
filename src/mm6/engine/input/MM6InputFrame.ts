export type MM6Button = 'left' | 'right' | 'up' | 'down' | 'jump' | 'attack';

export interface MM6InputEvent {
    button: MM6Button;
    type: 'pressed' | 'released';
}

export interface MM6InputFrame {
    held: Readonly<Record<MM6Button, boolean>>;
    events: readonly MM6InputEvent[];
}

export const MM6_BUTTONS: readonly MM6Button[] = [
    'left',
    'right',
    'up',
    'down',
    'jump',
    'attack',
];
