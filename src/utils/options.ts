export interface SoundOptions {
    BGM: number,
    SFX: number
}

export async function loadOptions() {
    const request = await fetch('http://localhost:8080/load-options', {
        headers: {
            'Content-Type': 'application/json' // Especifica que o corpo da solicitação é JSON
        },
        method: 'GET',
    });

    const response = await request.json();
    return response;
}

export async function saveOptions(json: object) {
    const request = await fetch('http://localhost:8080/save-options', {
        headers: {
            'Content-Type': 'application/json' // Especifica que o corpo da solicitação é JSON
        },
        method: 'POST',
        body: JSON.stringify(json)
    });
    const response = await request.json();
    return response;
}