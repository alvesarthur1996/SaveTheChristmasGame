export async function loadGameState () {
    const request = await fetch('http://localhost:8080/game-state', {
        headers: {
            'Content-Type': 'application/json' // Especifica que o corpo da solicitação é JSON
        },
        method: 'GET',
    });

    const response = await request.json();
    return response;
}

export async function saveGameState(json: object) {
    const request = await fetch('http://localhost:8080/update-game-state', {
        headers: {
            'Content-Type': 'application/json'
        },
        method: 'POST',
        body: JSON.stringify(json)
    });
    const response = await request.json();
    return response;
}